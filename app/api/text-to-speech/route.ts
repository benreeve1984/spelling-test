import { NextRequest, NextResponse } from 'next/server';
import openai from '@/app/lib/openai';

export async function POST(request: NextRequest) {
  let requestedVoice = 'alloy';
  try {
    const { text, voice = 'alloy', speed = 1.0 } = await request.json();
    requestedVoice = voice;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Voices supported vary; keep a safe allowlist
    const validVoices = ['alloy', 'verse', 'atticus', 'aria', 'shimmer', 'nova', 'onyx', 'echo', 'fable'];
    const selectedVoice = validVoices.includes(voice) ? voice : 'alloy';

    console.log('TTS request:', { voice: selectedVoice, speed, textLength: text.length });

    const audioResponse = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: selectedVoice as any,
      input: text,
      speed,
    });

    const buffer = Buffer.from(await audioResponse.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Error generating speech:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech', details: error?.message || 'Unknown error', voice: requestedVoice },
      { status: 500 }
    );
  }
}