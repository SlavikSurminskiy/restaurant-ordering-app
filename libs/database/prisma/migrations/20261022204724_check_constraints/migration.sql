-- Hand-written: Prisma can't model CHECK constraints (see the header of schema.prisma).

-- Price is NULL exactly for open-price dishes; prices are never negative.
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_price_open_price_check" CHECK (("price" IS NULL) = "isOpenPrice");
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_price_check" CHECK ("price" >= 0);

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unitPrice_check" CHECK ("unitPrice" >= 0);
