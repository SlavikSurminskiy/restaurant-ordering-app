import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { OrderConflictReason } from '@restaurant/shared-api-types';

import { CartLineModel } from '../cart.models';

import { CartLine } from './cart-line';

describe(CartLine.name, () => {
  it('should show the dish with its price, quantity and total', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createLine());

    expect(
      renderResult.getByRole('heading', { name: 'Chicken Caesar' }),
    ).toBeTruthy();
    expect(renderResult.getByText('$12.50 each')).toBeTruthy();
    expect(
      renderResult.getByLabelText('Quantity of Chicken Caesar').textContent,
    ).toContain('2');
    expect(renderResult.getByText('$25.00')).toBeTruthy();
  });

  it('should report one more', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(Arrange.createLine(), spies);

    await user.click(
      renderResult.getByRole('button', { name: 'One more Chicken Caesar' }),
    );

    expect(spies.quantityChange).toHaveBeenCalledWith(3);
  });

  it('should report one less', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(Arrange.createLine(), spies);

    await user.click(
      renderResult.getByRole('button', { name: 'One less Chicken Caesar' }),
    );

    expect(spies.quantityChange).toHaveBeenCalledWith(1);
  });

  it('should report a click on remove', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(Arrange.createLine(), spies);

    await user.click(
      renderResult.getByRole('button', { name: 'Remove Chicken Caesar' }),
    );

    expect(spies.remove).toHaveBeenCalledOnce();
  });

  it('should let the price of an open-price dish be changed', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(
      { ...Arrange.createLine(), isOpenPrice: true },
      spies,
    );

    await user.click(
      renderResult.getByRole('button', {
        name: 'Change your price for Chicken Caesar',
      }),
    );

    expect(spies.editPrice).toHaveBeenCalledOnce();
  });

  it('should not let a fixed price be changed', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createLine());

    expect(
      renderResult.queryByRole('button', {
        name: 'Change your price for Chicken Caesar',
      }),
    ).toBeNull();
  });

  it('should show the warning of the line', async () => {
    const { renderResult } = await Arrange.setup({
      ...Arrange.createLine(),
      warning: {
        dishId: 'd-caesar',
        name: 'Chicken Caesar',
        reason: OrderConflictReason.Unavailable,
        currentPrice: null,
      },
    });

    expect(renderResult.getByRole('status').textContent).toContain(
      'Chicken Caesar is not available right now.',
    );
  });
});

interface Spies {
  quantityChange: Mock;
  remove: Mock;
  editPrice: Mock;
}

const Arrange = {
  async setup(line: CartLineModel, spies?: Spies) {
    const renderResult = await render(CartLine, {
      inputs: { line },
      on: spies ?? Arrange.createSpies(),
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return { quantityChange: vi.fn(), remove: vi.fn(), editPrice: vi.fn() };
  },

  createLine(): CartLineModel {
    return {
      item: {
        dishId: 'd-caesar',
        name: 'Chicken Caesar',
        unitPrice: 1250,
        quantity: 2,
      },
      isOpenPrice: false,
      total: 2500,
      warning: null,
    };
  },
};
