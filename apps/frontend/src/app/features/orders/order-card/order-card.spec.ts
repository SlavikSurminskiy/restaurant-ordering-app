import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { OrderStatus } from '@restaurant/shared-api-types';

import { OrderCardModel } from '../orders.models';

import { OrderCard } from './order-card';

describe(OrderCard.name, () => {
  it('should show the order with its items, status and total', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createCard());

    const text = renderResult.container.textContent;

    expect(
      renderResult.getByRole('heading', { name: 'Order o-123456' }),
    ).toBeTruthy();
    expect(text).toContain('New');
    expect(text).toContain('2 × Chicken Caesar');
    expect(text).toContain('$25.00');
    expect(text).toContain('Discount−$5.00');
    expect(text).toContain('Total$20.00');
  });

  it('should not show a customer who ordered nor the admin actions', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createCard());

    expect(renderResult.container.textContent).not.toContain('Customer');
    expect(renderResult.queryByRole('button')).toBeNull();
  });

  describe('for an admin', () => {
    it('should show who ordered', async () => {
      const { renderResult } = await Arrange.setup(Arrange.createCard(), {
        canManage: true,
      });

      expect(renderResult.container.textContent).toContain('Customer');
    });

    it('should report the next status', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(
        Arrange.createCard(),
        { canManage: true },
        spies,
      );

      await user.click(
        renderResult.getByRole('button', { name: 'Start preparing' }),
      );

      expect(spies.advance).toHaveBeenCalledWith(OrderStatus.Preparing);
    });

    it('should report a click on cancel', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(
        Arrange.createCard(),
        { canManage: true },
        spies,
      );

      await user.click(
        renderResult.getByRole('button', { name: 'Cancel order' }),
      );

      expect(spies.cancelOrder).toHaveBeenCalledOnce();
    });

    it('should not let a final order be changed', async () => {
      const { renderResult } = await Arrange.setup(
        { ...Arrange.createCard(), nextStatus: null },
        { canManage: true },
      );

      expect(renderResult.queryByRole('button')).toBeNull();
    });

    it('should block the actions while the status is changing', async () => {
      const { renderResult } = await Arrange.setup(Arrange.createCard(), {
        canManage: true,
        isUpdating: true,
      });

      expect(
        renderResult
          .getByRole('button', { name: 'Start preparing' })
          .hasAttribute('disabled'),
      ).toBe(true);
      expect(
        renderResult
          .getByRole('button', { name: 'Cancel order' })
          .hasAttribute('disabled'),
      ).toBe(true);
    });
  });
});

interface Spies {
  advance: Mock;
  cancelOrder: Mock;
}

const Arrange = {
  async setup(
    card: OrderCardModel,
    inputs: { canManage?: boolean; isUpdating?: boolean } = {},
    spies?: Spies,
  ) {
    const renderResult = await render(OrderCard, {
      inputs: { card, ...inputs },
      on: spies ?? Arrange.createSpies(),
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return { advance: vi.fn(), cancelOrder: vi.fn() };
  },

  createCard(): OrderCardModel {
    return {
      order: {
        id: 'o-1234567-abcd',
        userId: 'u-customer',
        userName: 'Customer',
        status: OrderStatus.New,
        items: [
          {
            id: 'i-1',
            dishId: 'd-caesar',
            name: 'Chicken Caesar',
            unitPrice: 1250,
            quantity: 2,
          },
        ],
        subtotal: 2500,
        discount: 500,
        total: 2000,
        createdAt: '2026-10-25T10:00:00.000Z',
        updatedAt: '2026-10-25T10:00:00.000Z',
      },
      nextStatus: OrderStatus.Preparing,
    };
  },
};
