import { Component, inject, signal } from '@angular/core';
import {
  form,
  pattern,
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';

import { errorMessage } from '../../../core/http/api-error';
import { MenuAdminDomainService } from '../../../shared/domain/menu-admin/menu-admin-domain.service';
import { NOT_BLANK } from '../setup-menu.constants';
import { SetupMenuStore } from '../setup-menu-store/setup-menu.store';

import { CategoryDialogData } from './category-dialog.models';

@Component({
  selector: 'app-category-dialog',
  imports: [
    FormRoot,
    FormField,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './category-dialog.html',
  styleUrl: './category-dialog.scss',
})
export class CategoryDialog {
  readonly #dialogRef = inject(MatDialogRef<CategoryDialog>);
  readonly #store = inject(SetupMenuStore);
  readonly #menuAdminDomainService = inject(MenuAdminDomainService);

  protected readonly data = inject<CategoryDialogData>(MAT_DIALOG_DATA);

  readonly #category = signal({ name: this.data.category?.name ?? '' });

  protected readonly form = form(
    this.#category,
    (category) => {
      required(category.name);
      pattern(category.name, NOT_BLANK);
    },
    { submission: { action: () => this.#save() } },
  );

  protected readonly error = signal<string | null>(null);

  async #save() {
    this.error.set(null);

    const name = this.#category().name.trim();
    const { category } = this.data;

    const request$ = category
      ? this.#menuAdminDomainService.updateCategory(category.id, { name })
      : this.#menuAdminDomainService.createCategory({ name });

    try {
      this.#store.upsertCategory(await firstValueFrom(request$));
      this.#dialogRef.close();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
