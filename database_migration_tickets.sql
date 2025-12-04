-- Migration: Create Tickets Module Tables
-- This creates a simplified ticket system for single-user CRM

-- Step 1: Create ticket status enum
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_issue_type AS ENUM ('technical', 'billing', 'sales', 'support', 'other');

-- Step 2: Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_number VARCHAR NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  subject VARCHAR NOT NULL,
  description TEXT NOT NULL,
  issue_type ticket_issue_type NOT NULL DEFAULT 'other',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  deadline TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create ticket attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create ticket notes table (internal notes)
CREATE TABLE IF NOT EXISTS ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create ticket replies table (customer-facing replies)
CREATE TABLE IF NOT EXISTS ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  sent_to_customer BOOLEAN NOT NULL DEFAULT false,
  customer_email VARCHAR,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create ticket history table (for status changes and SLA tracking)
CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR NOT NULL, -- 'status_change', 'priority_change', 'assigned', etc.
  old_value VARCHAR,
  new_value VARCHAR,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Enable Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS Policies for tickets
CREATE POLICY "Users can view their own tickets" ON tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tickets" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets" ON tickets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tickets" ON tickets
  FOR DELETE USING (auth.uid() = user_id);

-- Step 9: Create RLS Policies for ticket_attachments
CREATE POLICY "Users can view attachments for their tickets" ON ticket_attachments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM tickets WHERE tickets.id = ticket_attachments.ticket_id AND tickets.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert attachments for their tickets" ON ticket_attachments
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM tickets WHERE tickets.id = ticket_attachments.ticket_id AND tickets.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete attachments for their tickets" ON ticket_attachments
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM tickets WHERE tickets.id = ticket_attachments.ticket_id AND tickets.user_id = auth.uid()
  ));

-- Step 10: Create RLS Policies for ticket_notes
CREATE POLICY "Users can view notes for their tickets" ON ticket_notes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM tickets WHERE tickets.id = ticket_notes.ticket_id AND tickets.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert notes for their tickets" ON ticket_notes
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM tickets WHERE tickets.id = ticket_notes.ticket_id AND tickets.user_id = auth.uid()
  ));

-- Step 11: Create RLS Policies for ticket_replies
CREATE POLICY "Users can view replies for their tickets" ON ticket_replies
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM tickets WHERE tickets.id = ticket_replies.ticket_id AND tickets.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert replies for their tickets" ON ticket_replies
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM tickets WHERE tickets.id = ticket_replies.ticket_id AND tickets.user_id = auth.uid()
  ));

-- Step 12: Create RLS Policies for ticket_history
CREATE POLICY "Users can view history for their tickets" ON ticket_history
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM tickets WHERE tickets.id = ticket_history.ticket_id AND tickets.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert history for their tickets" ON ticket_history
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM tickets WHERE tickets.id = ticket_history.ticket_id AND tickets.user_id = auth.uid()
  ));

-- Step 13: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_deadline ON tickets(deadline);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket_id ON ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);

-- Step 14: Create trigger for updated_at
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 15: Create function to auto-generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('ticket_sequence')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_sequence START 1;

-- Create trigger for ticket number generation
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Verification queries (optional - run these to check):
-- SELECT * FROM tickets LIMIT 1;
-- SELECT * FROM ticket_attachments LIMIT 1;
-- SELECT * FROM ticket_notes LIMIT 1;
-- SELECT * FROM ticket_replies LIMIT 1;
-- SELECT * FROM ticket_history LIMIT 1;

