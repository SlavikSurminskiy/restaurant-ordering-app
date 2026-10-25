import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import { MenuAdminDataAccessService } from '@restaurant/frontend/data-access/menu-admin';

import {
  DishDomainModel,
  CategoryDomainModel,
  CreateDishDomainModel,
} from './menu-admin-domain.models';
import { MenuAdminDomainService } from './menu-admin-domain.service';

describe(MenuAdminDomainService.name, () => {
  it('should create a category', async () => {
    const category = Arrange.createCategory();
    const spies = Arrange.createSpies();
    spies.menuAdminDataAccessServiceMock.createCategory.mockReturnValue(
      of(category),
    );
    const service = Arrange.setup(spies);

    await expect(
      firstValueFrom(service.createCategory({ name: category.name })),
    ).resolves.toEqual(category);
    expect(
      spies.menuAdminDataAccessServiceMock.createCategory,
    ).toHaveBeenCalledWith({ name: category.name });
  });

  it('should update a category', async () => {
    const category = Arrange.createCategory();
    const spies = Arrange.createSpies();
    spies.menuAdminDataAccessServiceMock.updateCategory.mockReturnValue(
      of(category),
    );
    const service = Arrange.setup(spies);

    await expect(
      firstValueFrom(
        service.updateCategory(category.id, { name: category.name }),
      ),
    ).resolves.toEqual(category);
    expect(
      spies.menuAdminDataAccessServiceMock.updateCategory,
    ).toHaveBeenCalledWith(category.id, { name: category.name });
  });

  it('should delete a category', async () => {
    const spies = Arrange.createSpies();
    const service = Arrange.setup(spies);

    await firstValueFrom(service.deleteCategory('c-salads'));

    expect(
      spies.menuAdminDataAccessServiceMock.deleteCategory,
    ).toHaveBeenCalledWith('c-salads');
  });

  it('should create a dish', async () => {
    const dish = Arrange.createDish();
    const request = Arrange.createDishRequest();
    const spies = Arrange.createSpies();
    spies.menuAdminDataAccessServiceMock.createDish.mockReturnValue(of(dish));
    const service = Arrange.setup(spies);

    await expect(firstValueFrom(service.createDish(request))).resolves.toEqual(
      dish,
    );
    expect(
      spies.menuAdminDataAccessServiceMock.createDish,
    ).toHaveBeenCalledWith(request);
  });

  it('should update a dish', async () => {
    const dish = Arrange.createDish();
    const spies = Arrange.createSpies();
    spies.menuAdminDataAccessServiceMock.updateDish.mockReturnValue(of(dish));
    const service = Arrange.setup(spies);

    await expect(
      firstValueFrom(service.updateDish(dish.id, { available: false })),
    ).resolves.toEqual(dish);
    expect(
      spies.menuAdminDataAccessServiceMock.updateDish,
    ).toHaveBeenCalledWith(dish.id, { available: false });
  });

  it('should delete a dish', async () => {
    const spies = Arrange.createSpies();
    const service = Arrange.setup(spies);

    await firstValueFrom(service.deleteDish('d-caesar'));

    expect(
      spies.menuAdminDataAccessServiceMock.deleteDish,
    ).toHaveBeenCalledWith('d-caesar');
  });
});

interface Spies {
  menuAdminDataAccessServiceMock: {
    createCategory: Mock;
    updateCategory: Mock;
    deleteCategory: Mock;
    createDish: Mock;
    updateDish: Mock;
    deleteDish: Mock;
  };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MenuAdminDataAccessService,
          useValue: spies.menuAdminDataAccessServiceMock,
        },
      ],
    });

    return TestBed.inject(MenuAdminDomainService);
  },

  createSpies(): Spies {
    return {
      menuAdminDataAccessServiceMock: {
        createCategory: vi.fn(),
        updateCategory: vi.fn(),
        deleteCategory: vi.fn().mockReturnValue(of(undefined)),
        createDish: vi.fn(),
        updateDish: vi.fn(),
        deleteDish: vi.fn().mockReturnValue(of(undefined)),
      } satisfies Mocked<
        Pick<
          MenuAdminDataAccessService,
          | 'createCategory'
          | 'updateCategory'
          | 'deleteCategory'
          | 'createDish'
          | 'updateDish'
          | 'deleteDish'
        >
      >,
    };
  },

  createCategory(): CategoryDomainModel {
    return { id: 'c-salads', name: 'Salads' };
  },

  createDish(): DishDomainModel {
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

  createDishRequest(): CreateDishDomainModel {
    const {
      categoryId,
      name,
      description,
      photoUrl,
      price,
      isOpenPrice,
      available,
    } = Arrange.createDish();

    return {
      categoryId,
      name,
      description,
      photoUrl,
      price,
      isOpenPrice,
      available,
    };
  },
};
