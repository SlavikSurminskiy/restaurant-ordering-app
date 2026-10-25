import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';

import { CartStore } from '../../features/cart/cart-store/cart.store';

import { CartButton } from './cart-button';

describe(CartButton.name, () => {
  it('should link to the cart with the number of items', async () => {
    const { renderResult } = await Arrange.setup(3);

    const link = renderResult.getByRole('link', { name: 'Cart, 3 items' });

    expect(link.getAttribute('href')).toBe('/cart');
    expect(link.textContent).toContain('3');
  });

  it('should hide the badge of an empty cart', async () => {
    const { renderResult } = await Arrange.setup(0);

    expect(
      renderResult.container.querySelector('.mat-badge-hidden'),
    ).toBeTruthy();
  });
});

const Arrange = {
  async setup(count: number) {
    const renderResult = await render(CartButton, {
      providers: [
        provideRouter([]),
        { provide: CartStore, useValue: { count: signal(count) } },
      ],
    });

    return { renderResult };
  },
};
