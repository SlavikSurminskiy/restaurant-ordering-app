import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';

import { AppData } from '../app.resolver';

import { Shell } from './shell';

describe(Shell.name, () => {
  it('should show the navigation instead of a title', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createAppData());

    expect(renderResult.getByRole('navigation', { name: 'Main' })).toBeTruthy();
    expect(renderResult.queryByText('Restaurant Ordering')).toBeNull();
  });

  it('should link to the cart', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createAppData());

    expect(
      renderResult.getByRole('link', { name: /^Cart/ }).getAttribute('href'),
    ).toBe('/cart');
  });

  it('should show the order discount in the toolbar', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createAppData());

    expect(renderResult.getByText('$5.00 off every order')).toBeTruthy();
  });

  it('should show the connection status', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createAppData());

    expect(renderResult.getByRole('status').textContent).toContain(
      'Disconnected',
    );
  });

  it('should hide the discount when there is none', async () => {
    const { renderResult } = await Arrange.setup(
      Arrange.createAppData({ discount: 0 }),
    );

    expect(renderResult.queryByText(/off every order/)).toBeNull();
  });
});

const Arrange = {
  async setup(appData: AppData) {
    const renderResult = await render(Shell, {
      inputs: { appData },
      providers: [provideRouter([])],
    });

    return { renderResult };
  },

  createAppData(appData: Partial<AppData> = {}): AppData {
    return { discount: 500, ...appData };
  },
};
