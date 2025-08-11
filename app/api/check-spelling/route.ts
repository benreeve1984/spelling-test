import { NextRequest, NextResponse } from 'next/server';
import { checkSpelling } from '@/app/lib/phonetic';

export async function POST(request: NextRequest) {
  try {
    const { word, phoneticSpelling } = await request.json();
    
    if (!word || !phoneticSpelling) {
      return NextResponse.json(
        { error: 'Word and phonetic spelling are required' },
        { status: 400 }
      );
    }
    
    const result = checkSpelling(word, phoneticSpelling);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking spelling:', error);
    return NextResponse.json(
      { error: 'Failed to check spelling' },
      { status: 500 }
    );
  }
}