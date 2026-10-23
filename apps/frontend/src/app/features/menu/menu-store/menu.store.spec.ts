import { HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { Mocked } from 'vitest';

import { Dish } from '@restaurant/shared-api-types';

import { ApiError } from '../../../core/http/api-error';
import { DomainService } from '../../../shared/domain/domain.service';
import { MenuDomainModel } from '../../../shared/domain/domain.models';

import { LoadStatus } from './menu-store.enums';
import { MenuStore } from './menu.store';

describe('MenuStore', () => {
  it('should load the menu from the domain service', () => {
    const { store, domainServiceMock } = Arrange.setup();

    store.loadMenu();

    expect(domainServiceMock.getMenu).toHaveBeenCalled();
    expect(store.status()).toBe(LoadStatus.Loaded);
    expect(store.sections()).toEqual(Arrange.createMenu().sections);
  });

  it('should be loading while the menu request is in flight', () => {
    const { store, domainServiceMock } = Arrange.setup();
    const response = new Subject<MenuDomainModel>();
    domainServiceMock.getMenu.mockReturnValue(response);

    store.loadMenu();
    expect(store.status()).toBe(LoadStatus.Loading);

    response.next(Arrange.createMenu());
    expect(store.status()).toBe(LoadStatus.Loaded);
  });

  it('should keep a readable error when loading fails', () => {
    const { store, domainServiceMock } = Arrange.setup();
    domainServiceMock.getMenu.mockReturnValue(
      throwError(() => Arrange.createNotFoundError()),
    );

    store.loadMenu();

    expect(store.status()).toBe(LoadStatus.Error);
    expect(store.error()).toBe('The requested data was not found.');
  });

  it('should clear the error and load again on retry', () => {
    const { store, domainServiceMock } = Arrange.setup();
    domainServiceMock.getMenu.mockReturnValueOnce(
      throwError(() => Arrange.createNotFoundError()),
    );
    store.loadMenu();

    store.loadMenu();

    expect(store.status()).toBe(LoadStatus.Loaded);
    expect(store.error()).toBeNull();
  });

  it('should refresh a loaded menu in place', () => {
    const { store, domainServiceMock } = Arrange.setup();
    store.loadMenu();
    const refreshed = new Subject<MenuDomainModel>();
    domainServiceMock.getMenu.mockReturnValue(refreshed);

    store.loadMenu();
    expect(store.status()).toBe(LoadStatus.Loaded);
    expect(store.sections()).toEqual(Arrange.createMenu().sections);

    refreshed.next({ sections: [] });
    expect(store.sections()).toEqual([]);
  });

  it('should keep the loaded menu when a refresh fails', () => {
    const { store, domainServiceMock } = Arrange.setup();
    store.loadMenu();
    domainServiceMock.getMenu.mockReturnValue(
      throwError(() => Arrange.createNotFoundError()),
    );

    store.loadMenu();

    expect(store.status()).toBe(LoadStatus.Loaded);
    expect(store.error()).toBeNull();
    expect(store.sections()).toEqual(Arrange.createMenu().sections);
  });

  it('should ignore a response that a newer load replaced', () => {
    const { store, domainServiceMock } = Arrange.setup();
    const first = new Subject<MenuDomainModel>();
    const second = new Subject<MenuDomainModel>();
    domainServiceMock.getMenu
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);

    store.loadMenu();
    store.loadMenu();
    first.next({ sections: [] });
    second.next(Arrange.createMenu());

    expect(store.sections()).toEqual(Arrange.createMenu().sections);
  });
});

const Arrange = {
  setup() {
    const domainServiceMock = {
      getMenu: vi.fn().mockReturnValue(of(Arrange.createMenu())),
    } satisfies Mocked<Pick<DomainService, 'getMenu'>>;

    TestBed.configureTestingModule({
      providers: [{ provide: DomainService, useValue: domainServiceMock }],
    });

    return {
      store: TestBed.inject(MenuStore),
      domainServiceMock,
    };
  },

  createMenu(): MenuDomainModel {
    return {
      sections: [
        {
          category: { id: 'c-salads', name: 'Salads' },
          dishes: [Arrange.createDish()],
        },
      ],
    };
  },

  createDish(): Dish {
    return {
      id: 'd-caesar',
      categoryId: 'c-salads',
      name: 'Chicken Caesar',
      description: 'Romaine, grilled chicken, parmesan',
      photoUrl: null,
      price: 1250,
      isOpenPrice: false,
      available: true,
    };
  },

  createNotFoundError(): ApiError {
    return new ApiError(
      HttpStatusCode.NotFound,
      'The requested data was not found.',
    );
  },
};
