import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import type { Mock } from 'vitest';

import { SseService } from '@restaurant/frontend/core/realtime';

import { App } from './app';
import { MenuStore } from './features/menu/menu-store/menu.store';

describe(App.name, () => {
  it('should open the event stream for the whole app', async () => {
    const spies = Arrange.createSpies();
    await Arrange.setup(spies);

    expect(spies.sseServiceMock.connect).toHaveBeenCalledTimes(1);
  });

  it('should start syncing the menu for the whole app', async () => {
    const spies = Arrange.createSpies();
    await Arrange.setup(spies);

    expect(spies.menuStoreMock.keepMenuUpToDate).toHaveBeenCalledTimes(1);
  });
});

interface Spies {
  sseServiceMock: { connect: Mock };
  menuStoreMock: { keepMenuUpToDate: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const renderResult = await render(App, {
      providers: [
        provideRouter([]),
        { provide: SseService, useValue: spies.sseServiceMock },
        { provide: MenuStore, useValue: spies.menuStoreMock },
      ],
    });

    return { renderResult };
  },

  createSpies(): Spies {
    return {
      sseServiceMock: { connect: vi.fn() },
      menuStoreMock: { keepMenuUpToDate: vi.fn() },
    };
  },
};
