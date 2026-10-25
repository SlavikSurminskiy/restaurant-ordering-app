import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { OpenPriceDialog } from './open-price-dialog';
import { OpenPriceDialogData } from './open-price-dialog.models';

describe(OpenPriceDialog.name, () => {
  it('should close with the entered price in cents', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(spies);

    await user.type(renderResult.getByLabelText('Price, $'), '12.5');
    await user.click(renderResult.getByRole('button', { name: 'Add to cart' }));

    expect(spies.dialogRefMock.close).toHaveBeenCalledWith(1250);
  });

  it('should not let an empty price be added', async () => {
    const { renderResult } = await Arrange.setup();

    expect(
      renderResult
        .getByRole('button', { name: 'Add to cart' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('should explain a price below the minimum and not let it be added', async () => {
    const user = Arrange.setupUser();
    const { renderResult } = await Arrange.setup();

    await user.type(renderResult.getByLabelText('Price, $'), '0');
    await user.tab();

    expect(
      renderResult.getByText('Enter a price from $0.01 to $10000.'),
    ).toBeTruthy();
    expect(
      renderResult
        .getByRole('button', { name: 'Add to cart' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('should show the price already in the cart', async () => {
    const { renderResult } = await Arrange.setup(undefined, {
      dishName: 'Chef special',
      unitPrice: 1999,
    });

    expect(
      (renderResult.getByLabelText('Price, $') as HTMLInputElement).value,
    ).toBe('19.99');
    expect(renderResult.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('should name the dish', async () => {
    const { renderResult } = await Arrange.setup();

    expect(
      renderResult.getByRole('heading', {
        name: 'Your price for Chef special',
      }),
    ).toBeTruthy();
  });
});

interface Spies {
  dialogRefMock: { close: Mock };
}

const Arrange = {
  async setup(
    spies?: Spies,
    data: OpenPriceDialogData = { dishName: 'Chef special', unitPrice: null },
  ) {
    const renderResult = await render(OpenPriceDialog, {
      providers: [
        {
          provide: MatDialogRef,
          useValue: spies?.dialogRefMock ?? Arrange.createSpies().dialogRefMock,
        },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return { dialogRefMock: { close: vi.fn() } };
  },
};
