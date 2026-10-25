import type {
  Dish,
  Category,
  DiscountResponse,
  MenuResponse,
} from '@restaurant/shared-api-types';

export type DiscountDomainModel = DiscountResponse;

export type MenuDomainModel = MenuResponse;

export interface MenuSectionDomainModel {
  category: Category;
  dishes: Dish[];
}
