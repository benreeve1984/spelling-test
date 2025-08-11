# Spelling Test Application

## Project Goals

1. **Adaptive Learning**: Create an intelligent spelling test application that adapts difficulty based on user performance
2. **Natural Interaction**: Use modern TTS and STT to create a natural, voice-based spelling test experience
3. **Phonetic Input**: Accept phonetic spelling input (e.g., "aitch", "ay", "em") for accurate assessment
4. **Performance Tracking**: Store and analyze test results to improve future word selection
5. **Clean UX**: Deliver a minimal, Notion-style interface that's distraction-free and focused

## Design Principles

### Technical Architecture
- **Framework**: Next.js 14+ with App Router for modern React patterns
- **Database**: Supabase for real-time data and easy Vercel integration
- **AI Integration**: OpenAI APIs - IMPORTANT MODEL SPECIFICATIONS:
  - **DO NOT CHANGE THESE MODELS**:
  - Word Generation: `gpt-5-mini` (NOT gpt-4o-mini)
  - Audio Transcription: `gpt-4o-audio-2025-01-20` (NOT whisper-1)
  - Phonetic Interpretation: `gpt-5-mini` (NOT gpt-4o-mini)
  - Feedback Generation: `gpt-5-mini` (NOT gpt-4o-mini)
  - Text-to-Speech: `tts-1` (standard)
- **Deployment**: Vercel for CI/CD with GitHub integration
- **Type Safety**: TypeScript throughout for maintainable code

### User Experience
- **Minimalist Design**: Black and white color scheme, inspired by Notion's clean aesthetic
- **Single Focus**: One word at a time, clear visual hierarchy
- **Immediate Feedback**: Real-time indication of correctness with helpful error analysis
- **Push-to-Talk**: Red button for recording, natural interaction pattern

### Core Features
1. **Word Generation**
   - GPT-4o-mini with structured outputs
   - Contextual word selection based on:
     - User prompts (difficulty, phonetic patterns, themes)
     - Historical performance data
     - Spaced repetition for failed words

2. **Voice Interaction**
   - TTS for word pronunciation and context sentences
   - STT with Whisper for capturing phonetic spelling
   - Hold-to-record pattern for clear input boundaries

3. **Phonetic Recognition**
   - Convert phonetic input ("bee", "ee", "ay") to letters
   - Handle variations and accents gracefully
   - Provide clear feedback on recognition errors

4. **Progress Tracking**
   - Store all attempts with timestamps
   - Track success rates per word
   - Implement spaced repetition for failed words
   - Analyze patterns for difficulty adjustment

### Database Schema

```sql
-- Users table (for future multi-user support)
users (
  id uuid primary key,
  created_at timestamp,
  email text unique,
  name text
)

-- Words table
words (
  id uuid primary key,
  word text unique not null,
  difficulty_level int,
  phonetic_pattern text,
  created_at timestamp
)

-- Test sessions
test_sessions (
  id uuid primary key,
  user_id uuid references users(id),
  created_at timestamp,
  prompt text,
  difficulty_setting text
)

-- Test attempts
test_attempts (
  id uuid primary key,
  session_id uuid references test_sessions(id),
  word_id uuid references words(id),
  user_spelling text,
  is_correct boolean,
  feedback text,
  attempted_at timestamp,
  audio_duration_ms int
)

-- Word contexts (example sentences)
word_contexts (
  id uuid primary key,
  word_id uuid references words(id),
  context_sentence text,
  created_at timestamp
)
```

### API Design

#### `/api/generate-words`
- Input: prompt, difficulty, previous results
- Output: 10 words with context sentences
- Uses GPT-4o-mini with structured outputs

#### `/api/text-to-speech`
- Input: text (word + context)
- Output: Audio stream
- Uses OpenAI TTS API

#### `/api/speech-to-text`
- Input: Audio blob
- Output: Transcribed text
- Uses OpenAI Whisper API

#### `/api/check-spelling`
- Input: word, phonetic spelling
- Output: correctness, feedback
- Phonetic to letter conversion logic

#### `/api/save-attempt`
- Input: session data, attempt details
- Output: Success confirmation
- Stores to Supabase

### Deployment Strategy

1. **Local Development**
   - `.env.local` for API keys
   - Supabase local development option

2. **GitHub Repository**
   - Clean commit history
   - Protected main branch
   - Environment secrets

3. **Vercel Deployment**
   - Auto-deploy from main branch
   - Environment variables configuration
   - Edge functions for API routes

4. **Supabase Setup**
   - Database migrations
   - Row Level Security policies
   - Connection pooling for scale

### Future Enhancements

1. **Multi-user Support**
   - Authentication system
   - User profiles and progress tracking
   - Leaderboards and achievements

2. **Advanced Features**
   - Custom word lists
   - Different test modes (timed, survival)
   - Detailed analytics dashboard
   - Export progress reports

3. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - High contrast mode
   - Adjustable speech rate

### Development Workflow

1. **Testing**
   - Component testing with React Testing Library
   - API endpoint testing
   - E2E testing with Playwright

2. **Code Quality**
   - ESLint configuration
   - Prettier formatting
   - Pre-commit hooks
   - TypeScript strict mode

3. **Monitoring**
   - Vercel Analytics
   - Error tracking with Sentry
   - Performance monitoring
   - User feedback collection