import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatSlideToggleChange,
  MatSlideToggleModule,
} from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  DishDomainModel,
  CategoryDomainModel,
} from '../../../shared/domain/menu-admin/menu-admin-domain.models';
import { MoneyPipe } from '../../../shared/ui/pipes/money.pipe';

import { DishAvailableChange } from './menu-category.models';

@Component({
  selector: 'app-menu-category',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSlideToggleModule,

    MoneyPipe,
  ],
  templateUrl: './menu-category.html',
  styleUrl: './menu-category.scss',
  host: {
    role: 'region',
    '[attr.aria-label]': 'category().name',
  },
})
export class MenuCategory {
  readonly category = input.required<CategoryDomainModel>();
  readonly dishes = input.required<DishDomainModel[]>();

  readonly editCategory = output();
  readonly deleteCategory = output();
  readonly addDish = output();
  readonly editDish = output<DishDomainModel>();
  readonly deleteDish = output<DishDomainModel>();
  readonly availableChange = output<DishAvailableChange>();

  protected toggleAvailable(
    dish: DishDomainModel,
    { source, checked }: MatSlideToggleChange,
  ): void {
    source.checked = dish.available;
    this.availableChange.emit({ dish, available: checked });
  }
}
