import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { render, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { NEVER, of, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import {
  CategoryDomainModel,
  MenuAdminDomainService,
} from '@restaurant/frontend/domain/menu-admin';

import { SetupMenuStore } from '../setup-menu-store/setup-menu.store';

import { CategoryDialog } from './category-dialog';

describe(CategoryDialog.name, () => {
  describe('new category', () => {
    it('should create the category with the trimmed name', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies, null);

      await user.type(renderResult.getByLabelText('Name'), '  Soups ');
      await user.click(renderResult.getByRole('button', { name: 'Save' }));

      expect(
        spies.menuAdminDomainServiceMock.createCategory,
      ).toHaveBeenCalledWith({ name: 'Soups' });
    });

    it('should store the created category and close', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies, null);

      await user.type(renderResult.getByLabelText('Name'), 'Soups');
      await user.click(renderResult.getByRole('button', { name: 'Save' }));

      expect(spies.setupStoreMock.upsertCategory).toHaveBeenCalledWith(
        Arrange.createCategory(),
      );
      expect(spies.dialogRefMock.close).toHaveBeenCalledOnce();
    });

    it('should not let an empty form be saved', async () => {
      const { renderResult } = await Arrange.setup(Arrange.createSpies(), null);

      expect(
        renderResult
          .getByRole('button', { name: 'Save' })
          .hasAttribute('disabled'),
      ).toBe(true);
    });

    it('should let the form be saved once it has a name', async () => {
      const user = Arrange.setupUser();
      const { renderResult } = await Arrange.setup(Arrange.createSpies(), null);

      await user.type(renderResult.getByLabelText('Name'), 'Soups');

      expect(
        renderResult
          .getByRole('button', { name: 'Save' })
          .hasAttribute('disabled'),
      ).toBe(false);
    });

    it('should show a spinner on the save button while saving', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.menuAdminDomainServiceMock.createCategory.mockReturnValue(NEVER);
      const { renderResult } = await Arrange.setup(spies, null);
      const save = renderResult.getByRole('button', { name: 'Save' });

      await user.type(renderResult.getByLabelText('Name'), 'Soups');
      await user.click(save);

      expect(
        within(save).getByRole('progressbar', { name: 'Saving' }),
      ).toBeTruthy();
      expect(save.hasAttribute('disabled')).toBe(true);
    });

    it('should explain a blank name and not let it be saved', async () => {
      const user = Arrange.setupUser();
      const { renderResult } = await Arrange.setup(Arrange.createSpies(), null);

      await user.type(renderResult.getByLabelText('Name'), '   ');
      await user.tab();

      expect(renderResult.getByText('Enter a name.')).toBeTruthy();
      expect(
        renderResult
          .getByRole('button', { name: 'Save' })
          .hasAttribute('disabled'),
      ).toBe(true);
    });
  });

  describe('existing category', () => {
    it('should rename the category', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(
        spies,
        Arrange.createCategory(),
      );

      await user.clear(renderResult.getByLabelText('Name'));
      await user.type(renderResult.getByLabelText('Name'), 'Bowls');
      await user.click(renderResult.getByRole('button', { name: 'Save' }));

      expect(
        spies.menuAdminDomainServiceMock.updateCategory,
      ).toHaveBeenCalledWith('c-soups', { name: 'Bowls' });
    });

    it('should stay open and explain when saving fails', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.menuAdminDomainServiceMock.updateCategory.mockReturnValue(
        throwError(() => new Error('Failed')),
      );
      const { renderResult } = await Arrange.setup(
        spies,
        Arrange.createCategory(),
      );

      await user.click(renderResult.getByRole('button', { name: 'Save' }));

      expect(spies.setupStoreMock.upsertCategory).not.toHaveBeenCalled();
      expect(spies.dialogRefMock.close).not.toHaveBeenCalled();
      expect(renderResult.getByRole('alert').textContent).toContain(
        'Something went wrong. Please try again.',
      );
    });
  });
});

interface Spies {
  setupStoreMock: { upsertCategory: Mock };
  menuAdminDomainServiceMock: { createCategory: Mock; updateCategory: Mock };
  dialogRefMock: { close: Mock };
}

const Arrange = {
  async setup(spies: Spies, category: CategoryDomainModel | null) {
    const renderResult = await render(CategoryDialog, {
      providers: [
        { provide: SetupMenuStore, useValue: spies.setupStoreMock },
        {
          provide: MenuAdminDomainService,
          useValue: spies.menuAdminDomainServiceMock,
        },
        { provide: MatDialogRef, useValue: spies.dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { category } },
      ],
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return {
      setupStoreMock: { upsertCategory: vi.fn() },
      menuAdminDomainServiceMock: {
        createCategory: vi.fn().mockReturnValue(of(Arrange.createCategory())),
        updateCategory: vi.fn().mockReturnValue(of(Arrange.createCategory())),
      } satisfies Mocked<
        Pick<MenuAdminDomainService, 'createCategory' | 'updateCategory'>
      >,
      dialogRefMock: { close: vi.fn() },
    };
  },

  createCategory(): CategoryDomainModel {
    return { id: 'c-soups', name: 'Soups' };
  },
};
