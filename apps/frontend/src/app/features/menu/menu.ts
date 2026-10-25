import { signal, inject, computed, Component, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  ScrollingModule,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import {
  MatButtonToggleChange,
  MatButtonToggleModule,
} from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { auditTime, filter, map, of, startWith, switchMap } from 'rxjs';

import { Dish } from '@restaurant/shared-api-types';

import { CartStore } from '../cart/cart-store/cart.store';
import { OpenPriceDialogOpenerService } from '../cart/open-price-dialog/open-price-dialog-opener.service';

import { DishCard } from './dish-card/dish-card';
import { DishSkeleton } from './dish-skeleton/dish-skeleton';
import { MENU_ROW_HEIGHT } from './menu.constants';
import { MenuRow, MenuRowKind } from './menu.models';
import { MenuService } from './menu.service';
import { LoadStatus } from './menu-store/menu-store.enums';
import { MenuStore } from './menu-store/menu.store';

@Component({
  selector: 'app-menu',
  imports: [
    MatIconModule,
    MatInputModule,
    ScrollingModule,
    MatFormFieldModule,
    MatButtonToggleModule,

    DishCard,
    DishSkeleton,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
  providers: [MenuService],
})
export class Menu {
  readonly #menuService = inject(MenuService);
  readonly #cartStore = inject(CartStore);
  readonly #openPriceDialogOpener = inject(OpenPriceDialogOpenerService);

  protected readonly store = inject(MenuStore);

  protected readonly LoadStatus = LoadStatus;
  protected readonly MenuRowKind = MenuRowKind;
  protected readonly MENU_ROW_HEIGHT = MENU_ROW_HEIGHT;

  readonly viewport = viewChild(CdkVirtualScrollViewport);

  protected searchQuery = signal('');

  protected firstVisibleIndex = signal(0);

  protected categories = computed(() =>
    this.visibleMenuRows().flatMap((row) =>
      row.kind === MenuRowKind.Category ? [row.category] : [],
    ),
  );

  protected visibleMenuRows = computed(() => {
    const search = this.searchQuery();

    return this.#menuService.isSearchActive(search)
      ? this.#menuService.buildFlatMenuRows(
          this.#menuService.filterSections(this.store.sections(), search),
        )
      : this.#menuRows();
  });

  protected activeCategoryId = computed(() => {
    if (this.#scrolledToEnd()) {
      return this.categories().at(-1)?.id ?? null;
    }

    const row = this.visibleMenuRows()[this.firstVisibleIndex()];

    return row ? this.#menuService.rowCategoryId(row) : null;
  });

  protected search(value: string): void {
    this.searchQuery.set(value);
    this.#scrollToTop();
  }

  protected onCategoryChange({ source, value }: MatButtonToggleChange): void {
    source.checked = value === this.activeCategoryId();
    this.#scrollToCategory(value);
  }

  protected addToCart({ id, name, price, isOpenPrice }: Dish): void {
    if (!isOpenPrice && price !== null) {
      this.#cartStore.add({ dishId: id, name, unitPrice: price });
    } else {
      this.#openPriceDialogOpener
        .openDialog({ dishName: name, unitPrice: null })
        .pipe(filter((unitPrice) => unitPrice !== undefined))
        .subscribe((unitPrice) =>
          this.#cartStore.add({ dishId: id, name, unitPrice }),
        );
    }
  }

  protected trackRow = (_: number, row: MenuRow) =>
    this.#menuService.rowKey(row);

  #scrolledToEnd = toSignal(
    toObservable(this.viewport).pipe(
      switchMap((viewport) =>
        viewport
          ? viewport.elementScrolled().pipe(
              auditTime(100),
              map(() => this.#isScrolledToEnd(viewport)),
              startWith(false),
            )
          : of(false),
      ),
    ),
    { initialValue: false },
  );

  #menuRows = computed(() =>
    this.#menuService.buildFlatMenuRows(this.store.sections()),
  );

  #scrollToTop(): void {
    this.viewport()?.scrollToIndex(0);
  }

  #scrollToCategory(categoryId: string) {
    const index = this.visibleMenuRows().findIndex(
      (row) =>
        row.kind === MenuRowKind.Category && row.category.id === categoryId,
    );

    this.viewport()?.scrollToIndex(index, 'smooth');
  }

  #isScrolledToEnd(viewport: CdkVirtualScrollViewport) {
    return (
      viewport.measureScrollOffset('top') > 0 &&
      viewport.measureScrollOffset('bottom') < 1
    );
  }
}
