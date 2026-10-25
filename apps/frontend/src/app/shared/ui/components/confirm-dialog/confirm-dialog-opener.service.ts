import { inject, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { ConfirmDialog } from './confirm-dialog';
import {
  ConfirmDialogData,
  ConfirmDialogResult,
} from './confirm-dialog.models';

@Service()
export class ConfirmDialogOpenerService {
  #dialog = inject(MatDialog);

  openDialog(dialogData: ConfirmDialogData) {
    return this.#dialog
      .open<ConfirmDialog, ConfirmDialogData, ConfirmDialogResult>(
        ConfirmDialog,
        {
          data: dialogData,
          position: {
            top: '100px',
          },
        },
      )
      .afterClosed();
  }
}
