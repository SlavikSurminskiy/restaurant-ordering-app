import type {
  Dish,
  Category,
  MenuEvent,
  MenuResponse,
  DiscountResponse,
} from '@restaurant/shared-api-types';
import { LiveResourceUpdate } from '@restaurant/frontend/domain/sse';

export type DiscountDomainModel = DiscountResponse;

export type MenuDomainModel = MenuResponse;

export interface MenuSectionDomainModel {
  category: Category;
  dishes: Dish[];
}

export type MenuStreamUpdate = LiveResourceUpdate<MenuDomainModel, MenuEvent>;
