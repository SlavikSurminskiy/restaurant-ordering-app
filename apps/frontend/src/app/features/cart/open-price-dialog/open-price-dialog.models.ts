import { Money } from '@restaurant/shared-api-types';

export interface OpenPriceDialogData {
  dishName: string;
  unitPrice: Money | null;
}

export type OpenPriceDialogResult = Money | undefined;
