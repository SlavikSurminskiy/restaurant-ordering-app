-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_dishId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "userName" TEXT;
