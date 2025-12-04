-- Migration: Make product_id nullable in sales_order_items
-- This allows sales orders to have items without linked products (e.g., custom items, services)

-- Step 1: Drop the NOT NULL constraint on product_id
ALTER TABLE sales_order_items 
ALTER COLUMN product_id DROP NOT NULL;

-- Step 2: Drop the foreign key constraint if it exists (optional, only if needed)
-- ALTER TABLE sales_order_items 
-- DROP CONSTRAINT IF EXISTS sales_order_items_product_id_fkey;

-- Step 3: Re-add foreign key constraint but allow NULL values
-- Note: Foreign keys in PostgreSQL automatically allow NULL values
-- If you need to keep the foreign key, you can add it back:
-- ALTER TABLE sales_order_items 
-- ADD CONSTRAINT sales_order_items_product_id_fkey 
-- FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Verification query (run this to check):
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'sales_order_items' AND column_name = 'product_id';

