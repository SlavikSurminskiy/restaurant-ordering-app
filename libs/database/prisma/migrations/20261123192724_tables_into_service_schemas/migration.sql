-- Hand-written: Prisma would drop and re-create the tables to move them (data lost), so they move here.
-- Each service owns one schema (docs/microservices.md). Indexes, constraints and the foreign keys
-- inside a schema move with their tables.

CREATE SCHEMA "auth";
ALTER TABLE "public"."users" SET SCHEMA "auth";
ALTER TYPE "public"."Role" SET SCHEMA "auth";

CREATE SCHEMA "menu";
ALTER TABLE "public"."categories" SET SCHEMA "menu";
ALTER TABLE "public"."dishes" SET SCHEMA "menu";

CREATE SCHEMA "orders";
ALTER TABLE "public"."orders" SET SCHEMA "orders";
ALTER TABLE "public"."order_items" SET SCHEMA "orders";
ALTER TYPE "public"."OrderStatus" SET SCHEMA "orders";
