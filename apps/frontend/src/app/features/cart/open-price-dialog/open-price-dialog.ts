import { Component, inject, signal } from '@angular/core';
import {
  form,
  max,
  min,
  required,
  FormField,
  FormRoot,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  MAX_OPEN_PRICE_DOLLARS,
  MIN_OPEN_PRICE_DOLLARS,
} from './open-price-dialog.constants';

import {
  OpenPriceDialogData,
  OpenPriceDialogResult,
} from './open-price-dialog.models';

@Component({
  selector: 'app-open-price-dialog',
  imports: [
    FormRoot,
    FormField,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
  ],
  templateUrl: './open-price-dialog.html',
  styleUrl: './open-price-dialog.scss',
})
export class OpenPriceDialog {
  readonly #dialogRef =
    inject<MatDialogRef<OpenPriceDialog, OpenPriceDialogResult>>(MatDialogRef);

  protected readonly data = inject<OpenPriceDialogData>(MAT_DIALOG_DATA);

  protected readonly MIN_OPEN_PRICE_DOLLARS = MIN_OPEN_PRICE_DOLLARS;
  protected readonly MAX_OPEN_PRICE_DOLLARS = MAX_OPEN_PRICE_DOLLARS;

  /** The form works in dollars; the cart works in cents. */
  readonly #price = signal({
    price: this.data.unitPrice === null ? null : this.data.unitPrice / 100,
  });

  protected readonly form = form(
    this.#price,
    (value) => {
      required(value.price);
      min(value.price, MIN_OPEN_PRICE_DOLLARS);
      max(value.price, MAX_OPEN_PRICE_DOLLARS);
    },
    { submission: { action: async () => this.#confirm() } },
  );

  #confirm(): void {
    const { price } = this.#price();

    if (price !== null) {
      this.#dialogRef.close(Math.round(price * 100));
    }
  }
}
