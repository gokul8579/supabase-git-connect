-- Migration: Add sales_order_id column to tickets table
-- This allows tickets to be linked to sales orders

-- Step 1: Add sales_order_id column if it doesn't exist
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL;

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_sales_order_id ON tickets(sales_order_id);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN tickets.sales_order_id IS 'Reference to the sales order this ticket is related to. Only delivered orders can have tickets.';

