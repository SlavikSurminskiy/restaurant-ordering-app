-- Hand-written: copies the buyer's name into existing orders, before the column becomes NOT NULL.
-- The last migration that reads across service tables; it still runs with access to both.
UPDATE "orders" AS o
SET "userName" = u."name"
FROM "users" AS u
WHERE u."id" = o."userId" AND o."userName" IS NULL;
