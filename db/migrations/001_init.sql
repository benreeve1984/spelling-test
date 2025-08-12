-- Enable UUID generation (if not already available in Vercel PG)
create extension if not exists pgcrypto;

create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  word text unique not null,
  difficulty_0_100 numeric not null,
  normalized_difficulty int not null check (normalized_difficulty between 1 and 10),
  level text check (level in ('easy','medium','hard')),
  letters int,
  syllables int,
  tags text,
  context_sentence text,
  phonetic_pattern text
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);

create table if not exists user_settings (
  user_id uuid primary key references users(id) on delete cascade,
  target_difficulty int not null default 5,
  updated_at timestamptz not null default now()
);

create table if not exists test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  difficulty_setting text default 'adaptive'
);

create table if not exists test_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references test_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  user_spelling text not null,
  is_correct boolean not null,
  feedback text,
  audio_duration_ms int,
  attempted_at timestamptz not null default now()
);

create table if not exists user_word_performance (
  user_id uuid not null references users(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  attempts int not null default 0,
  correct int not null default 0,
  last_attempted_at timestamptz,
  primary key (user_id, word_id)
);

create index if not exists idx_words_normdiff on words(normalized_difficulty);
create index if not exists idx_attempts_user_time on test_attempts(user_id, attempted_at desc);


