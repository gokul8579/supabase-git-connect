-- Migration: Fix stock_approval approved_by foreign key constraint
-- The approved_by column should reference auth.users, not employees

-- Step 1: Drop the existing foreign key constraint if it exists
ALTER TABLE stock_approval 
DROP CONSTRAINT IF EXISTS stock_approval_approved_by_fkey;

-- Step 2: Add the correct foreign key constraint to auth.users
ALTER TABLE stock_approval
ADD CONSTRAINT stock_approval_approved_by_fkey 
FOREIGN KEY (approved_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN stock_approval.approved_by IS 'Reference to the user who approved the stock request. References auth.users(id).';

