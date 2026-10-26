import {
  OrderDomainModel,
  OrderStatusDomainModel,
} from '@restaurant/frontend/domain/orders';

export interface OrderCardModel {
  order: OrderDomainModel;
  nextStatus: OrderStatusDomainModel | null;
}
