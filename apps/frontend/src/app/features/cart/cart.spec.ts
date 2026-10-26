import { HttpStatusCode } from '@angular/common/http';
import { signal, computed, WritableSignal, Signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { render, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { NEVER, of, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import {
  Dish,
  OrderStatus,
  OrderConflictReason,
} from '@restaurant/shared-api-types';
import {
  OrderDomainModel,
  OrdersDomainService,
  CreateOrderResultKind,
} from '@restaurant/frontend/domain/orders';
import { ApiError } from '@restaurant/frontend/core/http';
import {
  SseConnectionStatus,
  SseStatusService,
} from '@restaurant/frontend/domain/sse';

import { AuthStore } from '../auth/auth-store/auth.store';
import { LoadStatus } from '../menu/menu-store/menu-store.enums';
import { MenuStore } from '../menu/menu-store/menu.store';

import { Cart } from './cart';
import { CartItem } from './cart-store/cart-store.models';
import { CartStore } from './cart-store/cart.store';
import { OpenPriceDialogOpenerService } from './open-price-dialog/open-price-dialog-opener.service';
import { OrderConflictsDialogOpenerService } from './order-conflicts-dialog/order-conflicts-dialog-opener.service';

describe(Cart.name, () => {
  it('should say when the cart is empty', async () => {
    const spies = Arrange.createSpies();
    spies.cartStoreMock.itemEntities.set([]);
    const { renderResult } = await Arrange.setup(spies);

    expect(renderResult.getByText('Your cart is empty.')).toBeTruthy();
  });

  it('should show the totals with the discount', async () => {
    const { renderResult } = await Arrange.setup();

    const totals = renderResult.container.querySelector('dl')?.textContent;

    expect(totals).toContain('Subtotal$25.00');
    expect(totals).toContain('Discount−$5.00');
    expect(totals).toContain('Total$20.00');
  });

  it('should ask a guest to sign in instead of checking out', async () => {
    const spies = Arrange.createSpies();
    spies.authStoreMock.isSignedIn.set(false);
    const { renderResult } = await Arrange.setup(spies);

    expect(
      renderResult
        .getByRole('link', { name: 'Sign in to order' })
        .getAttribute('href'),
    ).toBe('/login');
    expect(renderResult.queryByRole('button', { name: 'Checkout' })).toBeNull();
  });

  describe('checkout', () => {
    it('should order the cart with a new idempotency key', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Checkout' }));

      const [key] = spies.cartStoreMock.setIdempotencyKey.mock.calls[0];
      expect(key).toEqual(expect.any(String));
      expect(spies.ordersDomainServiceMock.createOrder).toHaveBeenCalledWith(
        { items: [{ dishId: 'd-caesar', quantity: 2, unitPrice: 1250 }] },
        key,
      );
    });

    it('should reuse the idempotency key of an earlier attempt', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.cartStoreMock.idempotencyKey.set('key-1');
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Checkout' }));

      expect(spies.ordersDomainServiceMock.createOrder).toHaveBeenCalledWith(
        expect.anything(),
        'key-1',
      );
    });

    it('should empty the cart and go to the orders after the order', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult, navigateByUrlSpy } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Checkout' }));

      expect(spies.cartStoreMock.clear).toHaveBeenCalledOnce();
      expect(spies.snackBarMock.open).toHaveBeenCalledWith(
        'Order placed: $20.00',
        'Close',
        { duration: 5000 },
      );
      expect(navigateByUrlSpy).toHaveBeenCalledWith('/orders');
    });

    it('should show a spinner and block checkout while ordering', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.ordersDomainServiceMock.createOrder.mockReturnValue(NEVER);
      const { renderResult } = await Arrange.setup(spies);
      const checkout = renderResult.getByRole('button', { name: 'Checkout' });

      await user.click(checkout);

      expect(
        within(checkout).getByRole('progressbar', {
          name: 'Placing the order',
        }),
      ).toBeTruthy();
      expect(checkout.hasAttribute('disabled')).toBe(true);
      expect(spies.ordersDomainServiceMock.createOrder).toHaveBeenCalledOnce();
    });

    it('should keep the cart and explain a failed order', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.ordersDomainServiceMock.createOrder.mockReturnValue(
        throwError(
          () =>
            new ApiError(
              HttpStatusCode.ServiceUnavailable,
              'The server is having trouble.',
            ),
        ),
      );
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Checkout' }));

      expect(spies.cartStoreMock.clear).not.toHaveBeenCalled();
      expect(spies.snackBarMock.open).toHaveBeenCalledWith(
        'The server is having trouble.',
        'Close',
        { duration: 5000 },
      );
    });

    it('should update the cart when the customer accepts the conflicts', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const conflicts = [
        {
          dishId: 'd-caesar',
          reason: OrderConflictReason.PriceChanged,
          currentPrice: 1490,
        },
      ];
      spies.ordersDomainServiceMock.createOrder.mockReturnValue(
        of({ kind: CreateOrderResultKind.Conflicts, conflicts }),
      );
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Checkout' }));

      expect(
        spies.orderConflictsDialogOpenerMock.openDialog,
      ).toHaveBeenCalledWith({
        warnings: [{ ...conflicts[0], name: 'Chicken Caesar' }],
      });
      expect(spies.cartStoreMock.applyConflicts).toHaveBeenCalledWith(
        conflicts,
      );
      expect(spies.cartStoreMock.clear).not.toHaveBeenCalled();
    });

    it('should reload the out-of-date menu after a conflict', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.ordersDomainServiceMock.createOrder.mockReturnValue(
        of({ kind: CreateOrderResultKind.Conflicts, conflicts: [] }),
      );
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Checkout' }));

      expect(spies.menuStoreMock.reloadMenu).toHaveBeenCalledOnce();
    });

    it('should leave the cart as it is when the customer goes back', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.ordersDomainServiceMock.createOrder.mockReturnValue(
        of({ kind: CreateOrderResultKind.Conflicts, conflicts: [] }),
      );
      spies.orderConflictsDialogOpenerMock.openDialog.mockReturnValue(
        of(false),
      );
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Checkout' }));

      expect(spies.cartStoreMock.applyConflicts).not.toHaveBeenCalled();
    });

    it('should pause checkout while offline', async () => {
      const spies = Arrange.createSpies();
      spies.connectionStatusMock.status.set(SseConnectionStatus.Offline);
      const { renderResult } = await Arrange.setup(spies);

      expect(
        renderResult.getByText('You are offline. Checkout is paused.'),
      ).toBeTruthy();
      expect(
        renderResult
          .getByRole('button', { name: 'Checkout' })
          .hasAttribute('disabled'),
      ).toBe(true);
    });

    it('should wait for the menu before checking out', async () => {
      const spies = Arrange.createSpies();
      spies.menuStoreMock.status.set(LoadStatus.Loading);
      const { renderResult } = await Arrange.setup(spies);

      expect(
        renderResult
          .getByRole('button', { name: 'Checkout' })
          .hasAttribute('disabled'),
      ).toBe(true);
    });
  });

  describe('live warnings', () => {
    it('should warn about a dish whose price changed and pause checkout', async () => {
      const spies = Arrange.createSpies();
      spies.menuStoreMock.dishEntityMap.set({
        'd-caesar': { ...Arrange.createDish(), price: 1490 },
      });
      const { renderResult } = await Arrange.setup(spies);

      expect(
        renderResult.getByText('Chicken Caesar now costs $14.90.', {
          exact: false,
        }),
      ).toBeTruthy();
      expect(
        renderResult
          .getByRole('button', { name: 'Checkout' })
          .hasAttribute('disabled'),
      ).toBe(true);
    });

    it('should update the cart from the warnings', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.menuStoreMock.dishEntityMap.set({});
      const { renderResult } = await Arrange.setup(spies);

      await user.click(
        renderResult.getByRole('button', { name: 'Update cart' }),
      );

      expect(spies.cartStoreMock.applyConflicts).toHaveBeenCalledWith([
        {
          dishId: 'd-caesar',
          name: 'Chicken Caesar',
          reason: OrderConflictReason.Removed,
          currentPrice: null,
        },
      ]);
    });
  });

  describe('cart lines', () => {
    it('should change the quantity of a line', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(
        renderResult.getByRole('button', { name: 'One more Chicken Caesar' }),
      );

      expect(spies.cartStoreMock.setQuantity).toHaveBeenCalledWith(
        'd-caesar',
        3,
      );
    });

    it('should remove a line', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(
        renderResult.getByRole('button', { name: 'Remove Chicken Caesar' }),
      );

      expect(spies.cartStoreMock.remove).toHaveBeenCalledWith('d-caesar');
    });

    it('should change the price of an open-price dish', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.menuStoreMock.dishEntityMap.set({
        'd-caesar': { ...Arrange.createDish(), price: null, isOpenPrice: true },
      });
      const { renderResult } = await Arrange.setup(spies);

      await user.click(
        renderResult.getByRole('button', {
          name: 'Change your price for Chicken Caesar',
        }),
      );

      expect(spies.openPriceDialogOpenerMock.openDialog).toHaveBeenCalledWith({
        dishName: 'Chicken Caesar',
        unitPrice: 1250,
      });
      expect(spies.cartStoreMock.setUnitPrice).toHaveBeenCalledWith(
        'd-caesar',
        999,
      );
    });
  });
});

