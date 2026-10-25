import { inject, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { OrderConflictsDialog } from './order-conflicts-dialog';
import {
  OrderConflictsDialogData,
  OrderConflictsDialogResult,
} from './order-conflicts-dialog.models';

@Service()
export class OrderConflictsDialogOpenerService {
  #dialog = inject(MatDialog);

  openDialog(dialogData: OrderConflictsDialogData) {
    return this.#dialog
      .open<
        OrderConflictsDialog,
        OrderConflictsDialogData,
        OrderConflictsDialogResult
      >(OrderConflictsDialog, { data: dialogData })
      .afterClosed();
  }
}
