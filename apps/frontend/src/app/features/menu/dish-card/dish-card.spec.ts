import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { Dish } from '@restaurant/shared-api-types';

import { DishCard } from './dish-card';

describe(DishCard.name, () => {
  it('should show the dish with its price', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createDish());

    expect(
      renderResult.getByRole('heading', { name: 'Chicken Caesar' }),
    ).toBeTruthy();
    expect(renderResult.getByText('$12.50')).toBeTruthy();
  });

  it('should ask for a price of an open-price dish', async () => {
    const { renderResult } = await Arrange.setup({
      ...Arrange.createDish(),
      price: null,
      isOpenPrice: true,
    });

    expect(renderResult.getByText('Your price')).toBeTruthy();
  });

  it('should report a click on add', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(Arrange.createDish(), spies);

    await user.click(
      renderResult.getByRole('button', {
        name: 'Add Chicken Caesar to cart',
      }),
    );

    expect(spies.add).toHaveBeenCalledOnce();
  });

  it('should not let an unavailable dish be added', async () => {
    const { renderResult } = await Arrange.setup({
      ...Arrange.createDish(),
      available: false,
    });

    expect(renderResult.getByText('Unavailable')).toBeTruthy();
    expect(renderResult.queryByRole('button')).toBeNull();
  });
});

interface Spies {
  add: Mock;
}

const Arrange = {
  async setup(dish: Dish, spies?: Spies) {
    const renderResult = await render(DishCard, {
      inputs: { dish },
      on: spies ?? Arrange.createSpies(),
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return { add: vi.fn() };
  },

  createDish(): Dish {
    return {
      id: 'd-caesar',
      categoryId: 'c-salads',
      name: 'Chicken Caesar',
      description: 'Romaine, chicken, parmesan',
      photoUrl: null,
      price: 1250,
      isOpenPrice: false,
      available: true,
    };
  },
};
