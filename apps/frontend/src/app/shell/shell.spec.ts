import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';

import { AppData } from '../app.resolver';

import { Shell } from './shell';

describe(Shell.name, () => {
  it('should render the toolbar title', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createAppData());

    expect(renderResult.getByText('Restaurant Ordering')).toBeTruthy();
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
