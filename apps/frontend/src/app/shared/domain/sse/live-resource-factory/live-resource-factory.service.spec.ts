import { HttpStatusCode } from '@angular/common/http';
import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defer, Observable, of, Subject, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { MenuEvent, MenuEventType } from '@restaurant/shared-api-types';
import { ApiError } from '@restaurant/frontend/core/http';
import { BACKOFF_BASE_DELAY_MS } from '@restaurant/frontend/core/utils';
import {
  SseMessage,
  SseMessageKind,
  SseStreamStatus,
  SseDataAccessService,
} from '@restaurant/frontend/data-access/sse';

import { SNAPSHOT_FALLBACK_DELAY_MS } from './live-resource-factory.constants';
import { LiveResourceUpdateKind } from './live-resource-factory.enums';
import { LiveResourceUpdate } from './live-resource-factory.models';
import { LiveResourceFactoryService } from './live-resource-factory.service';

type Update = LiveResourceUpdate<string, MenuEvent>;

describe(LiveResourceFactoryService.name, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should load the snapshot only when the event stream opens', () => {
    const spies = Arrange.createSpies();
    const received: Update[] = [];
    Arrange.create(spies).subscribe((update) => received.push(update));
    expect(spies.loadSnapshot).not.toHaveBeenCalled();

    Arrange.open(spies);

    expect(received).toEqual([
      { kind: LiveResourceUpdateKind.Snapshot, snapshot: 'snapshot' },
    ]);
  });

  it('should load the snapshot right away when it joins a stream that is already open', () => {
    const spies = Arrange.createSpies();
    spies.sseDataAccessServiceMock.status.set(SseStreamStatus.Online);
    const received: Update[] = [];

    Arrange.create(spies).subscribe((update) => received.push(update));

    expect(received).toEqual([
      { kind: LiveResourceUpdateKind.Snapshot, snapshot: 'snapshot' },
    ]);
  });

  it('should wait for the open when it joins a stream that is still connecting', () => {
    const spies = Arrange.createSpies();
    spies.sseDataAccessServiceMock.status.set(SseStreamStatus.Connecting);
    Arrange.create(spies).subscribe();
    expect(spies.loadSnapshot).not.toHaveBeenCalled();

    Arrange.open(spies);

    expect(spies.loadSnapshot).toHaveBeenCalledOnce();
  });

  it('should load a fresh snapshot on every reconnect', () => {
    const spies = Arrange.createSpies();
    Arrange.create(spies).subscribe();

    Arrange.open(spies);
    Arrange.open(spies);

    expect(spies.loadSnapshot).toHaveBeenCalledTimes(2);
  });

  it('should load a fresh snapshot on request', () => {
    const spies = Arrange.createSpies();
    Arrange.create(spies).subscribe();
    Arrange.open(spies);

    spies.reload$.next();

    expect(spies.loadSnapshot).toHaveBeenCalledTimes(2);
  });

  it('should load the snapshot anyway when the stream does not open in time', () => {
    vi.useFakeTimers();
    const spies = Arrange.createSpies();
    Arrange.create(spies).subscribe();

    vi.advanceTimersByTime(SNAPSHOT_FALLBACK_DELAY_MS - 1);
    expect(spies.loadSnapshot).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(spies.loadSnapshot).toHaveBeenCalledOnce();

    Arrange.open(spies);
    expect(spies.loadSnapshot).toHaveBeenCalledTimes(2);
  });

  it('should not fall back once the stream has opened', () => {
    vi.useFakeTimers();
    const spies = Arrange.createSpies();
    Arrange.create(spies).subscribe();

    Arrange.open(spies);
    vi.advanceTimersByTime(SNAPSHOT_FALLBACK_DELAY_MS);

    expect(spies.loadSnapshot).toHaveBeenCalledOnce();
  });

  it('should emit the snapshot, then events from the load, then live ones', () => {
    const duringLoad = Arrange.createDishDeleted('d-greek');
    const live = Arrange.createDishDeleted('d-borscht');
    const spies = Arrange.createSpies();
    const snapshot = new Subject<string>();
    spies.loadSnapshot.mockReturnValue(snapshot);
    const received: Update[] = [];
    Arrange.create(spies).subscribe((update) => received.push(update));
    Arrange.open(spies);

    Arrange.emit(spies, duringLoad);
    expect(received).toEqual([]);

    snapshot.next('snapshot');
    Arrange.emit(spies, live);

    expect(received).toEqual([
      { kind: LiveResourceUpdateKind.Snapshot, snapshot: 'snapshot' },
      { kind: LiveResourceUpdateKind.Event, event: duringLoad },
      { kind: LiveResourceUpdateKind.Event, event: live },
    ]);
  });

  it('should report a failed load, keep buffering and retry with backoff', () => {
    vi.useFakeTimers();
    const error = Arrange.createNotFoundError();
    const duringLoad = Arrange.createDishDeleted('d-greek');
    const spies = Arrange.createSpies();
    spies.loadSnapshot.mockReturnValue(
      Arrange.createFailingOnce('snapshot', error),
    );
    const received: Update[] = [];
    Arrange.create(spies).subscribe((update) => received.push(update));
    Arrange.open(spies);

    Arrange.emit(spies, duringLoad);
    expect(received).toEqual([
      { kind: LiveResourceUpdateKind.SnapshotFailed, error },
    ]);

    vi.advanceTimersByTime(BACKOFF_BASE_DELAY_MS);
    expect(received).toEqual([
      { kind: LiveResourceUpdateKind.SnapshotFailed, error },
      { kind: LiveResourceUpdateKind.Snapshot, snapshot: 'snapshot' },
      { kind: LiveResourceUpdateKind.Event, event: duringLoad },
    ]);
  });

  it('should drop a load replaced by a reconnect and emit only the newer snapshot', () => {
    const duringLoad = Arrange.createDishDeleted('d-greek');
    const spies = Arrange.createSpies();
    const first = new Subject<string>();
    const second = new Subject<string>();
    spies.loadSnapshot.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const received: Update[] = [];
    Arrange.create(spies).subscribe((update) => received.push(update));

    Arrange.open(spies);
    Arrange.open(spies);
    Arrange.emit(spies, duringLoad);
    first.next('older');
    second.next('snapshot');

    expect(received).toEqual([
      { kind: LiveResourceUpdateKind.Snapshot, snapshot: 'snapshot' },
      { kind: LiveResourceUpdateKind.Event, event: duringLoad },
    ]);
  });
});

