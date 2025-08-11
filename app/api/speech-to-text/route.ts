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
    
    // Use the new gpt-4o-audio model for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-audio-2025-01-20',
      language: 'en',
      prompt: 'The user is spelling a word phonetically using letter names like "ay", "bee", "see", etc.',
    });
    
    console.log('Raw transcription:', transcription.text);
    
    // Then use gpt-5-mini to interpret the phonetic spelling  
    const interpretation = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are a spelling test assistant. The user has spoken letters phonetically to spell a word.
          Convert the phonetic pronunciation to actual letters.
          
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
          - "spelling": the word spelled out in lowercase letters
          
          For example, if the input is "bee eye gee", return:
          {"spelling": "big"}`
        },
        {
          role: 'user',
          content: `The user said: "${transcription.text}"\n\nThey are trying to spell the word "${targetWord}". What letters did they spell?`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 50,
    });
    
    const result = JSON.parse(interpretation.choices[0].message.content || '{}');
    
    console.log('Interpreted spelling:', result.spelling);
    
    return NextResponse.json({
      text: transcription.text,
      spelledWord: result.spelling || '',
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}