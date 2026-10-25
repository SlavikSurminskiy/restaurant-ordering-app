import { Service } from '@angular/core';

import { CreateDishDomainModel } from '@restaurant/frontend/domain/menu-admin';

import {
  DishDialogData,
  DishDialogMode,
  DishFormValue,
} from './dish-dialog.models';

@Service()
export class DishDialogService {
  toFormValue(data: DishDialogData): DishFormValue {
    if (data.mode === DishDialogMode.Create) {
      return {
        categoryId: data.categoryId,
        name: '',
        description: '',
        photoUrl: '',
        isOpenPrice: false,
        price: null,
        available: true,
      };
    }

    const { dish } = data;

    return {
      categoryId: dish.categoryId,
      name: dish.name,
      description: dish.description,
      photoUrl: dish.photoUrl ?? '',
      isOpenPrice: dish.isOpenPrice,
      price: dish.price === null ? null : dish.price / 100,
      available: dish.available,
    };
  }

  toRequest(value: DishFormValue): CreateDishDomainModel {
    return {
      categoryId: value.categoryId,
      name: value.name.trim(),
      description: value.description.trim(),
      photoUrl: value.photoUrl.trim() || null,
      isOpenPrice: value.isOpenPrice,
      price:
        value.isOpenPrice || value.price === null
          ? null
          : Math.round(value.price * 100),
      available: value.available,
    };
  }
}
