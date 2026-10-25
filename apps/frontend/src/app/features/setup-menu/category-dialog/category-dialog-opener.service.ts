import { inject, Injector, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { CategoryDialog } from './category-dialog';
import { CategoryDialogData } from './category-dialog.models';

@Service()
export class CategoryDialogOpenerService {
  #dialog = inject(MatDialog);
  #injector = inject(Injector);

  openDialog(dialogData: CategoryDialogData) {
    return this.#dialog
      .open<CategoryDialog, CategoryDialogData, void>(CategoryDialog, {
        data: dialogData,
        injector: this.#injector,
      })
      .afterClosed();
  }
}
