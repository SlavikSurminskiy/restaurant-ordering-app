import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { UserRole } from '@restaurant/shared-api-types';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

import { DishesController } from './dishes.controller';
import { DishesService } from './dishes.service';

describe(DishesController.name, () => {
  it('should check the token and the role', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, DishesController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('should be open to admins only', () => {
    expect(new Reflector().get(Roles, DishesController)).toEqual([
      UserRole.Admin,
    ]);
  });

  it('should create a dish', async () => {
    const request = {
      categoryId: Arrange.categoryId,
      name: 'Borscht',
      price: 13500,
      isOpenPrice: false,
    };
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);

    await controller.create(request);

    expect(spies.dishesServiceMock.create).toHaveBeenCalledWith(request);
  });

  it('should update a dish', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);

    await controller.update(Arrange.dishId, { available: false });

    expect(spies.dishesServiceMock.update).toHaveBeenCalledWith(
      Arrange.dishId,
      { available: false },
    );
  });

  it('should delete a dish', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);

    await controller.delete(Arrange.dishId);

    expect(spies.dishesServiceMock.delete).toHaveBeenCalledWith(Arrange.dishId);
  });
});

interface Spies {
  dishesServiceMock: { create: Mock; update: Mock; delete: Mock };
}

const Arrange = {
  categoryId: '0b9c6a3e-4f4f-4d8e-9a57-5f3a3c1f2b10',
  dishId: '7d2f1c84-1e7b-4a59-8c39-2b6e9f0d4a21',

  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      controllers: [DishesController],
      providers: [
        { provide: DishesService, useValue: spies.dishesServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    return moduleRef.get(DishesController);
  },

  createSpies(): Spies {
    return {
      dishesServiceMock: {
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue(undefined),
      },
    };
  },
};
