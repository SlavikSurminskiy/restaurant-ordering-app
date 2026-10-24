import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { UserRole } from '@restaurant/shared-api-types';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe(CategoriesController.name, () => {
  it('should check the token and the role', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CategoriesController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('should be open to admins only', () => {
    expect(new Reflector().get(Roles, CategoriesController)).toEqual([
      UserRole.Admin,
    ]);
  });

  it('should create a category', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);

    await controller.create({ name: 'Soups' });

    expect(spies.categoriesServiceMock.create).toHaveBeenCalledWith({
      name: 'Soups',
    });
  });

  it('should update a category', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);

    await controller.update(Arrange.id, { name: 'Salads' });

    expect(spies.categoriesServiceMock.update).toHaveBeenCalledWith(
      Arrange.id,
      { name: 'Salads' },
    );
  });

  it('should delete a category', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);

    await controller.delete(Arrange.id);

    expect(spies.categoriesServiceMock.delete).toHaveBeenCalledWith(Arrange.id);
  });
});

interface Spies {
  categoriesServiceMock: { create: Mock; update: Mock; delete: Mock };
}

const Arrange = {
  id: '0b9c6a3e-4f4f-4d8e-9a57-5f3a3c1f2b10',

  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: spies.categoriesServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    return moduleRef.get(CategoriesController);
  },

  createSpies(): Spies {
    return {
      categoriesServiceMock: {
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue(undefined),
      },
    };
  },
};
