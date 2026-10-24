import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import {
  DishDeletedEvent,
  MenuEventType,
  ServerEvent,
} from '@restaurant/shared-api-types';

import { SseStreamStatus } from './sse.models';
import { EVENTS_URL, SseService } from './sse.service';
import {
  BACKOFF_BASE_DELAY_MS,
  BACKOFF_MAX_DELAY_MS,
} from './utils/backoff-delay';

describe(SseService.name, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('connect', () => {
    it('should not open a connection until connect is called', () => {
      const service = Arrange.setup();
      service.opened$.subscribe();
      service.events$.subscribe();

      expect(FakeEventSource.instances).toHaveLength(0);
      expect(service.status()).toBe(SseStreamStatus.Disconnected);
    });

    it('should open one EventSource on the events URL', () => {
      const service = Arrange.setup();

      service.connect();
      service.connect();

      expect(FakeEventSource.instances).toHaveLength(1);
      expect(Arrange.lastSource().url).toBe(EVENTS_URL);
      expect(service.status()).toBe(SseStreamStatus.Connecting);
    });

    it('should emit parsed server events', () => {
      const service = Arrange.setup();
      const received: ServerEvent[] = [];
      service.events$.subscribe((event) => received.push(event));
      const event = Arrange.createDishDeletedEvent();
      service.connect();

      Arrange.lastSource().open();
      Arrange.lastSource().emit(event);

      expect(received).toEqual([event]);
    });
  });

  describe('opened$', () => {
    it('should fire on every (re)connect', () => {
      const service = Arrange.setup();
      let opens = 0;
      service.opened$.subscribe(() => opens++);
      service.connect();

      Arrange.lastSource().open();
      Arrange.lastSource().fail(FakeEventSource.CONNECTING);
      Arrange.lastSource().open();

      expect(opens).toBe(2);
    });

    it('should fire right away for a subscriber that joins while the stream is open', () => {
      const service = Arrange.setup();
      service.connect();
      Arrange.lastSource().open();
      let opens = 0;

      service.opened$.subscribe(() => opens++);

      expect(opens).toBe(1);
    });

    it('should wait for the open when a subscriber joins while connecting', () => {
      const service = Arrange.setup();
      service.connect();
      let opens = 0;

      service.opened$.subscribe(() => opens++);
      expect(opens).toBe(0);

      Arrange.lastSource().open();
      expect(opens).toBe(1);
    });
  });

  describe('status', () => {
    it('should be online once open and reconnecting after an error', () => {
      const service = Arrange.setup();
      service.connect();

      Arrange.lastSource().open();
      expect(service.status()).toBe(SseStreamStatus.Online);

      Arrange.lastSource().fail(FakeEventSource.CONNECTING);
      expect(service.status()).toBe(SseStreamStatus.Reconnecting);

      Arrange.lastSource().open();
      expect(service.status()).toBe(SseStreamStatus.Online);
    });

    it('should stay connecting when the first attempt fails', () => {
      const service = Arrange.setup();
      service.connect();

      Arrange.lastSource().fail(FakeEventSource.CLOSED);

      expect(service.status()).toBe(SseStreamStatus.Connecting);
    });
  });

  describe('reconnect', () => {
    it('should leave reconnecting to the browser while the source is connecting', () => {
      const service = Arrange.setup();
      service.connect();

      Arrange.lastSource().fail(FakeEventSource.CONNECTING);
      vi.advanceTimersByTime(BACKOFF_MAX_DELAY_MS);

      expect(FakeEventSource.instances).toHaveLength(1);
      expect(Arrange.lastSource().close).not.toHaveBeenCalled();
    });

    it('should close the old source and reopen with growing delays after it closes', () => {
      const service = Arrange.setup();
      service.connect();
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
      service.connect();

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
      service.connect();
      Arrange.lastSource().fail(FakeEventSource.CLOSED);
      vi.advanceTimersByTime(BACKOFF_BASE_DELAY_MS);

      Arrange.lastSource().open();
      Arrange.lastSource().fail(FakeEventSource.CLOSED);
      vi.advanceTimersByTime(BACKOFF_BASE_DELAY_MS);

      expect(FakeEventSource.instances).toHaveLength(3);
    });
  });

  describe('disconnect', () => {
    it('should close the source and stop reconnecting', () => {
      const service = Arrange.setup();
      service.connect();
      Arrange.lastSource().fail(FakeEventSource.CLOSED);

      service.disconnect();
      vi.advanceTimersByTime(BACKOFF_MAX_DELAY_MS);

      expect(FakeEventSource.instances).toHaveLength(1);
      expect(service.status()).toBe(SseStreamStatus.Disconnected);
    });

    it('should open a new connection when connected again', () => {
      const service = Arrange.setup();
      service.connect();
      const first = Arrange.lastSource();

      service.disconnect();
      service.connect();

      expect(first.close).toHaveBeenCalled();
      expect(FakeEventSource.instances).toHaveLength(2);
      expect(service.status()).toBe(SseStreamStatus.Connecting);
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
    return TestBed.inject(SseService);
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
