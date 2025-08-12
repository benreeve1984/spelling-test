import { NextRequest, NextResponse } from 'next/server';
import openai from '@/app/lib/openai';

export async function POST(request: NextRequest) {
  let requestedVoice = 'shimmer'; // Default voice
  
  try {
    // OpenAI TTS voices: alloy, echo, fable, onyx, nova, shimmer
    // shimmer tends to sound more British than the others
    const { text, voice = 'shimmer', speed = 1.0 } = await request.json();
    requestedVoice = voice; // Store for error handling
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    // Validate voice option
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const selectedVoice = validVoices.includes(voice) ? voice : 'shimmer';
    
    console.log('TTS request:', { voice: selectedVoice, speed, textLength: text.length });
    
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: selectedVoice as any, // Type assertion for voice parameter
      input: text,
      speed: speed,
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    console.log('TTS response buffer size:', buffer.length);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating speech:', error);
    console.error('Error details:', error?.response?.data || error?.message);
    return NextResponse.json(
      { 
        error: 'Failed to generate speech',
        details: error?.message || 'Unknown error',
        voice: requestedVoice
      },
      { status: 500 }
    );
  }
}