-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for future multi-user support)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT UNIQUE,
  name TEXT
);

-- Words table
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word TEXT UNIQUE NOT NULL,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  phonetic_pattern TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test sessions
CREATE TABLE test_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prompt TEXT,
  difficulty_setting TEXT
);

-- Test attempts
CREATE TABLE test_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  user_spelling TEXT,
  is_correct BOOLEAN NOT NULL,
  feedback TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  audio_duration_ms INTEGER
);

-- Word contexts (example sentences)
CREATE TABLE word_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  context_sentence TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_test_attempts_session_id ON test_attempts(session_id);
CREATE INDEX idx_test_attempts_word_id ON test_attempts(word_id);
CREATE INDEX idx_test_attempts_is_correct ON test_attempts(is_correct);
CREATE INDEX idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX idx_word_contexts_word_id ON word_contexts(word_id);
CREATE INDEX idx_words_word ON words(word);

-- Create a view for failed words that need repetition
CREATE VIEW words_to_repeat AS
SELECT DISTINCT
  w.id,
  w.word,
  w.difficulty_level,
  COUNT(ta.id) as attempt_count,
  SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END) as correct_count,
  MAX(ta.attempted_at) as last_attempted
FROM words w
JOIN test_attempts ta ON w.id = ta.word_id
WHERE ta.is_correct = false
  AND NOT EXISTS (
    SELECT 1 
    FROM test_attempts ta2 
    WHERE ta2.word_id = w.id 
    AND ta2.is_correct = true 
    AND ta2.attempted_at > ta.attempted_at
  )
GROUP BY w.id, w.word, w.difficulty_level;

-- Create a default user for single-user mode
INSERT INTO users (id, email, name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'default@spellingtest.app', 'Default User')
ON CONFLICT (email) DO NOTHING;

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_contexts ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations for authenticated users
-- These can be refined later for multi-user support
CREATE POLICY "Enable all for authenticated users" ON users
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON words
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON test_sessions
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON test_attempts
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON word_contexts
  FOR ALL USING (true);