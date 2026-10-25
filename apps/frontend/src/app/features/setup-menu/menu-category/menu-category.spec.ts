import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import {
  CategoryDomainModel,
  DishDomainModel,
} from '../../../shared/domain/menu-admin/menu-admin-domain.models';

import { MenuCategory } from './menu-category';

describe(MenuCategory.name, () => {
  it('should show the category name', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createDishes());

    expect(renderResult.getByRole('heading', { name: 'Salads' })).toBeTruthy();
  });

  it('should show the dishes with their prices', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createDishes());

    const text = renderResult.container.textContent;

    expect(text).toContain('Chicken Caesar');
    expect(text).toContain('$12.50');
    expect(text).toContain('Chef special');
    expect(text).toContain('Open price');
  });

  it('should say when the category has no dishes', async () => {
    const { renderResult } = await Arrange.setup([]);

    expect(renderResult.getByText('No dishes yet.')).toBeTruthy();
  });

  it('should not let a category with dishes be deleted', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createDishes());

    expect(
      renderResult
        .getByRole('button', { name: 'Delete Salads' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  describe('category actions', () => {
    it('should report a click on edit', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup([], spies);

      await user.click(
        renderResult.getByRole('button', { name: 'Edit Salads' }),
      );

      expect(spies.editCategory).toHaveBeenCalledOnce();
    });

    it('should report a click on delete', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup([], spies);

      await user.click(
        renderResult.getByRole('button', { name: 'Delete Salads' }),
      );

      expect(spies.deleteCategory).toHaveBeenCalledOnce();
    });

    it('should report a click on new dish', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup([], spies);

      await user.click(
        renderResult.getByRole('button', { name: 'New dish in Salads' }),
      );

      expect(spies.addDish).toHaveBeenCalledOnce();
    });
  });

  describe('dish actions', () => {
    it('should report the dish to edit', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const [caesar] = Arrange.createDishes();
      const { renderResult } = await Arrange.setup([caesar], spies);

      await user.click(
        renderResult.getByRole('button', { name: 'Edit Chicken Caesar' }),
      );

      expect(spies.editDish).toHaveBeenCalledWith(caesar);
    });

    it('should report the dish to delete', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const [caesar] = Arrange.createDishes();
      const { renderResult } = await Arrange.setup([caesar], spies);

      await user.click(
        renderResult.getByRole('button', { name: 'Delete Chicken Caesar' }),
      );

      expect(spies.deleteDish).toHaveBeenCalledWith(caesar);
    });

    it('should report the new availability of a dish', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const [caesar] = Arrange.createDishes();
      const { renderResult } = await Arrange.setup([caesar], spies);

      await user.click(
        renderResult.getByRole('switch', { name: 'Available: Chicken Caesar' }),
      );

      expect(spies.availableChange).toHaveBeenCalledWith({
        dish: caesar,
        available: false,
      });
    });

    it('should keep showing the stored availability until the dish changes', async () => {
      const user = Arrange.setupUser();
      const [caesar] = Arrange.createDishes();
      const { renderResult } = await Arrange.setup([caesar]);
      const toggle = renderResult.getByRole('switch', {
        name: 'Available: Chicken Caesar',
      });

      await user.click(toggle);

      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });
  });
});

interface Spies {
  editCategory: Mock;
  deleteCategory: Mock;
  addDish: Mock;
  editDish: Mock;
  deleteDish: Mock;
  availableChange: Mock;
}

const Arrange = {
  async setup(dishes: DishDomainModel[], spies?: Spies) {
    const renderResult = await render(MenuCategory, {
      inputs: { category: Arrange.createCategory(), dishes },
      on: spies ?? Arrange.createSpies(),
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return {
      editCategory: vi.fn(),
      deleteCategory: vi.fn(),
      addDish: vi.fn(),
      editDish: vi.fn(),
      deleteDish: vi.fn(),
      availableChange: vi.fn(),
    };
  },

  createCategory(): CategoryDomainModel {
    return { id: 'c-salads', name: 'Salads' };
  },

  createDishes(): DishDomainModel[] {
    return [
      {
        id: 'd-caesar',
        categoryId: 'c-salads',
        name: 'Chicken Caesar',
        description: '',
        photoUrl: null,
        price: 1250,
        isOpenPrice: false,
        available: true,
      },
      {
        id: 'd-special',
        categoryId: 'c-salads',
        name: 'Chef special',
        description: '',
        photoUrl: null,
        price: null,
        isOpenPrice: true,
        available: true,
      },
    ];
  },
};
