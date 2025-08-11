import { NextRequest, NextResponse } from 'next/server';
import { supabase, DEFAULT_USER_ID } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { 
      sessionId, 
      word, 
      userSpelling, 
      isCorrect, 
      feedback, 
      audioDurationMs,
      sessionPrompt,
      difficultySetting 
    } = await request.json();
    
    // If Supabase is not configured, return success without saving
    if (!supabase) {
      return NextResponse.json({
        success: true,
        sessionId: 'local-session',
        attemptId: 'local-attempt',
      });
    }
    
    // Create or get session
    let finalSessionId = sessionId;
    
    if (!finalSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('test_sessions')
        .insert({
          user_id: DEFAULT_USER_ID,
          prompt: sessionPrompt || '',
          difficulty_setting: difficultySetting || 'adaptive',
        })
        .select('id')
        .single();
      
      if (sessionError) {
        throw sessionError;
      }
      
      finalSessionId = newSession.id;
    }
    
    // Get or create word record
    let { data: wordRecord } = await supabase
      .from('words')
      .select('id')
      .eq('word', word)
      .single();
    
    if (!wordRecord) {
      const { data: newWord, error: wordError } = await supabase
        .from('words')
        .insert({
          word: word,
          difficulty_level: 5, // Default difficulty
        })
        .select('id')
        .single();
      
      if (wordError) {
        throw wordError;
      }
      
      wordRecord = newWord;
    }
    
    // Save the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .insert({
        session_id: finalSessionId,
        word_id: wordRecord.id,
        user_spelling: userSpelling,
        is_correct: isCorrect,
        feedback: feedback,
        audio_duration_ms: audioDurationMs,
      })
      .select('id')
      .single();
    
    if (attemptError) {
      throw attemptError;
    }
    
    return NextResponse.json({
      success: true,
      sessionId: finalSessionId,
      attemptId: attempt.id,
    });
  } catch (error) {
    console.error('Error saving attempt:', error);
    return NextResponse.json(
      { error: 'Failed to save attempt' },
      { status: 500 }
    );
  }
}