import { MenuSectionDomainModel } from '../../../shared/domain/domain.models';

import { LoadStatus } from './menu-store.enums';

export interface MenuState {
  sections: MenuSectionDomainModel[];
  status: LoadStatus;
  error: string | null;
}
