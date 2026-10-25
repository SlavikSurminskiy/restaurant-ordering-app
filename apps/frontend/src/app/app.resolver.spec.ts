import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import type { Mocked } from 'vitest';

import { DiscountDomainModel } from './shared/domain/menu/menu-domain.models';
import { MenuDomainService } from './shared/domain/menu/menu-domain.service';

import { AppData, appResolver } from './app.resolver';

describe('appResolver', () => {
  it('should resolve the order discount from the domain service', async () => {
    const { resolve, menuDomainServiceMock } = Arrange.setup();

    const appData = await resolve();

    expect(menuDomainServiceMock.getOrderDiscount).toHaveBeenCalled();

    expect(appData).toEqual({ discount: 500 });
  });
});

const Arrange = {
  setup() {
    const menuDomainServiceMock = {
      getOrderDiscount: vi
        .fn()
        .mockReturnValue(of(Arrange.getMockedDiscount())),
    } satisfies Mocked<Pick<MenuDomainService, 'getOrderDiscount'>>;

    TestBed.configureTestingModule({
      providers: [
        { provide: MenuDomainService, useValue: menuDomainServiceMock },
      ],
    });

    return {
      menuDomainServiceMock,
      resolve(): Promise<AppData> {
        const result = TestBed.runInInjectionContext(() =>
          appResolver({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
        );

        return firstValueFrom(result as Observable<AppData>);
      },
    };
  },

  getMockedDiscount(): DiscountDomainModel {
    return { discount: 500 };
  },
};
