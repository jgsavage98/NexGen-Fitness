-- Add trainer approval fields to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN status VARCHAR DEFAULT 'approved',
ADD COLUMN trainer_id VARCHAR,
ADD COLUMN trainer_notes TEXT,
ADD COLUMN approved_at TIMESTAMP,
ADD COLUMN original_ai_response TEXT;

-- Set existing AI messages to pending approval
UPDATE chat_messages 
SET status = 'pending_approval' 
WHERE is_ai = true AND status IS NULL;

-- Set existing non-AI messages to approved
UPDATE chat_messages 
SET status = 'approved' 
WHERE is_ai = false AND status IS NULL;