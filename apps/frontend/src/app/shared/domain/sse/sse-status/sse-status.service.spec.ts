import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NetworkStatusService } from '@restaurant/frontend/core/network';
import {
  SseStreamStatus,
  SseDataAccessService,
} from '@restaurant/frontend/data-access/sse';

import { SseConnectionStatus } from './sse-status.enums';
import { SseStatusService } from './sse-status.service';

describe(SseStatusService.name, () => {
  it.each([
    SseStreamStatus.Disconnected,
    SseStreamStatus.Connecting,
    SseStreamStatus.Online,
    SseStreamStatus.Reconnecting,
  ])('should report the %s stream status while online', (streamStatus) => {
    const spies = Arrange.createSpies();
    spies.sseDataAccessServiceMock.status.set(streamStatus);

    const service = Arrange.setup(spies);

    expect(service.status()).toBe(streamStatus);
  });

  it('should report offline while the browser is offline, whatever the stream does', () => {
    const spies = Arrange.createSpies();
    spies.sseDataAccessServiceMock.status.set(SseStreamStatus.Online);
    const service = Arrange.setup(spies);

    spies.networkStatusServiceMock.isOnline.set(false);
    expect(service.status()).toBe(SseConnectionStatus.Offline);

    spies.networkStatusServiceMock.isOnline.set(true);
    expect(service.status()).toBe(SseConnectionStatus.Online);
  });
});

interface Spies {
  sseDataAccessServiceMock: { status: WritableSignal<SseStreamStatus> };
  networkStatusServiceMock: { isOnline: WritableSignal<boolean> };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SseDataAccessService,
          useValue: spies.sseDataAccessServiceMock,
        },
        {
          provide: NetworkStatusService,
          useValue: spies.networkStatusServiceMock,
        },
      ],
    });

    return TestBed.inject(SseStatusService);
  },

  createSpies(): Spies {
    return {
      sseDataAccessServiceMock: {
        status: signal<SseStreamStatus>(SseStreamStatus.Disconnected),
      } satisfies Pick<SseDataAccessService, 'status'>,
      networkStatusServiceMock: {
        isOnline: signal(true),
      } satisfies Pick<NetworkStatusService, 'isOnline'>,
    };
  },
};
