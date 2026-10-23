import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import { of } from 'rxjs';
import type { Mock } from 'vitest';

import { App } from './app';
import { MenuStore } from './features/menu/menu-store/menu.store';

describe(App.name, () => {
  it('should start loading the menu for the whole app', async () => {
    const spies = Arrange.createSpies();
    await Arrange.setup(spies);

    expect(spies.menuStoreMock.loadMenu).toHaveBeenCalledTimes(1);
  });
});

interface Spies {
  menuStoreMock: { loadMenu: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const renderResult = await render(App, {
      providers: [
        provideRouter([]),
        { provide: MenuStore, useValue: spies.menuStoreMock },
      ],
    });

    return { renderResult };
  },

  createSpies(): Spies {
    return {
      menuStoreMock: { loadMenu: vi.fn().mockReturnValue(of({})) },
    };
  },
};
