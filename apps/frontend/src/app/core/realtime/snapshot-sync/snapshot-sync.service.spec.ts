import { HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { defer, Observable, of, Subject, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import {
  Order,
  MenuEvent,
  ServerEvent,
  MenuEventType,
  OrderEventType,
} from '@restaurant/shared-api-types';

import { ApiError } from '../../http/api-error';
import { SseService } from '../sse.service';
import { BACKOFF_BASE_DELAY_MS } from '../utils/backoff-delay';

import { SNAPSHOT_FALLBACK_DELAY_MS } from './snapshot-sync.constants';
import { SnapshotSyncUpdateKind } from './snapshot-sync.enums';
import { SnapshotSyncUpdate } from './snapshot-sync.models';
import { SnapshotSyncService } from './snapshot-sync.service';

type Update = SnapshotSyncUpdate<string, MenuEvent>;

describe(SnapshotSyncService.name, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should load the snapshot only when the event stream opens', () => {
    const spies = Arrange.createSpies();
    const received: Update[] = [];
    Arrange.sync(spies).subscribe((update) => received.push(update));
    expect(spies.loadSnapshot).not.toHaveBeenCalled();

    spies.sseServiceMock.opened$.next();

    expect(received).toEqual([
      { kind: SnapshotSyncUpdateKind.Snapshot, snapshot: 'snapshot' },
    ]);
  });

  it('should load a fresh snapshot on every reconnect', () => {
    const spies = Arrange.createSpies();
    Arrange.sync(spies).subscribe();

    spies.sseServiceMock.opened$.next();
    spies.sseServiceMock.opened$.next();

    expect(spies.loadSnapshot).toHaveBeenCalledTimes(2);
  });

  it('should load a fresh snapshot on request', () => {
    const spies = Arrange.createSpies();
    Arrange.sync(spies).subscribe();
    spies.sseServiceMock.opened$.next();

    spies.reload$.next();

    expect(spies.loadSnapshot).toHaveBeenCalledTimes(2);
  });

  it('should load the snapshot anyway when the stream does not open in time', () => {
    vi.useFakeTimers();
    const spies = Arrange.createSpies();
    Arrange.sync(spies).subscribe();

    vi.advanceTimersByTime(SNAPSHOT_FALLBACK_DELAY_MS - 1);
    expect(spies.loadSnapshot).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(spies.loadSnapshot).toHaveBeenCalledOnce();

    spies.sseServiceMock.opened$.next();
    expect(spies.loadSnapshot).toHaveBeenCalledTimes(2);
  });

  it('should not fall back once the stream has opened', () => {
    vi.useFakeTimers();
    const spies = Arrange.createSpies();
    Arrange.sync(spies).subscribe();

    spies.sseServiceMock.opened$.next();
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
    Arrange.sync(spies).subscribe((update) => received.push(update));
    spies.sseServiceMock.opened$.next();

    spies.sseServiceMock.events$.next(duringLoad);
    expect(received).toEqual([]);

    snapshot.next('snapshot');
    spies.sseServiceMock.events$.next(live);

    expect(received).toEqual([
      { kind: SnapshotSyncUpdateKind.Snapshot, snapshot: 'snapshot' },
      { kind: SnapshotSyncUpdateKind.Event, event: duringLoad },
      { kind: SnapshotSyncUpdateKind.Event, event: live },
    ]);
  });

  it('should pass on only the events it was asked for', () => {
    const spies = Arrange.createSpies();
    const received: Update[] = [];
    Arrange.sync(spies).subscribe((update) => received.push(update));
    spies.sseServiceMock.opened$.next();

    spies.sseServiceMock.events$.next({
      type: OrderEventType.Updated,
      order: {} as Order,
    });

    expect(received).toEqual([
      { kind: SnapshotSyncUpdateKind.Snapshot, snapshot: 'snapshot' },
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
    Arrange.sync(spies).subscribe((update) => received.push(update));
    spies.sseServiceMock.opened$.next();

    spies.sseServiceMock.events$.next(duringLoad);
    expect(received).toEqual([
      { kind: SnapshotSyncUpdateKind.SnapshotFailed, error },
    ]);

    vi.advanceTimersByTime(BACKOFF_BASE_DELAY_MS);
    expect(received).toEqual([
      { kind: SnapshotSyncUpdateKind.SnapshotFailed, error },
      { kind: SnapshotSyncUpdateKind.Snapshot, snapshot: 'snapshot' },
      { kind: SnapshotSyncUpdateKind.Event, event: duringLoad },
    ]);
  });

  it('should drop a load replaced by a reconnect and emit only the newer snapshot', () => {
    const duringLoad = Arrange.createDishDeleted('d-greek');
    const spies = Arrange.createSpies();
    const first = new Subject<string>();
    const second = new Subject<string>();
    spies.loadSnapshot.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const received: Update[] = [];
    Arrange.sync(spies).subscribe((update) => received.push(update));

    spies.sseServiceMock.opened$.next();
    spies.sseServiceMock.opened$.next();
    spies.sseServiceMock.events$.next(duringLoad);
    first.next('older');
    second.next('snapshot');

    expect(received).toEqual([
      { kind: SnapshotSyncUpdateKind.Snapshot, snapshot: 'snapshot' },
      { kind: SnapshotSyncUpdateKind.Event, event: duringLoad },
    ]);
  });
});

interface Spies {
  loadSnapshot: Mock<() => Observable<string>>;
  reload$: Subject<void>;
  sseServiceMock: {
    opened$: Subject<void>;
    events$: Subject<ServerEvent>;
  };
}

const Arrange = {
  sync(spies: Spies): Observable<Update> {
    TestBed.configureTestingModule({
      providers: [{ provide: SseService, useValue: spies.sseServiceMock }],
    });

    return TestBed.inject(SnapshotSyncService).sync({
      loadSnapshot: spies.loadSnapshot,
      isEvent: (event): event is MenuEvent =>
        event.type === MenuEventType.DishDeleted,
      reload$: spies.reload$,
    });
  },

  createSpies(): Spies {
    return {
      loadSnapshot: vi.fn(() => of('snapshot')),
      reload$: new Subject<void>(),
      sseServiceMock: {
        opened$: new Subject<void>(),
        events$: new Subject<ServerEvent>(),
      } satisfies Pick<SseService, 'opened$' | 'events$'>,
    };
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
