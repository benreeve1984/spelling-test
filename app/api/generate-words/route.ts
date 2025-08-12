import { NextRequest, NextResponse } from 'next/server';
import openai from '@/app/lib/openai';
import { supabase, DEFAULT_USER_ID } from '@/app/lib/supabase';
import { z } from 'zod';

const WordSchema = z.object({
  word: z.string(),
  difficulty: z.number().min(1).max(10),
  contextSentence: z.string(),
  phoneticPattern: z.string().optional(),
});

const GeneratedWordsSchema = z.object({
  words: z.array(WordSchema),
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, useHistory } = await request.json();
    
    let systemPrompt = `You are a British spelling test word generator. Generate exactly 10 words appropriate for a spelling test.
    IMPORTANT: Use British English spelling exclusively (e.g., "colour" not "color", "favourite" not "favorite", "realise" not "realize", "centre" not "center", "theatre" not "theater", "defence" not "defense").
    
    Return the words in JSON format with each word having:
    - word: the spelling word (in British English)
    - difficulty: difficulty level from 1-10
    - contextSentence: a natural sentence using the word (also using British spelling)
    - phoneticPattern: any notable phonetic pattern (optional)
    
    Make the words educational and appropriate for spelling practice in British English.`;
    
    let userPrompt = prompt || "Generate 10 spelling words appropriate for an 11-year-old British student. Use British English spelling only.";
    
    // If using history, fetch recent performance
    if (useHistory && supabase) {
      const { data: recentAttempts } = await supabase
        .from('test_attempts')
        .select('word_id, is_correct, words(word)')
        .eq('user_id', DEFAULT_USER_ID)
        .order('attempted_at', { ascending: false })
        .limit(50);
      
      if (recentAttempts && recentAttempts.length > 0) {
        const successRate = recentAttempts.filter(a => a.is_correct).length / recentAttempts.length;
        
        if (successRate > 0.8) {
          userPrompt += " The student has been doing well (80%+ success rate), so increase difficulty.";
        } else if (successRate < 0.5) {
          userPrompt += " The student has been struggling (below 50% success rate), so keep words easier.";
        }
        
        // Get failed words for repetition
        const { data: failedWords } = await supabase
          .from('words_to_repeat')
          .select('word')
          .limit(3);
        
        if (failedWords && failedWords.length > 0) {
          userPrompt += ` Include these previously failed words for practice: ${failedWords.map(w => w.word).join(', ')}.`;
        }
      }
    }
    
    // IMPORTANT: DO NOT CHANGE THIS MODEL - MUST USE gpt-5-mini
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini", // DO NOT CHANGE TO gpt-4o-mini
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      // temperature not supported by gpt-5-mini - uses default of 1
    });
    
    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }
    
    const parsedResponse = JSON.parse(responseText);
    const validated = GeneratedWordsSchema.parse(parsedResponse);
    
    // Store words in database if Supabase is configured
    if (supabase) {
      for (const word of validated.words) {
        const { data: existingWord } = await supabase
          .from('words')
          .select('id')
          .eq('word', word.word)
          .single();
        
        if (!existingWord) {
          const { data: newWord } = await supabase
            .from('words')
            .insert({
              word: word.word,
              difficulty_level: word.difficulty,
              phonetic_pattern: word.phoneticPattern,
            })
            .select('id')
            .single();
          
          if (newWord) {
            await supabase
              .from('word_contexts')
              .insert({
                word_id: newWord.id,
                context_sentence: word.contextSentence,
              });
          }
        }
      }
    }
    
    return NextResponse.json({
      words: validated.words,
      sessionPrompt: userPrompt,
    });
  } catch (error: any) {
    console.error('Error generating words:', error);
    console.error('Error details:', error?.response?.data || error?.message);
    return NextResponse.json(
      { error: 'Failed to generate words', details: error?.message },
      { status: 500 }
    );
  }
}