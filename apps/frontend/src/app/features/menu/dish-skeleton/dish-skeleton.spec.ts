import { render } from '@testing-library/angular';

import { DishSkeleton } from './dish-skeleton';

describe(DishSkeleton.name, () => {
  it('should render 5 rows by default', async () => {
    const { container } = await Arrange.setup();

    expect(Arrange.rows(container)).toHaveLength(5);
  });

  it('should render the number of rows from the rows input', async () => {
    const { container } = await Arrange.setup({ rows: 3 });

    expect(Arrange.rows(container)).toHaveLength(3);
  });

  it('should be hidden from screen readers', async () => {
    const { fixture } = await Arrange.setup();

    expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
  });
});

const Arrange = {
  setup(inputs: { rows?: number } = {}) {
    return render(DishSkeleton, { inputs });
  },

  rows(container: Element) {
    return container.querySelectorAll('.dish-skeleton__row');
  },
};
