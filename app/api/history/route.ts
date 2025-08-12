import { NextRequest, NextResponse } from 'next/server';
import { supabase, DEFAULT_USER_ID } from '@/app/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json({
        attempts: [],
        sessions: [],
        message: 'Database not configured'
      });
    }

    // Fetch all attempts for the default user
    const { data: attempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select(`
        id,
        session_id,
        user_spelling,
        is_correct,
        feedback,
        attempted_at,
        audio_duration_ms,
        words (
          word
        )
      `)
      .order('attempted_at', { ascending: false })
      .limit(100);

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
      return NextResponse.json(
        { error: 'Failed to fetch history', details: attemptsError.message },
        { status: 500 }
      );
    }

    // Fetch sessions with their attempts
    const { data: sessions, error: sessionsError } = await supabase
      .from('test_sessions')
      .select(`
        id,
        created_at,
        prompt,
        difficulty_setting,
        test_attempts (
          id,
          user_spelling,
          is_correct,
          feedback,
          attempted_at,
          words (
            word
          )
        )
      `)
      .eq('user_id', DEFAULT_USER_ID)
      .order('created_at', { ascending: false })
      .limit(20);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
    }

    // Format the attempts data
    const formattedAttempts = attempts?.map(attempt => ({
      id: attempt.id,
      session_id: attempt.session_id,
      word: attempt.words?.word || 'Unknown',
      user_spelling: attempt.user_spelling,
      is_correct: attempt.is_correct,
      feedback: attempt.feedback,
      attempted_at: attempt.attempted_at,
      audio_duration_ms: attempt.audio_duration_ms,
    })) || [];

    // Format the sessions data
    const formattedSessions = sessions?.map(session => ({
      id: session.id,
      created_at: session.created_at,
      prompt: session.prompt,
      difficulty_setting: session.difficulty_setting,
      attempts: session.test_attempts?.map((attempt: any) => ({
        id: attempt.id,
        word: attempt.words?.word || 'Unknown',
        user_spelling: attempt.user_spelling,
        is_correct: attempt.is_correct,
        feedback: attempt.feedback,
        attempted_at: attempt.attempted_at,
      })) || [],
    })) || [];

    return NextResponse.json({
      attempts: formattedAttempts,
      sessions: formattedSessions,
    });
  } catch (error: any) {
    console.error('Error in history API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history', details: error?.message },
      { status: 500 }
    );
  }
}