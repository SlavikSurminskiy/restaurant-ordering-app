import { Component, inject, signal } from '@angular/core';
import {
  form,
  max,
  min,
  pattern,
  disabled,
  required,
  FormField,
  FormRoot,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { firstValueFrom } from 'rxjs';

import { MenuAdminDomainService } from '../../../shared/domain/menu-admin/menu-admin-domain.service';
import { errorMessage } from '../../../core/http/api-error';

import { MAX_PRICE_DOLLARS, NOT_BLANK } from '../setup-menu.constants';
import { SetupMenuStore } from '../setup-menu-store/setup-menu.store';

import { DishDialogData, DishDialogMode } from './dish-dialog.models';
import { DishDialogService } from './dish-dialog.service';

@Component({
  selector: 'app-dish-dialog',
  imports: [
    FormRoot,
    FormField,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dish-dialog.html',
  styleUrl: './dish-dialog.scss',
  providers: [DishDialogService],
})
export class DishDialog {
  readonly #dialogRef = inject(MatDialogRef<DishDialog>);
  readonly #dishDialogService = inject(DishDialogService);
  readonly #menuAdminDomainService = inject(MenuAdminDomainService);

  protected readonly store = inject(SetupMenuStore);
  readonly #data = inject<DishDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.#data.mode === DishDialogMode.Edit;

  readonly #dish = signal(this.#dishDialogService.toFormValue(this.#data));

  protected readonly form = form(
    this.#dish,
    (dish) => {
      required(dish.categoryId);
      required(dish.name);
      pattern(dish.name, NOT_BLANK);
      // An open-price dish has no price: the customer enters it.
      disabled(dish.price, {
        when: ({ valueOf }) => valueOf(dish.isOpenPrice),
      });
      required(dish.price);
      min(dish.price, 0);
      max(dish.price, MAX_PRICE_DOLLARS);
    },
    { submission: { action: () => this.#save() } },
  );

  protected readonly error = signal<string | null>(null);

  async #save() {
    this.error.set(null);

    const request = this.#dishDialogService.toRequest(this.#dish());
    const request$ =
      this.#data.mode === DishDialogMode.Edit
        ? this.#menuAdminDomainService.updateDish(this.#data.dish.id, request)
        : this.#menuAdminDomainService.createDish(request);

    try {
      this.store.upsertDish(await firstValueFrom(request$));
      this.#dialogRef.close();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
