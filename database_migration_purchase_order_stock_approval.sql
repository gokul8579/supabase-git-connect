-- Migration: Add purchase_order_id and approval_type to stock_approval table
-- This allows stock approvals to handle both sales orders (stock decrease) and purchase orders (stock increase)

-- Step 1: Add purchase_order_id column if it doesn't exist
ALTER TABLE stock_approval 
ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- Step 2: Add approval_type column to distinguish between stock increase and decrease
ALTER TABLE stock_approval 
ADD COLUMN IF NOT EXISTS approval_type VARCHAR DEFAULT 'stock_decrease';

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_stock_approval_purchase_order_id ON stock_approval(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_approval_approval_type ON stock_approval(approval_type);

-- Step 4: Add comment for documentation
COMMENT ON COLUMN stock_approval.purchase_order_id IS 'Reference to the purchase order this stock approval is related to (for stock increases).';
COMMENT ON COLUMN stock_approval.approval_type IS 'Type of approval: stock_decrease (from sales orders) or stock_increase (from purchase orders).';

