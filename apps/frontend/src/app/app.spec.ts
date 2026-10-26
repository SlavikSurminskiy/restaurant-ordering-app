import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { App } from './app';
import { MenuStore } from './features/menu/menu-store/menu.store';

describe(App.name, () => {
  it('should create the menu store, so the menu syncs for the whole app', async () => {
    const spies = Arrange.createSpies();

    await Arrange.setup(spies);

    expect(spies.createMenuStore).toHaveBeenCalledOnce();
  });
});

interface Spies {
  createMenuStore: Mock;
}

const Arrange = {
  async setup(spies: Spies) {
    const renderResult = await render(App, {
      providers: [
        provideRouter([]),
        { provide: MenuStore, useFactory: spies.createMenuStore },
      ],
    });

    return { renderResult };
  },

  createSpies(): Spies {
    return { createMenuStore: vi.fn(() => ({})) };
  },
};
