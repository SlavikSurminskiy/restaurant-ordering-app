import { TestBed } from '@angular/core/testing';

import { OrderConflictReason } from '@restaurant/shared-api-types';

import { CART_STORAGE_KEY } from './cart-store.constants';
import { NewCartItem } from './cart-store.models';
import { CartStore } from './cart.store';

describe('CartStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should add a dish once', () => {
    const store = Arrange.setup();

    store.add(Arrange.createCaesar());

    expect(store.itemEntities()).toEqual([
      { ...Arrange.createCaesar(), quantity: 1 },
    ]);
  });

  it('should add one more of a dish already in the cart and take its latest price', () => {
    const store = Arrange.setup();

    store.add(Arrange.createCaesar());
    store.add({ ...Arrange.createCaesar(), unitPrice: 1490 });

    expect(store.itemEntities()).toEqual([
      { ...Arrange.createCaesar(), unitPrice: 1490, quantity: 2 },
    ]);
  });

  it('should count every portion', () => {
    const store = Arrange.setup();

    store.add(Arrange.createCaesar());
    store.add(Arrange.createCaesar());
    store.add(Arrange.createSoup());

    expect(store.count()).toBe(3);
  });

  it('should change the quantity', () => {
    const store = Arrange.setup();
    store.add(Arrange.createCaesar());

    store.setQuantity('d-caesar', 4);

    expect(store.itemEntityMap()['d-caesar']?.quantity).toBe(4);
  });

  it('should remove a dish whose quantity drops to zero', () => {
    const store = Arrange.setup();
    store.add(Arrange.createCaesar());

    store.setQuantity('d-caesar', 0);

    expect(store.itemEntities()).toEqual([]);
  });

  it('should change the price of a dish', () => {
    const store = Arrange.setup();
    store.add(Arrange.createCaesar());

    store.setUnitPrice('d-caesar', 900);

    expect(store.itemEntityMap()['d-caesar']?.unitPrice).toBe(900);
  });

  it('should remove a dish', () => {
    const store = Arrange.setup();
    store.add(Arrange.createCaesar());

    store.remove('d-caesar');

    expect(store.itemEntities()).toEqual([]);
  });

  it('should take new prices and drop dishes that can not be ordered', () => {
    const store = Arrange.setup();
    store.add(Arrange.createCaesar());
    store.add(Arrange.createSoup());
    store.add(Arrange.createCake());

    store.applyConflicts([
      {
        dishId: 'd-caesar',
        reason: OrderConflictReason.PriceChanged,
        currentPrice: 1490,
      },
      {
        dishId: 'd-soup',
        reason: OrderConflictReason.Unavailable,
        currentPrice: null,
      },
      {
        dishId: 'd-cake',
        reason: OrderConflictReason.Removed,
        currentPrice: null,
      },
    ]);

    expect(store.itemEntities()).toEqual([
      { ...Arrange.createCaesar(), unitPrice: 1490, quantity: 1 },
    ]);
  });

  it('should empty the cart', () => {
    const store = Arrange.setup();
    store.add(Arrange.createCaesar());

    store.clear();

    expect(store.itemEntities()).toEqual([]);
  });

  it('should keep the idempotency key until the cart changes', () => {
    const store = Arrange.setup();
    store.add(Arrange.createCaesar());

    store.setIdempotencyKey('key-1');
    expect(store.idempotencyKey()).toBe('key-1');

    store.setQuantity('d-caesar', 2);
    expect(store.idempotencyKey()).toBeNull();
  });

  it('should drop the idempotency key once the cart is emptied', () => {
    const store = Arrange.setup();
    store.add(Arrange.createCaesar());
    store.setIdempotencyKey('key-1');

    store.clear();

    expect(store.idempotencyKey()).toBeNull();
  });

  it('should keep the cart in local storage', () => {
    const store = Arrange.setup();

    store.add(Arrange.createCaesar());
    TestBed.tick();

    expect(localStorage.getItem(CART_STORAGE_KEY)).toContain('Chicken Caesar');
  });

  it('should restore the cart from local storage', () => {
    Arrange.setup().add(Arrange.createCaesar());
    TestBed.tick();
    TestBed.resetTestingModule();

    const store = Arrange.setup();

    expect(store.itemEntities()).toEqual([
      { ...Arrange.createCaesar(), quantity: 1 },
    ]);
  });
});

const Arrange = {
  setup() {
    return TestBed.inject(CartStore);
  },

  createCaesar(): NewCartItem {
    return { dishId: 'd-caesar', name: 'Chicken Caesar', unitPrice: 1250 };
  },

  createSoup(): NewCartItem {
    return { dishId: 'd-soup', name: 'Tomato soup', unitPrice: 800 };
  },

  createCake(): NewCartItem {
    return { dishId: 'd-cake', name: 'Cheesecake', unitPrice: 700 };
  },
};