interface Spies {
  loadSnapshot: Mock<() => Observable<string>>;
  reload$: Subject<void>;
  events$: Subject<MenuEvent>;
  messages$: Subject<SseMessage>;
  sseDataAccessServiceMock: {
    fromEventSource: Mock<() => Observable<SseMessage>>;
    status: WritableSignal<SseStreamStatus>;
  };
}

const Arrange = {
  create(spies: Spies): Observable<Update> {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SseDataAccessService,
          useValue: spies.sseDataAccessServiceMock,
        },
      ],
    });

    return TestBed.inject(LiveResourceFactoryService).create({
      loadSnapshot: spies.loadSnapshot,
      events$: spies.events$,
      reload$: spies.reload$,
    });
  },

  createSpies(): Spies {
    const messages$ = new Subject<SseMessage>();

    return {
      loadSnapshot: vi.fn(() => of('snapshot')),
      reload$: new Subject<void>(),
      events$: new Subject<MenuEvent>(),
      messages$,
      sseDataAccessServiceMock: {
        fromEventSource: vi.fn(() => messages$.asObservable()),
        status: signal<SseStreamStatus>(SseStreamStatus.Connecting),
      },
    };
  },

  open(spies: Spies): void {
    spies.sseDataAccessServiceMock.status.set(SseStreamStatus.Online);
    spies.messages$.next({ kind: SseMessageKind.Open });
  },

  emit(spies: Spies, event: MenuEvent): void {
    spies.events$.next(event);
  },
  createDishDeleted(dishId: string): MenuEvent {
    return { type: MenuEventType.DishDeleted, dishId };
  },

  /** Fails on the first subscription and succeeds on the next, like a retried request. */
  createFailingOnce(snapshot: string, error: ApiError) {
    let subscriptions = 0;

    return defer(() =>
      ++subscriptions === 1 ? throwError(() => error) : of(snapshot),
    );
  },

  createNotFoundError(): ApiError {
    return new ApiError(
      HttpStatusCode.NotFound,
      'The requested data was not found.',
    );
  },
};
