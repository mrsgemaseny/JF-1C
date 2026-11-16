ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reassignment_requested BOOLEAN DEFAULT false;
