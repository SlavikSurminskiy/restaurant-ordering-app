import { OrderConflictReason } from '@restaurant/shared-api-types';

import { CartWarning } from './cart-warning.models';
import { CartWarningPipe } from './cart-warning.pipe';

describe(CartWarningPipe.name, () => {
  it('should name the new price', () => {
    expect(
      new CartWarningPipe().transform(
        Arrange.createWarning(OrderConflictReason.PriceChanged, 1490),
      ),
    ).toBe('Chicken Caesar now costs $14.90.');
  });

  it('should say a dish is not available', () => {
    expect(
      new CartWarningPipe().transform(
        Arrange.createWarning(OrderConflictReason.Unavailable),
      ),
    ).toBe('Chicken Caesar is not available right now.');
  });

  it('should say a dish left the menu', () => {
    expect(
      new CartWarningPipe().transform(
        Arrange.createWarning(OrderConflictReason.Removed),
      ),
    ).toBe('Chicken Caesar is no longer on the menu.');
  });
});

const Arrange = {
  createWarning(
    reason: OrderConflictReason,
    currentPrice: number | null = null,
  ): CartWarning {
    return { dishId: 'd-caesar', name: 'Chicken Caesar', reason, currentPrice };
  },
};
