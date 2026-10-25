import type {
  Dish,
  Category,
  UpdateDishRequest,
  CreateDishRequest,
  UpdateCategoryRequest,
  CreateCategoryRequest,
} from '@restaurant/shared-api-types';

export type CategoryDomainModel = Category;

export type DishDomainModel = Dish;

export type CreateCategoryDomainModel = CreateCategoryRequest;

export type UpdateCategoryDomainModel = UpdateCategoryRequest;

export type CreateDishDomainModel = CreateDishRequest;

export type UpdateDishDomainModel = UpdateDishRequest;
