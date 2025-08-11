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
    
    let systemPrompt = `You are a spelling test word generator. Generate exactly 10 words appropriate for a spelling test.
    Return the words in JSON format with each word having:
    - word: the spelling word
    - difficulty: difficulty level from 1-10
    - contextSentence: a natural sentence using the word
    - phoneticPattern: any notable phonetic pattern (optional)
    
    Make the words educational and appropriate for spelling practice.`;
    
    let userPrompt = prompt || "Generate 10 spelling words appropriate for an 11-year-old student.";
    
    // If using history, fetch recent performance
    if (useHistory) {
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
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }
    
    const parsedResponse = JSON.parse(responseText);
    const validated = GeneratedWordsSchema.parse(parsedResponse);
    
    // Store words in database
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
    
    return NextResponse.json({
      words: validated.words,
      sessionPrompt: userPrompt,
    });
  } catch (error) {
    console.error('Error generating words:', error);
    return NextResponse.json(
      { error: 'Failed to generate words' },
      { status: 500 }
    );
  }
}