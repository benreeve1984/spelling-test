import { NextRequest, NextResponse } from 'next/server';
import openai from '@/app/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const targetWord = (formData.get('targetWord') as string) || '';

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }
    if (audioFile.size === 0) {
      return NextResponse.json({ error: 'Audio file is empty or corrupted' }, { status: 400 });
    }

    // Latest STT model
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-mini-transcribe',
      language: 'en',
      prompt: 'The user is spelling a word phonetically using letter names like "ay", "bee", "see", etc.',
    });

    const rawText = (transcription.text || '').trim();

    // Map phonetic letters to actual letters using a lightweight model
    const interpretation: any = await openai.responses.create({
      model: 'gpt-5-mini',
      input:
        'Convert phonetic letter pronunciations to letters. Common: ay=A, bee=B, see=C, dee=D, ee=E, eff=F, gee=G, aitch=H, eye=I, jay=J, kay=K, el=L, em=M, en=N, oh=O, pee=P, queue=Q, ar=R, ess=S, tea=T, you=U, vee=V, double you=W, ex=X, why=Y, zed/zee=Z. Return JSON: {"spelling":"letters"}.\n' +
        `Convert: "${rawText}"${targetWord ? ` (target word: "${targetWord}")` : ''}`,
    });

    const interpretationText = (interpretation.output_text ?? interpretation?.choices?.[0]?.message?.content ?? '').trim();

    let spelled = '';
    try {
      if (interpretationText) {
        const spellingJson = JSON.parse(interpretationText);
        spelled = (spellingJson.spelling || '').toString();
      }
    } catch (_) {
      // Fallback: handle input like "C-O-L-O-U-R" → "colour"
      const lettersOnly = rawText.replace(/[^A-Za-z]/g, '');
      if (lettersOnly.length >= 2) {
        spelled = lettersOnly.toLowerCase();
      }
    }

    // If we still couldn't interpret, ask user to try again gracefully
    if (!spelled) {
      return NextResponse.json(
        { error: 'could_not_understand', details: "We didn't catch that clearly. Please record again." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: rawText, spelledWord: spelled });
  } catch (error: any) {
    console.error('Error processing audio:', error);
    return NextResponse.json({ error: 'Failed to process audio', details: error?.message || 'Unknown error' }, { status: 500 });
  }
}