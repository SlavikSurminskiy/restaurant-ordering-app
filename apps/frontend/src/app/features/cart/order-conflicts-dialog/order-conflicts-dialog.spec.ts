import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { OrderConflictReason } from '@restaurant/shared-api-types';

import { OrderConflictsDialog } from './order-conflicts-dialog';
import { OrderConflictsDialogData } from './order-conflicts-dialog.models';

describe(OrderConflictsDialog.name, () => {
  it('should list what changed', async () => {
    const { renderResult } = await Arrange.setup();

    const items = renderResult
      .getAllByRole('listitem')
      .map((item) => item.textContent?.trim());

    expect(items).toEqual([
      expect.stringContaining('Chicken Caesar now costs $14.90.'),
      expect.stringContaining('Tomato soup is no longer on the menu.'),
    ]);
  });

  it('should close with true to update the cart', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(spies);

    await user.click(renderResult.getByRole('button', { name: 'Update cart' }));

    expect(spies.dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should close with false to go back to the cart', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(spies);

    await user.click(
      renderResult.getByRole('button', { name: 'Back to cart' }),
    );

    expect(spies.dialogRefMock.close).toHaveBeenCalledWith(false);
  });
});

interface Spies {
  dialogRefMock: { close: Mock };
}

const Arrange = {
  async setup(spies?: Spies) {
    const data: OrderConflictsDialogData = {
      warnings: [
        {
          dishId: 'd-caesar',
          name: 'Chicken Caesar',
          reason: OrderConflictReason.PriceChanged,
          currentPrice: 1490,
        },
        {
          dishId: 'd-soup',
          name: 'Tomato soup',
          reason: OrderConflictReason.Removed,
          currentPrice: null,
        },
      ],
    };

    const renderResult = await render(OrderConflictsDialog, {
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
