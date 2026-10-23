import { Money } from './money';

export interface Category {
  id: string;
  name: string;
}

export interface Dish {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  photoUrl: string | null;
  /** `null` only for open-price dishes: the customer enters the price. */
  price: Money | null;
  isOpenPrice: boolean;
  available: boolean;
}

export interface MenuResponse {
  categories: Category[];
  dishes: Dish[];
}
