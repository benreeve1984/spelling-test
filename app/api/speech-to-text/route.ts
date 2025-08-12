import { NextRequest, NextResponse } from 'next/server';
import openai from '@/app/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const targetWord = formData.get('targetWord') as string;
    
    console.log('Received audio file:', {
      name: audioFile?.name,
      size: audioFile?.size,
      type: audioFile?.type,
    });
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }
    
    // Check file size first
    if (audioFile.size === 0) {
      console.error('Audio file has zero size');
      return NextResponse.json(
        { error: 'Audio file is empty or corrupted' },
        { status: 400 }
      );
    }
    
    // Convert audio to base64 for GPT-4o audio input
    const audioBuffer = await audioFile.arrayBuffer();
    
    // Check if audio data is empty
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      console.error('Audio buffer is empty after conversion');
      return NextResponse.json(
        { error: 'Audio file is empty or corrupted' },
        { status: 400 }
      );
    }
    
    console.log('Audio buffer size:', audioBuffer.byteLength);
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    console.log('Base64 audio length:', base64Audio.length);
    
    // Try GPT-4o with audio input first, with fallback to standard transcription
    let result: any;
    
    try {
      // Attempt to use GPT-4o with audio input
      const response = await openai.chat.completions.create({
      model: 'gpt-4o-audio-preview',
      modalities: ['text', 'audio'] as any, // Type assertion to bypass SDK limitation
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
          ] as any // Move type assertion to entire content array
        }
      ],
      response_format: { type: 'json_object' },
      // Remove max_tokens/max_completion_tokens - not needed for audio model
    } as any); // Add type assertion to entire call
      
      result = JSON.parse(response.choices[0].message.content || '{}');
      console.log('GPT-4o audio result:', result);
      
    } catch (audioError: any) {
      console.log('GPT-4o audio failed, using standard transcription + GPT-5-mini');
      console.error('Audio error:', audioError?.message);
      
      // Fallback: Use standard transcription then GPT-5-mini for interpretation
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1', // Standard transcription model
        language: 'en',
        prompt: 'The user is spelling a word phonetically using letter names like "ay", "bee", "see", etc.',
      });
      
      console.log('Whisper transcription:', transcription.text);
      
      // Use GPT-5-mini to interpret the phonetic spelling
      const interpretation = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `Convert phonetic letter pronunciations to actual letters.
            Common: ay=A, bee=B, see=C, dee=D, ee=E, eff=F, gee=G, aitch=H, eye=I, jay=J, kay=K, el=L, em=M, en=N, oh=O, pee=P, queue=Q, ar=R, ess=S, tea=T, you=U, vee=V, double you=W, ex=X, why=Y, zed/zee=Z.
            Return JSON: {"spelling": "letters"}`
          },
          {
            role: 'user',
            content: `Convert: "${transcription.text}" (target word: "${targetWord}")`
          }
        ],
        response_format: { type: 'json_object' },
        // Remove max_tokens for gpt-5-mini
      });
      
      const spellingResult = JSON.parse(interpretation.choices[0].message.content || '{}');
      result = {
        transcription: transcription.text,
        spelling: spellingResult.spelling || ''
      };
    }
    
    console.log('Final result:', result);
    
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