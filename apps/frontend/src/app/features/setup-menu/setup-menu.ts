import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, switchMap } from 'rxjs';

import { MenuDomainService } from '@restaurant/frontend/domain/menu';
import {
  DishDomainModel,
  CategoryDomainModel,
  MenuAdminDomainService,
} from '@restaurant/frontend/domain/menu-admin';
import { ConfirmDialogOpenerService } from '@restaurant/frontend/ui';
import { errorMessage } from '@restaurant/frontend/core/http';

import { CategoryDialogOpenerService } from './category-dialog/category-dialog-opener.service';
import { DishDialogOpenerService } from './dish-dialog/dish-dialog-opener.service';
import { DishDialogMode } from './dish-dialog/dish-dialog.models';
import { MenuCategory } from './menu-category/menu-category';
import { DishAvailableChange } from './menu-category/menu-category.models';
import { SetupMenuStore } from './setup-menu-store/setup-menu.store';
import { SetupMenuStoreService } from './setup-menu-store/setup-menu-store.service';

@Component({
  selector: 'app-setup-menu',
  imports: [MatIconModule, MatButtonModule, MatProgressBarModule, MenuCategory],
  templateUrl: './setup-menu.html',
  styleUrl: './setup-menu.scss',
  // The dialog openers are provided here, so their dialogs share this page's SetupMenuStore.
  providers: [
    SetupMenuStore,
    SetupMenuStoreService,
    DishDialogOpenerService,
    CategoryDialogOpenerService,
  ],
})
export class SetupMenu {
  readonly #snackBar = inject(MatSnackBar);
  readonly #confirmDialogOpener = inject(ConfirmDialogOpenerService);
  readonly #categoryDialogOpener = inject(CategoryDialogOpenerService);
  readonly #dishDialogOpener = inject(DishDialogOpenerService);
  readonly #menuDomainService = inject(MenuDomainService);
  readonly #menuAdminDomainService = inject(MenuAdminDomainService);

  protected readonly store = inject(SetupMenuStore);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.loadMenu();
  }

  protected loadMenu(): void {
    this.loading.set(true);
    this.error.set(null);

    this.#menuDomainService.getMenu().subscribe({
      next: (menu) => {
        this.store.setMenu(menu);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected addCategory(): void {
    this.#categoryDialogOpener.openDialog({ category: null });
  }

  protected editCategory(category: CategoryDomainModel): void {
    this.#categoryDialogOpener.openDialog({ category });
  }

  protected deleteCategory(category: CategoryDomainModel): void {
    this.#confirmDialogOpener
      .openDialog({
        title: 'Delete category',
        message: `Delete "${category.name}"?`,
        confirmLabel: 'Delete',
      })
      .pipe(
        filter(Boolean),
        switchMap(() =>
          this.#menuAdminDomainService.deleteCategory(category.id),
        ),
      )
      .subscribe({
        next: () => this.store.removeCategory(category.id),
        error: (error) => this.#showError(error),
      });
  }

  protected addDish(category: CategoryDomainModel): void {
    this.#dishDialogOpener.openDialog({
      mode: DishDialogMode.Create,
      categoryId: category.id,
    });
  }

  protected editDish(dish: DishDomainModel): void {
    this.#dishDialogOpener.openDialog({ mode: DishDialogMode.Edit, dish });
  }

  protected setAvailable({ dish, available }: DishAvailableChange): void {
    this.#menuAdminDomainService.updateDish(dish.id, { available }).subscribe({
      next: (updated) => this.store.upsertDish(updated),
      error: (error) => this.#showError(error),
    });
  }

  protected deleteDish(dish: DishDomainModel): void {
    this.#confirmDialogOpener
      .openDialog({
        title: 'Delete dish',
        message: `Delete "${dish.name}"? It disappears from the menu for everyone.`,
        confirmLabel: 'Delete',
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this.#menuAdminDomainService.deleteDish(dish.id)),
      )
      .subscribe({
        next: () => this.store.removeDish(dish.id),
        error: (error) => this.#showError(error),
      });
  }

  #showError(error: unknown): void {
    this.#snackBar.open(errorMessage(error), 'Close', { duration: 5000 });
  }
}
