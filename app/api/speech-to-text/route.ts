import { NextRequest, NextResponse } from 'next/server';
import openai from '@/app/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const targetWord = formData.get('targetWord') as string;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }
    
    // Convert audio to base64 for GPT-4o audio input
    const audioBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    // Use GPT-4o with audio input through chat completions
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-audio-preview', // GPT-4o with audio capabilities
      modalities: ['text', 'audio'],
      messages: [
        {
          role: 'system',
          content: `You are a spelling test assistant. The user will speak letters phonetically to spell a word.
          Listen carefully and convert the phonetic pronunciation to actual letters.
          
          Common phonetic pronunciations:
          - "ay" or "aye" = A
          - "bee" or "be" = B  
          - "see" or "sea" = C
          - "dee" = D
          - "ee" or "e" = E
          - "eff" or "ef" = F
          - "gee" or "jee" = G
          - "aitch" or "ach" = H
          - "eye" or "i" = I
          - "jay" or "j" = J
          - "kay" or "k" = K
          - "el" or "ell" = L
          - "em" = M
          - "en" = N
          - "oh" or "o" = O
          - "pee" or "pe" = P
          - "queue" or "cue" or "kew" = Q
          - "ar" or "arr" = R
          - "ess" or "es" = S
          - "tea" or "tee" or "te" = T
          - "you" or "u" = U
          - "vee" or "ve" = V
          - "double you" or "double u" = W
          - "ex" or "eks" = X
          - "why" or "y" = Y
          - "zed" or "zee" = Z
          
          Return a JSON object with:
          - "transcription": what you heard the user say
          - "spelling": the word spelled out in lowercase letters
          
          For example, if you hear "bee eye gee", return:
          {"transcription": "bee eye gee", "spelling": "big"}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `The user is trying to spell the word "${targetWord}". Listen to their phonetic spelling in the audio.`
            },
            {
              type: 'input_audio',
              input_audio: {
                data: base64Audio,
                format: 'webm'
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      // temperature not supported by some models - use default
      max_tokens: 100,
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    console.log('Transcription:', result.transcription);
    console.log('Interpreted spelling:', result.spelling);
    
    return NextResponse.json({
      text: result.transcription || '',
      spelledWord: result.spelling || '',
    });
  } catch (error: any) {
    console.error('Error processing audio:', error);
    console.error('Error details:', error?.response?.data || error?.message);
    return NextResponse.json(
      { 
        error: 'Failed to process audio',
        details: error?.message || 'Unknown error',
        modelError: error?.response?.data?.error?.message
      },
      { status: 500 }
    );
  }
}