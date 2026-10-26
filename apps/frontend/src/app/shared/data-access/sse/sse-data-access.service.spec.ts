import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { DishDeletedEvent, MenuEventType } from '@restaurant/shared-api-types';
import {
  BACKOFF_BASE_DELAY_MS,
  BACKOFF_MAX_DELAY_MS,
} from '@restaurant/frontend/core/utils';

import {
  SseMessage,
  SseMessageKind,
  SseStreamStatus,
} from './sse-data-access.models';
import { EVENTS_URL, SseDataAccessService } from './sse-data-access.service';

describe(SseDataAccessService.name, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('fromEventSource', () => {
    it('should not open a connection until someone subscribes', () => {
      const service = Arrange.setup();

      service.fromEventSource();

      expect(FakeEventSource.instances).toHaveLength(0);
      expect(service.status()).toBe(SseStreamStatus.Disconnected);
    });

    it('should open one EventSource on the events URL for all subscribers', () => {
      const service = Arrange.setup();

      service.fromEventSource().subscribe();
      service.fromEventSource().subscribe();

      expect(FakeEventSource.instances).toHaveLength(1);
      expect(Arrange.lastSource().url).toBe(EVENTS_URL);
      expect(service.status()).toBe(SseStreamStatus.Connecting);
    });

    it('should share the messages with every subscriber', () => {
      const service = Arrange.setup();
      const first: SseMessage[] = [];
      const second: SseMessage[] = [];
      service.fromEventSource().subscribe((message) => first.push(message));
      service.fromEventSource().subscribe((message) => second.push(message));
      const event = Arrange.createDishDeletedEvent();

      Arrange.lastSource().open();
      Arrange.lastSource().emit(event);

      const expected = [
        { kind: SseMessageKind.Open },
        { kind: SseMessageKind.Event, event },
      ];
      expect(first).toEqual(expected);
      expect(second).toEqual(expected);
    });

    it('should give only the server events through serverEvents', () => {
      const service = Arrange.setup();
      const received: unknown[] = [];
      service.serverEvents().subscribe((event) => received.push(event));
      const event = Arrange.createDishDeletedEvent();

      Arrange.lastSource().open();
      Arrange.lastSource().emit(event);
      Arrange.lastSource().fail(FakeEventSource.CONNECTING);

      expect(received).toEqual([event]);
    });

    it('should close the connection once the last subscriber leaves', () => {
      const service = Arrange.setup();
      const first = service.fromEventSource().subscribe();
      const second = service.fromEventSource().subscribe();
      Arrange.lastSource().open();

      first.unsubscribe();
      expect(Arrange.lastSource().close).not.toHaveBeenCalled();

      second.unsubscribe();
      expect(Arrange.lastSource().close).toHaveBeenCalled();
      expect(service.status()).toBe(SseStreamStatus.Disconnected);
    });

    it('should open a new connection for a subscriber after everyone left', () => {
      const service = Arrange.setup();
      service.fromEventSource().subscribe().unsubscribe();

      service.fromEventSource().subscribe();

      expect(FakeEventSource.instances).toHaveLength(2);
      expect(service.status()).toBe(SseStreamStatus.Connecting);
    });

    it('should stop reconnecting once everyone left', () => {
      const service = Arrange.setup();
      const subscription = service.fromEventSource().subscribe();
      Arrange.lastSource().fail(FakeEventSource.CLOSED);

      subscription.unsubscribe();
      vi.advanceTimersByTime(BACKOFF_MAX_DELAY_MS);

      expect(FakeEventSource.instances).toHaveLength(1);
    });
  });

  describe('status', () => {
    it('should be online once open and reconnecting after an error', () => {
      const service = Arrange.setup();
      service.fromEventSource().subscribe();

      Arrange.lastSource().open();
      expect(service.status()).toBe(SseStreamStatus.Online);

      Arrange.lastSource().fail(FakeEventSource.CONNECTING);
      expect(service.status()).toBe(SseStreamStatus.Reconnecting);

      Arrange.lastSource().open();
      expect(service.status()).toBe(SseStreamStatus.Online);
    });

    it('should stay connecting when the first attempt fails', () => {
      const service = Arrange.setup();
      service.fromEventSource().subscribe();

      Arrange.lastSource().fail(FakeEventSource.CLOSED);

      expect(service.status()).toBe(SseStreamStatus.Connecting);
    });
  });

  describe('backoff', () => {
    it('should leave reconnecting to the browser while the source is connecting', () => {
      const service = Arrange.setup();
      service.fromEventSource().subscribe();

      Arrange.lastSource().fail(FakeEventSource.CONNECTING);
      vi.advanceTimersByTime(BACKOFF_MAX_DELAY_MS);

      expect(FakeEventSource.instances).toHaveLength(1);
      expect(Arrange.lastSource().close).not.toHaveBeenCalled();
    });

    it('should close the old source and reopen with growing delays after it closes', () => {
      const service = Arrange.setup();
      service.fromEventSource().subscribe();
      const first = Arrange.lastSource();

      first.fail(FakeEventSource.CLOSED);
      expect(first.close).toHaveBeenCalled();
      vi.advanceTimersByTime(BACKOFF_BASE_DELAY_MS - 1);
      expect(FakeEventSource.instances).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(FakeEventSource.instances).toHaveLength(2);

      Arrange.lastSource().fail(FakeEventSource.CLOSED);
      vi.advanceTimersByTime(2 * BACKOFF_BASE_DELAY_MS - 1);
      expect(FakeEventSource.instances).toHaveLength(2);
      vi.advanceTimersByTime(1);
      expect(FakeEventSource.instances).toHaveLength(3);
    });

    it('should cap the reconnect delay', () => {
      const service = Arrange.setup();
      service.fromEventSource().subscribe();

      for (let attempt = 1; attempt <= 10; attempt++) {
        Arrange.lastSource().fail(FakeEventSource.CLOSED);
        vi.advanceTimersByTime(BACKOFF_MAX_DELAY_MS);
      }

      expect(FakeEventSource.instances).toHaveLength(11);
      Arrange.lastSource().fail(FakeEventSource.CLOSED);
      vi.advanceTimersByTime(BACKOFF_MAX_DELAY_MS - 1);
      expect(FakeEventSource.instances).toHaveLength(11);
      vi.advanceTimersByTime(1);
      expect(FakeEventSource.instances).toHaveLength(12);
    });

    it('should reset the reconnect delay after a successful open', () => {
      const service = Arrange.setup();
      service.fromEventSource().subscribe();
      Arrange.lastSource().fail(FakeEventSource.CLOSED);
      vi.advanceTimersByTime(BACKOFF_BASE_DELAY_MS);

      Arrange.lastSource().open();
      Arrange.lastSource().fail(FakeEventSource.CLOSED);
      vi.advanceTimersByTime(BACKOFF_BASE_DELAY_MS);

      expect(FakeEventSource.instances).toHaveLength(3);
    });
  });

  describe('reconnect', () => {
    it('should close the open stream and open a new one for the same subscribers', () => {
      const service = Arrange.setup();
      let opens = 0;
      service.fromEventSource().subscribe(({ kind }) => {
        if (kind === SseMessageKind.Open) {
          opens++;
        }
      });
      const first = Arrange.lastSource();
      first.open();

      service.reconnect();
      expect(service.status()).toBe(SseStreamStatus.Connecting);
      Arrange.lastSource().open();

      expect(first.close).toHaveBeenCalled();
      expect(FakeEventSource.instances).toHaveLength(2);
      expect(opens).toBe(2);
    });

    it('should do nothing while nobody listens', () => {
      const service = Arrange.setup();

      service.reconnect();

      expect(FakeEventSource.instances).toHaveLength(0);
    });
  });
});

class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  static instances: FakeEventSource[] = [];

  readyState = FakeEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: Pick<MessageEvent<string>, 'data'>) => void) | null =
    null;
  onerror: (() => void) | null = null;
  close = vi.fn(() => {
    this.readyState = FakeEventSource.CLOSED;
  });

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  open() {
    this.readyState = FakeEventSource.OPEN;
    this.onopen?.();
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  fail(readyState: number) {
    this.readyState = readyState;
    this.onerror?.();
  }
}

const Arrange = {
  setup() {
    return TestBed.inject(SseDataAccessService);
  },

  lastSource(): FakeEventSource {
    const source = FakeEventSource.instances.at(-1);

    if (!source) {
      throw new Error('No EventSource was created');
    }

    return source;
  },

  createDishDeletedEvent(): DishDeletedEvent {
    return { type: MenuEventType.DishDeleted, dishId: 'd-caesar' };
  },
};
