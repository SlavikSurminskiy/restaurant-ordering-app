import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NetworkStatusService } from '../../network/network-status/network-status.service';
import { SseStreamStatus } from '../sse.models';
import { SseService } from '../sse.service';

import { SseConnectionStatus } from './sse-connection-status.enums';
import { SseConnectionStatusService } from './sse-connection-status.service';

describe(SseConnectionStatusService.name, () => {
  it.each([
    SseStreamStatus.Disconnected,
    SseStreamStatus.Connecting,
    SseStreamStatus.Online,
    SseStreamStatus.Reconnecting,
  ])('should report the %s stream status while online', (streamStatus) => {
    const spies = Arrange.createSpies();
    spies.sseServiceMock.status.set(streamStatus);

    const service = Arrange.setup(spies);

    expect(service.status()).toBe(streamStatus);
  });

  it('should report offline while the browser is offline, whatever the stream does', () => {
    const spies = Arrange.createSpies();
    spies.sseServiceMock.status.set(SseStreamStatus.Online);
    const service = Arrange.setup(spies);

    spies.networkStatusServiceMock.isOnline.set(false);
    expect(service.status()).toBe(SseConnectionStatus.Offline);

    spies.networkStatusServiceMock.isOnline.set(true);
    expect(service.status()).toBe(SseConnectionStatus.Online);
  });
});

interface Spies {
  sseServiceMock: { status: WritableSignal<SseStreamStatus> };
  networkStatusServiceMock: { isOnline: WritableSignal<boolean> };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        { provide: SseService, useValue: spies.sseServiceMock },
        {
          provide: NetworkStatusService,
          useValue: spies.networkStatusServiceMock,
        },
      ],
    });

    return TestBed.inject(SseConnectionStatusService);
  },

  createSpies(): Spies {
    return {
      sseServiceMock: {
        status: signal<SseStreamStatus>(SseStreamStatus.Disconnected),
      } satisfies Pick<SseService, 'status'>,
      networkStatusServiceMock: {
        isOnline: signal(true),
      } satisfies Pick<NetworkStatusService, 'isOnline'>,
    };
  },
};
