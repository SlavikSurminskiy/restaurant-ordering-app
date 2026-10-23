import type {
  Dish,
  Category,
  DiscountResponse,
} from '@restaurant/shared-api-types';

export type DiscountDomainModel = DiscountResponse;

export interface MenuSectionDomainModel {
  category: Category;
  dishes: Dish[];
}

export interface MenuDomainModel {
  sections: MenuSectionDomainModel[];
}
