import { HttpStatusCode } from '@angular/common/http';
import { signal, WritableSignal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { NEVER, of, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import { OrderStatus } from '@restaurant/shared-api-types';
import {
  OrderDomainModel,
  OrdersDomainService,
} from '@restaurant/frontend/domain/orders';
import { ConfirmDialogOpenerService } from '@restaurant/frontend/ui';
import { ApiError } from '@restaurant/frontend/core/http';

import { AuthStore } from '../auth/auth-store/auth.store';
import { LoadStatus } from '../menu/menu-store/menu-store.enums';

import { Orders } from './orders';
import { OrdersStore } from './orders-store/orders.store';
import { OrdersStoreService } from './orders-store/orders-store.service';

describe(Orders.name, () => {
  it('should keep the orders up to date while the page is open', async () => {
    const spies = Arrange.createSpies();
    await Arrange.setup(spies);

    expect(spies.ordersStoreMock.keepOrdersUpToDate).toHaveBeenCalledOnce();
  });

  it('should show a loading bar until the orders are loaded', async () => {
    const spies = Arrange.createSpies();
    spies.ordersStoreMock.status.set(LoadStatus.Loading);
    const { renderResult } = await Arrange.setup(spies);

    expect(
      renderResult.getByRole('progressbar', { name: 'Loading the orders' }),
    ).toBeTruthy();
  });

  it('should explain a failed load', async () => {
    const spies = Arrange.createSpies();
    spies.ordersStoreMock.status.set(LoadStatus.Error);
    spies.ordersStoreMock.error.set('The server is having trouble.');
    const { renderResult } = await Arrange.setup(spies);

    expect(renderResult.getByRole('alert').textContent).toContain(
      'The server is having trouble.',
    );
  });

  it('should say when there are no orders yet', async () => {
    const spies = Arrange.createSpies();
    spies.ordersStoreMock.orders.set([]);
    const { renderResult } = await Arrange.setup(spies);

    expect(renderResult.getByText('No orders yet.')).toBeTruthy();
  });

  it('should show the own orders of a customer without admin actions', async () => {
    const spies = Arrange.createSpies();
    spies.authStoreMock.isAdmin.set(false);
    const { renderResult } = await Arrange.setup(spies);

    expect(
      renderResult.getByRole('heading', { name: 'Your orders' }),
    ).toBeTruthy();
    expect(
      renderResult.getByRole('heading', { name: 'Order o-1' }),
    ).toBeTruthy();
    expect(
      renderResult.queryByRole('button', { name: 'Start preparing' }),
    ).toBeNull();
  });

  describe('for an admin', () => {
    it('should move an order to the next status', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(
        renderResult.getByRole('button', { name: 'Start preparing' }),
      );

      expect(
        spies.ordersDomainServiceMock.updateOrderStatus,
      ).toHaveBeenCalledWith('o-1', OrderStatus.Preparing);
      expect(spies.ordersStoreMock.upsertOrder).toHaveBeenCalledWith({
        ...Arrange.createOrder(),
        status: OrderStatus.Preparing,
      });
    });

    it('should block the actions of an order while its status changes', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.ordersDomainServiceMock.updateOrderStatus.mockReturnValue(NEVER);
      const { renderResult } = await Arrange.setup(spies);
      const advance = renderResult.getByRole('button', {
        name: 'Start preparing',
      });

      await user.click(advance);

      expect(advance.hasAttribute('disabled')).toBe(true);
    });

    it('should cancel an order once confirmed', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(
        renderResult.getByRole('button', { name: 'Cancel order' }),
      );

      expect(spies.confirmDialogOpenerMock.openDialog).toHaveBeenCalledWith({
        title: 'Cancel order',
        message: 'Cancel the order of Customer?',
        confirmLabel: 'Cancel order',
      });
      expect(
        spies.ordersDomainServiceMock.updateOrderStatus,
      ).toHaveBeenCalledWith('o-1', OrderStatus.Cancelled);
    });

    it('should keep an order when the cancel is not confirmed', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.confirmDialogOpenerMock.openDialog.mockReturnValue(of(false));
      const { renderResult } = await Arrange.setup(spies);

      await user.click(
        renderResult.getByRole('button', { name: 'Cancel order' }),
      );

      expect(
        spies.ordersDomainServiceMock.updateOrderStatus,
      ).not.toHaveBeenCalled();
    });

    it('should explain a status change the server refused', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.ordersDomainServiceMock.updateOrderStatus.mockReturnValue(
        throwError(
          () =>
            new ApiError(
              HttpStatusCode.Conflict,
              'The data changed meanwhile. Please review and try again.',
            ),
        ),
      );
      const { renderResult } = await Arrange.setup(spies);
      const advance = renderResult.getByRole('button', {
        name: 'Start preparing',
      });

      await user.click(advance);

      expect(spies.snackBarMock.open).toHaveBeenCalledWith(
        'The data changed meanwhile. Please review and try again.',
        'Close',
        { duration: 5000 },
      );
      expect(advance.hasAttribute('disabled')).toBe(false);
    });
  });
});

interface Spies {
  ordersStoreMock: {
    status: WritableSignal<LoadStatus>;
    error: WritableSignal<string | null>;
    orders: WritableSignal<OrderDomainModel[]>;
    keepOrdersUpToDate: Mock;
    upsertOrder: Mock;
  };
  authStoreMock: { isAdmin: WritableSignal<boolean> };
  ordersDomainServiceMock: { updateOrderStatus: Mock };
  confirmDialogOpenerMock: { openDialog: Mock };
  snackBarMock: { open: Mock };
}

const Arrange = {
  async setup(spies?: Spies) {
    const {
      ordersStoreMock,
      authStoreMock,
      ordersDomainServiceMock,
      confirmDialogOpenerMock,
      snackBarMock,
    } = spies ?? Arrange.createSpies();

    const renderResult = await render(Orders, {
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: authStoreMock },
        { provide: OrdersDomainService, useValue: ordersDomainServiceMock },
        {
          provide: ConfirmDialogOpenerService,
          useValue: confirmDialogOpenerMock,
        },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
      componentProviders: [
        { provide: OrdersStore, useValue: ordersStoreMock },
        { provide: OrdersStoreService, useValue: {} },
      ],
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return {
      ordersStoreMock: {
        status: signal<LoadStatus>(LoadStatus.Loaded),
        error: signal<string | null>(null),
        orders: signal([Arrange.createOrder()]),
        keepOrdersUpToDate: vi.fn(),
        upsertOrder: vi.fn(),
      },
      authStoreMock: { isAdmin: signal(true) },
      ordersDomainServiceMock: {
        updateOrderStatus: vi
          .fn()
          .mockImplementation((_id: string, status: OrderStatus) =>
            of({ ...Arrange.createOrder(), status }),
          ),
      } satisfies Mocked<Pick<OrdersDomainService, 'updateOrderStatus'>>,
      confirmDialogOpenerMock: {
        openDialog: vi.fn().mockReturnValue(of(true)),
      },
      snackBarMock: { open: vi.fn() },
    };
  },

  createOrder(): OrderDomainModel {
    return {
      id: 'o-1',
      userId: 'u-customer',
      userName: 'Customer',
      status: OrderStatus.New,
      items: [],
      subtotal: 2500,
      discount: 500,
      total: 2000,
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-10-25T10:00:00.000Z',
    };
  },
};
