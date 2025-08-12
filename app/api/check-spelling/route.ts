import { NextRequest, NextResponse } from 'next/server';
import openai from '@/app/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { word, userSpelling } = await request.json();

    if (!word || !userSpelling) {
      return NextResponse.json({ error: 'Word and user spelling are required' }, { status: 400 });
    }

    const correctWord = String(word).trim().toLowerCase();
    const userWord = String(userSpelling).trim().toLowerCase();
    const isCorrect = correctWord === userWord;

    let feedback = '';
    if (isCorrect) {
      feedback = 'Perfect! You spelled it correctly.';
    } else {
      const feedbackResponse: any = await openai.responses.create({
        model: 'gpt-5-mini',
        input:
          'You are a helpful spelling tutor. Provide brief, encouraging feedback about a spelling mistake. Keep it under 2 sentences.\n' +
          `The correct spelling is "${word}". The student spelled it as "${userSpelling}". Give brief, specific feedback and encouragement.`,
        max_output_tokens: 80,
      });
      feedback = feedbackResponse.output_text || feedbackResponse?.choices?.[0]?.message?.content || `The correct spelling is "${word}".`;
    }

    return NextResponse.json({ isCorrect, userSpelling: userWord, feedback });
  } catch (error: any) {
    console.error('Error checking spelling:', error);
    return NextResponse.json({ error: 'Failed to check spelling', details: error?.message }, { status: 500 });
  }
}