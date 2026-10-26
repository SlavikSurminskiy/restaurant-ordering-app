import { signal, WritableSignal } from '@angular/core';
import { render } from '@testing-library/angular';

import {
  SseConnectionStatus,
  SseStatusService,
} from '@restaurant/frontend/domain/sse';

import { ConnectionIndicator } from './connection-indicator';

describe(ConnectionIndicator.name, () => {
  it.each([
    [SseConnectionStatus.Disconnected, 'Disconnected', 'Live updates are off'],
    [
      SseConnectionStatus.Connecting,
      'Connecting…',
      'Setting up live menu updates',
    ],
    [SseConnectionStatus.Online, 'Online', 'Menu and prices update live'],
    [
      SseConnectionStatus.Reconnecting,
      'Reconnecting…',
      'Connection lost, menu may be out of date',
    ],
    [
      SseConnectionStatus.Offline,
      'Offline',
      'No internet, menu may be out of date',
    ],
  ])(
    'should show the %s status as "%s" with a description',
    async (status, label, description) => {
      const spies = Arrange.createSpies(status);
      const { renderResult } = await Arrange.setup(spies);

      expect(renderResult.getByText(label)).toBeTruthy();
      expect(renderResult.getByText(description)).toBeTruthy();
    },
  );

  it('should mark the indicator as degraded only while reconnecting or offline', async () => {
    const spies = Arrange.createSpies(SseConnectionStatus.Online);
    const { renderResult } = await Arrange.setup(spies);
    const indicator = renderResult.container;

    expect(indicator.classList).not.toContain('connection-indicator--degraded');

    spies.sseConnectionStatusServiceMock.status.set(
      SseConnectionStatus.Reconnecting,
    );
    await renderResult.fixture.whenStable();
    expect(indicator.classList).toContain('connection-indicator--degraded');

    spies.sseConnectionStatusServiceMock.status.set(
      SseConnectionStatus.Offline,
    );
    await renderResult.fixture.whenStable();
    expect(indicator.classList).toContain('connection-indicator--degraded');
  });
});

interface Spies {
  sseConnectionStatusServiceMock: {
    status: WritableSignal<SseConnectionStatus>;
  };
}

const Arrange = {
  async setup(spies: Spies) {
    const renderResult = await render(ConnectionIndicator, {
      providers: [
        {
          provide: SseStatusService,
          useValue: spies.sseConnectionStatusServiceMock,
        },
      ],
    });

    return { renderResult };
  },

  createSpies(status: SseConnectionStatus): Spies {
    return {
      sseConnectionStatusServiceMock: {
        status: signal(status),
      } satisfies Pick<SseStatusService, 'status'>,
    };
  },
};
