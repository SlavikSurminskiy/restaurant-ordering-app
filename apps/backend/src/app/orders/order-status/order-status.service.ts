import { Injectable } from '@nestjs/common';

import { OrderStatus } from '@restaurant/shared-api-types';

const SEQUENCE: readonly OrderStatus[] = [
  OrderStatus.New,
  OrderStatus.Preparing,
  OrderStatus.Ready,
  OrderStatus.Completed,
];

export interface StatusChange {
  from: OrderStatus;
  to: OrderStatus;
}

@Injectable()
export class OrderStatusService {
  next(status: OrderStatus): OrderStatus | null {
    const index = SEQUENCE.indexOf(status);

    return index >= 0 ? (SEQUENCE[index + 1] ?? null) : null;
  }

  /** An admin may move an order forward (skipping steps) or cancel it, until it is final. */
  canChange({ from, to }: StatusChange): boolean {
    if (this.next(from) === null) {
      return false;
    }

    return (
      to === OrderStatus.Cancelled ||
      SEQUENCE.indexOf(to) > SEQUENCE.indexOf(from)
    );
  }
}
