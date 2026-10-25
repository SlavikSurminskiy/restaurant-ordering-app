import { inject, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { OpenPriceDialog } from './open-price-dialog';
import {
  OpenPriceDialogData,
  OpenPriceDialogResult,
} from './open-price-dialog.models';

@Service()
export class OpenPriceDialogOpenerService {
  #dialog = inject(MatDialog);

  openDialog(dialogData: OpenPriceDialogData) {
    return this.#dialog
      .open<OpenPriceDialog, OpenPriceDialogData, OpenPriceDialogResult>(
        OpenPriceDialog,
        { data: dialogData },
      )
      .afterClosed();
  }
}
