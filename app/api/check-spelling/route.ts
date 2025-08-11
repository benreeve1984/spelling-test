import { NextRequest, NextResponse } from 'next/server';
import openai from '@/app/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { word, userSpelling } = await request.json();
    
    if (!word || !userSpelling) {
      return NextResponse.json(
        { error: 'Word and user spelling are required' },
        { status: 400 }
      );
    }
    
    const correctWord = word.toLowerCase();
    const userWord = userSpelling.toLowerCase();
    const isCorrect = correctWord === userWord;
    
    let feedback = '';
    
    if (isCorrect) {
      feedback = 'Perfect! You spelled it correctly.';
    } else {
      // IMPORTANT: DO NOT CHANGE THIS MODEL - MUST USE gpt-5-mini
      const feedbackResponse = await openai.chat.completions.create({
        model: 'gpt-5-mini', // DO NOT CHANGE TO gpt-4o-mini
        messages: [
          {
            role: 'system',
            content: 'You are a helpful spelling tutor. Provide brief, encouraging feedback about a spelling mistake.'
          },
          {
            role: 'user',
            content: `The correct spelling is "${word}". The student spelled it as "${userSpelling}". Give brief, specific feedback about what went wrong and encouragement to try again. Keep it under 2 sentences.`
          }
        ],
        // temperature not supported by gpt-5-mini - uses default of 1
        max_tokens: 100,
      });
      
      feedback = feedbackResponse.choices[0].message.content || `The correct spelling is "${word}".`;
    }
    
    return NextResponse.json({
      isCorrect,
      userSpelling: userWord,
      feedback,
    });
  } catch (error) {
    console.error('Error checking spelling:', error);
    return NextResponse.json(
      { error: 'Failed to check spelling' },
      { status: 500 }
    );
  }
}