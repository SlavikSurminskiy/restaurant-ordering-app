import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { Dish } from '@restaurant/shared-api-types';

import { DishCard } from './dish-card';
import { MAX_ADD_QUANTITY } from './dish-card.constants';

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

  it('should show the chosen quantity', async () => {
    const { renderResult } = await Arrange.setup(
      Arrange.createDish(),
      undefined,
      3,
    );

    expect(
      renderResult.getByLabelText('Quantity of Chicken Caesar').textContent,
    ).toBe('3');
  });

  it('should report one more portion', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(
      Arrange.createDish(),
      spies,
      3,
    );

    await user.click(
      renderResult.getByRole('button', { name: 'One more Chicken Caesar' }),
    );

    expect(spies.quantityChange).toHaveBeenCalledExactlyOnceWith(4);
  });

  it('should report one less portion', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(
      Arrange.createDish(),
      spies,
      3,
    );

    await user.click(
      renderResult.getByRole('button', { name: 'One less Chicken Caesar' }),
    );

    expect(spies.quantityChange).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('should not go below one portion', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createDish());

    expect(
      renderResult
        .getByRole('button', { name: 'One less Chicken Caesar' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('should not go above the maximum', async () => {
    const { renderResult } = await Arrange.setup(
      Arrange.createDish(),
      undefined,
      MAX_ADD_QUANTITY,
    );

    expect(
      renderResult
        .getByRole('button', { name: 'One more Chicken Caesar' })
        .hasAttribute('disabled'),
    ).toBe(true);
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
  quantityChange: Mock;
}

const Arrange = {
  async setup(dish: Dish, spies?: Spies, quantity = 1) {
    const renderResult = await render(DishCard, {
      inputs: { dish, quantity },
      on: spies ?? Arrange.createSpies(),
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return { add: vi.fn(), quantityChange: vi.fn() };
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
