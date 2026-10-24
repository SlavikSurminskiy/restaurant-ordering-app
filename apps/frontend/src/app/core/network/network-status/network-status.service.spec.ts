import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { NetworkStatusService } from './network-status.service';

describe(NetworkStatusService.name, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start with the browser online state', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const service = Arrange.setup();

    expect(service.isOnline()).toBe(false);
  });

  it('should follow online and offline window events', () => {
    const service = Arrange.setup();

    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBe(true);
  });
});

const Arrange = {
  setup() {
    return TestBed.inject(NetworkStatusService);
  },
};
