import { DishDomainModel } from '@restaurant/frontend/domain/menu-admin';

export const DishDialogMode = {
  Create: 'create',
  Edit: 'edit',
} as const;

export type DishDialogMode =
  (typeof DishDialogMode)[keyof typeof DishDialogMode];

export type DishDialogData =
  | { mode: typeof DishDialogMode.Create; categoryId: string }
  | { mode: typeof DishDialogMode.Edit; dish: DishDomainModel };

/** The form works in dollars; the API works in cents. */
export interface DishFormValue {
  categoryId: string;
  name: string;
  description: string;
  photoUrl: string;
  isOpenPrice: boolean;
  price: number | null;
  available: boolean;
}
