import { CartWarning } from '../cart-warning/cart-warning.models';

export interface OrderConflictsDialogData {
  warnings: CartWarning[];
}

export type OrderConflictsDialogResult = boolean | undefined;
