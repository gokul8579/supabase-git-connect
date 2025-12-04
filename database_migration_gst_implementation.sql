-- Create GST rates table
CREATE TABLE IF NOT EXISTS gst_rates (
    id SERIAL PRIMARY KEY,
    rate DECIMAL(5, 2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    description VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard GST rates (0%, 5%, 12%, 18%, 28%)
INSERT INTO gst_rates (rate, description) VALUES 
(0, '0% - No Tax'),
(5, '5% - Standard Rate'),
(12, '12% - Standard Rate'),
(18, '18% - Standard Rate'),
(28, '28% - Luxury Rate');

-- Add GST rate reference to products table
ALTER TABLE products 
ADD COLUMN gst_rate_id INTEGER REFERENCES gst_rates(id) DEFAULT NULL,
ADD COLUMN is_taxable BOOLEAN DEFAULT true;

-- Add GST rate reference to services table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
        ALTER TABLE services 
        ADD COLUMN gst_rate_id INTEGER REFERENCES gst_rates(id) DEFAULT NULL,
        ADD COLUMN is_taxable BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add company billing settings
ALTER TABLE companies
ADD COLUMN billing_type VARCHAR(20) NOT NULL DEFAULT 'exclusive_gst' CHECK (billing_type IN ('no_gst', 'inclusive_gst', 'exclusive_gst')),
ADD COLUMN gstin VARCHAR(15) DEFAULT NULL,
ADD COLUMN state_code VARCHAR(2) DEFAULT NULL;

-- Add GST details to invoice items
ALTER TABLE invoice_items
ADD COLUMN gst_rate_id INTEGER REFERENCES gst_rates(id) DEFAULT NULL,
ADD COLUMN cgst_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN sgst_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN igst_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN taxable_value DECIMAL(12, 2) DEFAULT 0;

-- Add GST details to quotation items
ALTER TABLE quotation_items
ADD COLUMN gst_rate_id INTEGER REFERENCES gst_rates(id) DEFAULT NULL,
ADD COLUMN cgst_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN sgst_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN igst_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN taxable_value DECIMAL(12, 2) DEFAULT 0;

-- Add GST details to sales order items
ALTER TABLE sales_order_items
ADD COLUMN gst_rate_id INTEGER REFERENCES gst_rates(id) DEFAULT NULL,
ADD COLUMN cgst_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN sgst_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN igst_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN taxable_value DECIMAL(12, 2) DEFAULT 0;

-- Create a function to calculate GST components
CREATE OR REPLACE FUNCTION calculate_gst_components(
    amount DECIMAL(12, 2),
    gst_rate DECIMAL(5, 2),
    billing_type VARCHAR(20)
) RETURNS TABLE (
    taxable_value DECIMAL(12, 2),
    cgst_amount DECIMAL(12, 2),
    sgst_amount DECIMAL(12, 2),
    total_tax DECIMAL(12, 2),
    total_amount DECIMAL(12, 2)
) AS $$
DECLARE
    v_taxable_value DECIMAL(12, 2);
    v_gst_amount DECIMAL(12, 2);
    v_cgst_amount DECIMAL(12, 2);
    v_sgst_amount DECIMAL(12, 2);
    v_total_amount DECIMAL(12, 2);
BEGIN
    -- For no GST, all values are zero except the total amount
    IF gst_rate = 0 OR billing_type = 'no_gst' THEN
        RETURN QUERY SELECT 
            amount,  -- taxable_value
            0,       -- cgst_amount
            0,       -- sgst_amount
            0,       -- total_tax
            amount;  -- total_amount
        RETURN;
    END IF;

    -- For inclusive GST, we need to back-calculate the taxable value
    IF billing_type = 'inclusive_gst' THEN
        v_taxable_value := (amount * 100) / (100 + gst_rate);
        v_gst_amount := amount - v_taxable_value;
    ELSE
        -- For exclusive GST, the amount is the taxable value
        v_taxable_value := amount;
        v_gst_amount := (amount * gst_rate) / 100;
    END IF;

    -- Split GST into CGST and SGST (50% each)
    v_cgst_amount := ROUND((v_gst_amount / 2)::numeric, 2);
    v_sgst_amount := v_gst_amount - v_cgst_amount; -- To handle rounding errors
    v_total_amount := v_taxable_value + v_gst_amount;

    RETURN QUERY SELECT 
        ROUND(v_taxable_value, 2),
        v_cgst_amount,
        v_sgst_amount,
        v_gst_amount,
        ROUND(v_total_amount, 2);
END;
$$ LANGUAGE plpgsql;
