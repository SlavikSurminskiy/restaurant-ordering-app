import { signal, WritableSignal } from '@angular/core';
import { render } from '@testing-library/angular';

import {
  SseConnectionStatus,
  SseStatusService,
} from '@restaurant/frontend/domain/sse';

import { ConnectionIndicator } from './connection-indicator';
import { ConnectionTone } from './connection-indicator.enums';

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

  it.each([
    [SseConnectionStatus.Online, ConnectionTone.Ok],
    [SseConnectionStatus.Connecting, ConnectionTone.Warning],
    [SseConnectionStatus.Reconnecting, ConnectionTone.Warning],
    [SseConnectionStatus.Disconnected, ConnectionTone.Error],
    [SseConnectionStatus.Offline, ConnectionTone.Error],
  ])('should colour the %s status as %s', async (status, tone) => {
    const { renderResult } = await Arrange.setup(Arrange.createSpies(status));

    expect(Array.from(renderResult.container.classList)).toEqual([
      `connection-indicator--${tone}`,
    ]);
  });

  it('should switch the colour when the status changes', async () => {
    const spies = Arrange.createSpies(SseConnectionStatus.Online);
    const { renderResult } = await Arrange.setup(spies);

    spies.sseConnectionStatusServiceMock.status.set(
      SseConnectionStatus.Offline,
    );
    await renderResult.fixture.whenStable();

    expect(renderResult.container.classList).toContain(
      'connection-indicator--error',
    );
    expect(renderResult.container.classList).not.toContain(
      'connection-indicator--ok',
    );
  });

  it.each([
    [SseConnectionStatus.Online, true],
    [SseConnectionStatus.Connecting, false],
    [SseConnectionStatus.Offline, false],
  ])('should pulse the icon of the %s status: %s', async (status, pulsing) => {
    const { renderResult } = await Arrange.setup(Arrange.createSpies(status));

    expect(
      renderResult.container
        .querySelector('.connection-indicator__icon')
        ?.classList.contains('connection-indicator__icon--pulsing'),
    ).toBe(pulsing);
  });

  it.each([
    [SseConnectionStatus.Connecting, true],
    [SseConnectionStatus.Reconnecting, true],
    [SseConnectionStatus.Online, false],
    [SseConnectionStatus.Offline, false],
  ])('should spin the icon of the %s status: %s', async (status, spinning) => {
    const { renderResult } = await Arrange.setup(Arrange.createSpies(status));

    expect(
      renderResult.container
        .querySelector('.connection-indicator__icon')
        ?.classList.contains('connection-indicator__icon--spinning'),
    ).toBe(spinning);
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
