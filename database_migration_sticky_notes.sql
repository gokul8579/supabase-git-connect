-- Migration: Create Sticky Notes Table

CREATE TABLE IF NOT EXISTS sticky_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  color VARCHAR NOT NULL DEFAULT 'bg-yellow-200 border-yellow-300',
  position_x INTEGER,
  position_y INTEGER,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sticky_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sticky notes" ON sticky_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sticky notes" ON sticky_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sticky notes" ON sticky_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sticky notes" ON sticky_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_sticky_notes_user_id ON sticky_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_is_pinned ON sticky_notes(is_pinned);

-- Create trigger for updated_at
CREATE TRIGGER update_sticky_notes_updated_at
  BEFORE UPDATE ON sticky_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

