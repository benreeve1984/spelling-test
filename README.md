# Spelling Test Application

An AI-powered adaptive spelling test application with voice interaction, built with Next.js, OpenAI APIs, and Supabase.

## Features

- 🎯 Adaptive difficulty based on performance
- 🎙️ Voice-based interaction with TTS and STT
- 📝 Phonetic spelling input (e.g., "aitch", "ay", "em")
- 📊 Performance tracking and spaced repetition
- 🎨 Clean, minimal Notion-style interface
- ☁️ Deployed on Vercel with Supabase backend

## Setup Instructions

### Prerequisites

1. Node.js 18+ installed
2. OpenAI API key
3. Supabase account
4. GitHub account
5. Vercel account

### Local Development Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd spelling-test
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.local` to `.env.local` (it's already there)
   - Fill in your API keys:
```env
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Deployment Instructions

### Step 1: Set up Supabase

1. **Create a Supabase Project**:
   - Go to [https://supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Set up the Database**:
   - Go to the SQL Editor in your Supabase dashboard
   - Copy the entire contents of `supabase/schema.sql`
   - Paste and run it in the SQL Editor
   - This creates all necessary tables, indexes, and policies

3. **Configure Authentication** (optional for multi-user):
   - For now, the app uses a default user
   - Authentication can be added later for multi-user support

### Step 2: Prepare GitHub Repository

1. **Create a new GitHub repository**
2. **Push your code**:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 3: Deploy to Vercel

1. **Connect to Vercel**:
   - Go to [https://vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables in Vercel**:
   - During import, add these environment variables:
     - `OPENAI_API_KEY`: Your OpenAI API key
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

3. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy your application

4. **Set up Automatic Deployments**:
   - Vercel automatically deploys on every push to main branch
   - Preview deployments are created for pull requests

### Step 4: Post-Deployment Configuration

1. **Update Supabase CORS Settings** (if needed):
   - Go to Supabase Dashboard → Settings → API
   - Add your Vercel domain to allowed origins

2. **Test the Application**:
   - Visit your Vercel deployment URL
   - Generate words and test the spelling functionality
   - Check that results are being saved to Supabase

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 and Whisper | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## Database Schema

The application uses the following main tables:
- `users`: User accounts (single default user for now)
- `words`: Spelling words with difficulty levels
- `test_sessions`: Test session tracking
- `test_attempts`: Individual spelling attempts
- `word_contexts`: Example sentences for words

## API Endpoints

- `POST /api/generate-words`: Generate spelling words using GPT-4
- `POST /api/text-to-speech`: Convert text to speech
- `POST /api/speech-to-text`: Transcribe audio to text
- `POST /api/check-spelling`: Verify phonetic spelling
- `POST /api/save-attempt`: Store test results

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **AI**: OpenAI GPT-4o-mini, Whisper, TTS
- **Deployment**: Vercel
- **Database**: PostgreSQL (via Supabase)

## Development

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Troubleshooting

### Microphone Access
- Ensure your browser has permission to access the microphone
- HTTPS is required for microphone access (automatic on Vercel)

### Supabase Connection Issues
- Verify your Supabase URL and anon key are correct
- Check that Row Level Security policies are properly configured
- Ensure the database schema has been properly initialized

### OpenAI API Errors
- Verify your API key is valid and has sufficient credits
- Check rate limits on your OpenAI account
- Ensure you're using the correct model names

## Future Enhancements

- Multi-user support with authentication
- Custom word lists and categories
- Detailed progress analytics
- Export functionality for test results
- Mobile app versions
- Offline mode with local caching

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.