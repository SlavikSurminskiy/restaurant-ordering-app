import { HttpStatusCode } from '@angular/common/http';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { NEVER, of, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import { MenuDomainModel } from '../../shared/domain/menu/menu-domain.models';
import { MenuDomainService } from '../../shared/domain/menu/menu-domain.service';
import { DishDomainModel } from '../../shared/domain/menu-admin/menu-admin-domain.models';
import { MenuAdminDomainService } from '../../shared/domain/menu-admin/menu-admin-domain.service';
import { ApiError } from '../../core/http/api-error';

import { SetupMenu } from './setup-menu';

describe(SetupMenu.name, () => {
  describe('loading', () => {
    it('should show a progress bar while the menu loads', async () => {
      const spies = Arrange.createSpies();
      spies.menuDomainServiceMock.getMenu.mockReturnValue(NEVER);
      const { renderResult } = await Arrange.setup(spies);

      expect(renderResult.getByRole('progressbar')).toBeTruthy();
    });

    it('should explain when the menu fails to load', async () => {
      const spies = Arrange.createSpies();
      spies.menuDomainServiceMock.getMenu.mockReturnValue(
        throwError(() => Arrange.createApiError()),
      );
      const { renderResult } = await Arrange.setup(spies);

      expect(renderResult.getByRole('alert').textContent).toContain(
        'Cannot reach the server.',
      );
    });

    it('should load the menu again on request', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.menuDomainServiceMock.getMenu.mockReturnValueOnce(
        throwError(() => Arrange.createApiError()),
      );
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Try again' }));

      expect(spies.menuDomainServiceMock.getMenu).toHaveBeenCalledTimes(2);
      expect(renderResult.getByRole('region', { name: 'Salads' })).toBeTruthy();
    });
  });

  it('should show every category with its dishes', async () => {
    const { renderResult } = await Arrange.setup();

    expect(
      renderResult.getByRole('region', { name: 'Salads' }).textContent,
    ).toContain('Chicken Caesar');
    expect(
      renderResult.getByRole('region', { name: 'Soups' }).textContent,
    ).toContain('No dishes yet.');
  });

  it('should invite to start with a category when the menu is empty', async () => {
    const spies = Arrange.createSpies();
    spies.menuDomainServiceMock.getMenu.mockReturnValue(
      of({ categories: [], dishes: [] }),
    );
    const { renderResult } = await Arrange.setup(spies);

    expect(
      renderResult.getByText('No categories yet. Start with a new category.'),
    ).toBeTruthy();
  });

  describe('forms', () => {
    it('should open the category form for a new category', async () => {
      const user = Arrange.setupUser();
      const { renderResult } = await Arrange.setup();

      await user.click(
        renderResult.getByRole('button', { name: 'New category' }),
      );

      expect(
        await screen.findByRole('heading', { name: 'New category' }),
      ).toBeTruthy();
    });

    it('should open the category form to edit a category', async () => {
      const user = Arrange.setupUser();
      const { renderResult } = await Arrange.setup();

      await user.click(
        renderResult.getByRole('button', { name: 'Edit Salads' }),
      );

      expect(
        await screen.findByRole('heading', { name: 'Edit category' }),
      ).toBeTruthy();
    });

    it('should open the dish form for a new dish in a category', async () => {
      const user = Arrange.setupUser();
      const { renderResult } = await Arrange.setup();

      await user.click(
        renderResult.getByRole('button', { name: 'New dish in Salads' }),
      );

      expect(
        await screen.findByRole('heading', { name: 'New dish' }),
      ).toBeTruthy();
    });

    it('should open the dish form to edit a dish', async () => {
      const user = Arrange.setupUser();
      const { renderResult } = await Arrange.setup();

      await user.click(
        renderResult.getByRole('button', { name: 'Edit Chicken Caesar' }),
      );

      expect(
        await screen.findByRole('heading', { name: 'Edit dish' }),
      ).toBeTruthy();
    });
  });

  describe('availability', () => {
    it('should save the new availability and show the saved dish', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);
      const toggle = renderResult.getByRole('switch', {
        name: 'Available: Chicken Caesar',
      });

      await user.click(toggle);

      expect(spies.menuAdminDomainServiceMock.updateDish).toHaveBeenCalledWith(
        'd-caesar',
        { available: false },
      );
      expect(toggle.getAttribute('aria-checked')).toBe('false');
    });

    it('should keep the dish and explain when saving fails', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.menuAdminDomainServiceMock.updateDish.mockReturnValue(
        throwError(() => Arrange.createApiError()),
      );
      const { renderResult } = await Arrange.setup(spies);
      const toggle = renderResult.getByRole('switch', {
        name: 'Available: Chicken Caesar',
      });

      await user.click(toggle);

      expect(toggle.getAttribute('aria-checked')).toBe('true');
      expect(await screen.findByText('Cannot reach the server.')).toBeTruthy();
    });
  });

  describe('deleting a dish', () => {
    it('should delete the dish after confirmation', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(
        renderResult.getByRole('button', { name: 'Delete Chicken Caesar' }),
      );
      await user.click(await screen.findByRole('button', { name: 'Delete' }));

      // The confirmation resolves once the dialog has finished closing.
      await vi.waitFor(() =>
        expect(renderResult.queryByText('Chicken Caesar')).toBeNull(),
      );
      expect(spies.menuAdminDomainServiceMock.deleteDish).toHaveBeenCalledWith(
        'd-caesar',
      );
    });

    it('should keep the dish when the deletion is cancelled', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(
        renderResult.getByRole('button', { name: 'Delete Chicken Caesar' }),
      );
      await user.click(await screen.findByRole('button', { name: 'Cancel' }));

      expect(
        spies.menuAdminDomainServiceMock.deleteDish,
      ).not.toHaveBeenCalled();
      expect(renderResult.getByText('Chicken Caesar')).toBeTruthy();
    });
  });

  it('should delete an empty category after confirmation', async () => {
    const user = Arrange.setupUser();
    const spies = Arrange.createSpies();
    const { renderResult } = await Arrange.setup(spies);

    await user.click(
      renderResult.getByRole('button', { name: 'Delete Soups' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    await vi.waitFor(() =>
      expect(
        spies.menuAdminDomainServiceMock.deleteCategory,
      ).toHaveBeenCalledWith('c-soups'),
    );
    expect(renderResult.queryByText('Soups')).toBeNull();
  });
});

interface Spies {
  menuDomainServiceMock: { getMenu: Mock };
  menuAdminDomainServiceMock: {
    updateDish: Mock;
    deleteDish: Mock;
    deleteCategory: Mock;
  };
}

const Arrange = {
  async setup(spies?: Spies) {
    const { menuDomainServiceMock, menuAdminDomainServiceMock } =
      spies ?? Arrange.createSpies();

    const renderResult = await render(SetupMenu, {
      providers: [
        { provide: MenuDomainService, useValue: menuDomainServiceMock },
        {
          provide: MenuAdminDomainService,
          useValue: menuAdminDomainServiceMock,
        },
      ],
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return {
      menuDomainServiceMock: {
        getMenu: vi.fn().mockReturnValue(of(Arrange.createMenu())),
      } satisfies Mocked<Pick<MenuDomainService, 'getMenu'>>,
      menuAdminDomainServiceMock: {
        updateDish: vi
          .fn()
          .mockReturnValue(of({ ...Arrange.createDish(), available: false })),
        deleteDish: vi.fn().mockReturnValue(of(undefined)),
        deleteCategory: vi.fn().mockReturnValue(of(undefined)),
      } satisfies Mocked<
        Pick<
          MenuAdminDomainService,
          'updateDish' | 'deleteDish' | 'deleteCategory'
        >
      >,
    };
  },

  createMenu(): MenuDomainModel {
    return {
      categories: [
        { id: 'c-salads', name: 'Salads' },
        { id: 'c-soups', name: 'Soups' },
      ],
      dishes: [Arrange.createDish()],
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

  createApiError() {
    return new ApiError(
      HttpStatusCode.ServiceUnavailable,
      'Cannot reach the server.',
    );
  },
};
