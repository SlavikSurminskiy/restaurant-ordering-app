import { calculateTotals } from './order-totals';

describe('calculateTotals', () => {
  it('should add up the items and take off the discount', () => {
    expect(
      calculateTotals(
        [
          { unitPrice: 1250, quantity: 2 },
          { unitPrice: 990, quantity: 1 },
        ],
        500,
      ),
    ).toEqual({ subtotal: 3490, discount: 500, total: 2990 });
  });

  it('should not take the total below zero', () => {
    expect(calculateTotals([{ unitPrice: 300, quantity: 1 }], 500)).toEqual({
      subtotal: 300,
      discount: 300,
      total: 0,
    });
  });

  it('should give zero totals for no items', () => {
    expect(calculateTotals([], 500)).toEqual({
      subtotal: 0,
      discount: 0,
      total: 0,
    });
  });
});
