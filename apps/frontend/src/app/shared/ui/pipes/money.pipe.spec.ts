import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it.each([
    [1250, '$12.50'],
    [5, '$0.05'],
    [0, '$0.00'],
    [123456, '$1,234.56'],
  ])('formats %d cents as %s', (cents, expected) => {
    expect(pipe.transform(cents)).toBe(expected);
  });
});