interface Spies {
  cartStoreMock: {
    itemEntities: WritableSignal<CartItem[]>;
    itemEntityMap: Signal<Record<string, CartItem>>;
    idempotencyKey: WritableSignal<string | null>;
    setIdempotencyKey: Mock;
    setQuantity: Mock;
    setUnitPrice: Mock;
    remove: Mock;
    applyConflicts: Mock;
    clear: Mock;
  };
  menuStoreMock: {
    status: WritableSignal<LoadStatus>;
    dishEntityMap: WritableSignal<Record<string, Dish>>;
    reloadMenu: Mock;
  };
  authStoreMock: { isSignedIn: WritableSignal<boolean> };
  connectionStatusMock: { status: WritableSignal<SseConnectionStatus> };
  ordersDomainServiceMock: { createOrder: Mock };
  openPriceDialogOpenerMock: { openDialog: Mock };
  orderConflictsDialogOpenerMock: { openDialog: Mock };
  snackBarMock: { open: Mock };
}

const Arrange = {
  async setup(spies?: Spies) {
    const {
      cartStoreMock,
      menuStoreMock,
      authStoreMock,
      connectionStatusMock,
      ordersDomainServiceMock,
      openPriceDialogOpenerMock,
      orderConflictsDialogOpenerMock,
      snackBarMock,
    } = spies ?? Arrange.createSpies();

    const renderResult = await render(Cart, {
      inputs: { appData: { discount: 500 } },
      providers: [
        provideRouter([]),
        { provide: CartStore, useValue: cartStoreMock },
        { provide: MenuStore, useValue: menuStoreMock },
        { provide: AuthStore, useValue: authStoreMock },
        { provide: SseStatusService, useValue: connectionStatusMock },
        { provide: OrdersDomainService, useValue: ordersDomainServiceMock },
        {
          provide: OpenPriceDialogOpenerService,
          useValue: openPriceDialogOpenerMock,
        },
        {
          provide: OrderConflictsDialogOpenerService,
          useValue: orderConflictsDialogOpenerMock,
        },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    });

    const navigateByUrlSpy = vi
      .spyOn(renderResult.debugElement.injector.get(Router), 'navigateByUrl')
      .mockResolvedValue(true);

    return { renderResult, navigateByUrlSpy };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    const itemEntities = signal([Arrange.createItem()]);

    return {
      cartStoreMock: {
        itemEntities,
        itemEntityMap: computed(() =>
          Object.fromEntries(itemEntities().map((item) => [item.dishId, item])),
        ),
        idempotencyKey: signal<string | null>(null),
        setIdempotencyKey: vi.fn(),
        setQuantity: vi.fn(),
        setUnitPrice: vi.fn(),
        remove: vi.fn(),
        applyConflicts: vi.fn(),
        clear: vi.fn(),
      },
      menuStoreMock: {
        status: signal<LoadStatus>(LoadStatus.Loaded),
        dishEntityMap: signal<Record<string, Dish>>({
          'd-caesar': Arrange.createDish(),
        }),
        reloadMenu: vi.fn(),
      },
      authStoreMock: { isSignedIn: signal(true) },
      connectionStatusMock: {
        status: signal<SseConnectionStatus>(SseConnectionStatus.Online),
      },
      ordersDomainServiceMock: {
        createOrder: vi.fn().mockReturnValue(
          of({
            kind: CreateOrderResultKind.Created,
            order: Arrange.createOrder(),
          }),
        ),
      } satisfies Mocked<Pick<OrdersDomainService, 'createOrder'>>,
      openPriceDialogOpenerMock: {
        openDialog: vi.fn().mockReturnValue(of(999)),
      },
      orderConflictsDialogOpenerMock: {
        openDialog: vi.fn().mockReturnValue(of(true)),
      },
      snackBarMock: { open: vi.fn() },
    };
  },

  createItem(): CartItem {
    return {
      dishId: 'd-caesar',
      name: 'Chicken Caesar',
      unitPrice: 1250,
      quantity: 2,
    };
  },

  createDish(): Dish {
    return {
      id: 'd-caesar',
      categoryId: 'c-salads',
      name: 'Chicken Caesar',
      description: '',
      photoUrl: null,
      price: 1250,
      isOpenPrice: false,
      available: true,
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
