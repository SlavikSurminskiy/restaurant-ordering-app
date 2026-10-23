import { Component, computed, input } from '@angular/core';

import { MENU_ROW_HEIGHT } from '../menu.constants';

const DEFAULT_ROWS = 5;

@Component({
  selector: 'app-dish-skeleton',
  templateUrl: './dish-skeleton.html',
  styleUrl: './dish-skeleton.scss',
  host: {
    class: 'dish-skeleton',
    'aria-hidden': 'true',
  },
})
export class DishSkeleton {
  readonly rows = input(DEFAULT_ROWS);

  protected readonly rowHeight = MENU_ROW_HEIGHT;

  protected readonly rowIndexes = computed(() =>
    Array.from({ length: this.rows() }, (_, i) => i),
  );
}
