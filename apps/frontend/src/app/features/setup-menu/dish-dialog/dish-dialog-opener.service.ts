import { inject, Injector, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { DishDialog } from './dish-dialog';
import { DishDialogData } from './dish-dialog.models';

@Service()
export class DishDialogOpenerService {
  #dialog = inject(MatDialog);
  #injector = inject(Injector);

  openDialog(dialogData: DishDialogData) {
    return this.#dialog
      .open<DishDialog, DishDialogData, void>(DishDialog, {
        data: dialogData,
        maxHeight: '90vh',
        injector: this.#injector,
      })
      .afterClosed();
  }
}
