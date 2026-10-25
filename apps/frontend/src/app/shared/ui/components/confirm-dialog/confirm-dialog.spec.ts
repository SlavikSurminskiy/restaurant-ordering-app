import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { ConfirmDialog } from './confirm-dialog';
import { ConfirmDialogData } from './confirm-dialog.models';

describe(ConfirmDialog.name, () => {
  it('should show the title', async () => {
    const { renderResult } = await Arrange.setup();

    expect(
      renderResult.getByRole('heading', { name: 'Delete dish' }),
    ).toBeTruthy();
  });

  it('should show the message', async () => {
    const { renderResult } = await Arrange.setup();

    expect(renderResult.getByText('Delete "Chicken Caesar"?')).toBeTruthy();
  });

  it('should close with true when confirmed', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(spies);

    await user.click(renderResult.getByRole('button', { name: 'Delete' }));

    expect(spies.dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should close without a result when cancelled', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(spies);

    await user.click(renderResult.getByRole('button', { name: 'Cancel' }));

    expect(spies.dialogRefMock.close).toHaveBeenCalledOnce();
    expect(spies.dialogRefMock.close).not.toHaveBeenCalledWith(true);
  });
});

interface Spies {
  dialogRefMock: { close: Mock };
}

const Arrange = {
  async setup(spies?: Spies) {
    const renderResult = await render(ConfirmDialog, {
      providers: [
        {
          provide: MatDialogRef,
          useValue: spies?.dialogRefMock ?? Arrange.createSpies().dialogRefMock,
        },
        { provide: MAT_DIALOG_DATA, useValue: Arrange.createData() },
      ],
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return {
      dialogRefMock: { close: vi.fn() },
    };
  },

  createData(): ConfirmDialogData {
    return {
      title: 'Delete dish',
      message: 'Delete "Chicken Caesar"?',
      confirmLabel: 'Delete',
    };
  },
};
