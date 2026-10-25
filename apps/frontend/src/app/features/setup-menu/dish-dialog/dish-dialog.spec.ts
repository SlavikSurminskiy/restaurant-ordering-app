import { signal, WritableSignal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { render, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { NEVER, of, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import {
  CategoryDomainModel,
  DishDomainModel,
} from '../../../shared/domain/menu-admin/menu-admin-domain.models';
import { MenuAdminDomainService } from '../../../shared/domain/menu-admin/menu-admin-domain.service';
import { SetupMenuStore } from '../setup-menu-store/setup-menu.store';

import { DishDialog } from './dish-dialog';
import { DishDialogData, DishDialogMode } from './dish-dialog.models';

describe(DishDialog.name, () => {
  describe('new dish', () => {
    it('should create the dish in the chosen category with the price in cents', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(
        {
          mode: DishDialogMode.Create,
          categoryId: 'c-salads',
        },
        spies,
      );

      await user.type(renderResult.getByLabelText('Name'), 'Greek');
      await user.type(renderResult.getByLabelText('Price, $'), '9.9');
      await user.click(renderResult.getByRole('button', { name: 'Save' }));

      expect(spies.menuAdminDomainServiceMock.createDish).toHaveBeenCalledWith({
        categoryId: 'c-salads',
        name: 'Greek',
        description: '',
        photoUrl: null,
        isOpenPrice: false,
        price: 990,
        available: true,
      });
      expect(spies.setupStoreMock.upsertDish).toHaveBeenCalledWith(
        Arrange.createDish(),
      );
      expect(spies.dialogRefMock.close).toHaveBeenCalledOnce();
    });

    it('should not let an empty form be saved', async () => {
      const { renderResult } = await Arrange.setup({
        mode: DishDialogMode.Create,
        categoryId: 'c-salads',
      });

      expect(
        renderResult
          .getByRole('button', { name: 'Save' })
          .hasAttribute('disabled'),
      ).toBe(true);
    });

    it('should require a price unless the price is open', async () => {
      const user = Arrange.setupUser();
      const { renderResult } = await Arrange.setup({
        mode: DishDialogMode.Create,
        categoryId: 'c-salads',
      });

      await user.type(renderResult.getByLabelText('Name'), 'Greek');
      await user.click(renderResult.getByLabelText('Price, $'));
      await user.tab();

      expect(
        renderResult.getByText('Enter a price from 0 to 10,000.'),
      ).toBeTruthy();
      expect(
        renderResult
          .getByRole('button', { name: 'Save' })
          .hasAttribute('disabled'),
      ).toBe(true);
    });

    it('should show a spinner on the save button while saving', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.menuAdminDomainServiceMock.createDish.mockReturnValue(NEVER);
      const { renderResult } = await Arrange.setup(
        {
          mode: DishDialogMode.Create,
          categoryId: 'c-salads',
        },
        spies,
      );
      const save = renderResult.getByRole('button', { name: 'Save' });

      await user.type(renderResult.getByLabelText('Name'), 'Greek');
      await user.type(renderResult.getByLabelText('Price, $'), '9.9');
      await user.click(save);

      expect(
        within(save).getByRole('progressbar', { name: 'Saving' }),
      ).toBeTruthy();
      expect(save.hasAttribute('disabled')).toBe(true);
    });

    it('should create an open-price dish without a price', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(
        {
          mode: DishDialogMode.Create,
          categoryId: 'c-salads',
        },
        spies,
      );

      await user.type(renderResult.getByLabelText('Name'), 'Chef special');
      await user.click(
        renderResult.getByRole('checkbox', { name: /Open price/ }),
      );
      await user.click(renderResult.getByRole('button', { name: 'Save' }));

      expect(spies.menuAdminDomainServiceMock.createDish).toHaveBeenCalledWith(
        expect.objectContaining({ isOpenPrice: true, price: null }),
      );
    });
  });

  describe('existing dish', () => {
    it('should show the price in dollars', async () => {
      const { renderResult } = await Arrange.setup({
        mode: DishDialogMode.Edit,
        dish: Arrange.createDish(),
      });

      expect(renderResult.getByLabelText('Price, $')).toHaveProperty(
        'value',
        '12.5',
      );
    });

    it('should save the changed dish', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(
        {
          mode: DishDialogMode.Edit,
          dish: Arrange.createDish(),
        },
        spies,
      );

      await user.clear(renderResult.getByLabelText('Price, $'));
      await user.type(renderResult.getByLabelText('Price, $'), '13');
      await user.click(renderResult.getByRole('button', { name: 'Save' }));

      expect(spies.menuAdminDomainServiceMock.updateDish).toHaveBeenCalledWith(
        'd-caesar',
        expect.objectContaining({ name: 'Chicken Caesar', price: 1300 }),
      );
    });

    it('should stay open and explain when saving fails', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.menuAdminDomainServiceMock.updateDish.mockReturnValue(
        throwError(() => new Error('Failed')),
      );
      const { renderResult } = await Arrange.setup(
        {
          mode: DishDialogMode.Edit,
          dish: Arrange.createDish(),
        },
        spies,
      );

      await user.click(renderResult.getByRole('button', { name: 'Save' }));

      expect(spies.setupStoreMock.upsertDish).not.toHaveBeenCalled();
      expect(spies.dialogRefMock.close).not.toHaveBeenCalled();
      expect(renderResult.getByRole('alert').textContent).toContain(
        'Something went wrong. Please try again.',
      );
    });
  });
});

interface Spies {
  setupStoreMock: {
    categoryEntities: WritableSignal<CategoryDomainModel[]>;
    upsertDish: Mock;
  };
  menuAdminDomainServiceMock: { createDish: Mock; updateDish: Mock };
  dialogRefMock: { close: Mock };
}

const Arrange = {
  async setup(data: DishDialogData, spies?: Spies) {
    const { setupStoreMock, menuAdminDomainServiceMock, dialogRefMock } =
      spies ?? Arrange.createSpies();

    const renderResult = await render(DishDialog, {
      providers: [
        { provide: SetupMenuStore, useValue: setupStoreMock },
        {
          provide: MenuAdminDomainService,
          useValue: menuAdminDomainServiceMock,
        },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return {
      setupStoreMock: {
        categoryEntities: signal<CategoryDomainModel[]>([
          { id: 'c-salads', name: 'Salads' },
        ]),
        upsertDish: vi.fn(),
      },
      menuAdminDomainServiceMock: {
        createDish: vi.fn().mockReturnValue(of(Arrange.createDish())),
        updateDish: vi.fn().mockReturnValue(of(Arrange.createDish())),
      } satisfies Mocked<
        Pick<MenuAdminDomainService, 'createDish' | 'updateDish'>
      >,
      dialogRefMock: { close: vi.fn() },
    };
  },

  createDish(): DishDomainModel {
    return {
      id: 'd-caesar',
      categoryId: 'c-salads',
      name: 'Chicken Caesar',
      description: '',
      photoUrl: null,
      price: 1250,
      isOpenPrice: false,
      available: true,
    };
  },
};
