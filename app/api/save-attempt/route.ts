import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function POST(req: NextRequest) {
  try {
    const {
      userId = DEFAULT_USER_ID,
      sessionId,
      wordId,
      userSpelling,
      isCorrect,
      feedback,
      audioDurationMs,
    } = await req.json();

    if (!wordId || typeof isCorrect !== 'boolean') {
      return NextResponse.json({ error: 'wordId and isCorrect required' }, { status: 400 });
    }

    // Ensure user + settings
    await sql`insert into users (id) values (${userId}) on conflict (id) do nothing;`;
    await sql`insert into user_settings (user_id) values (${userId}) on conflict (user_id) do nothing;`;

    // Create session if none
    let finalSessionId = sessionId;
    if (!finalSessionId) {
      const { rows } = await sql`
        insert into test_sessions (user_id) values (${userId})
        returning id;
      `;
      finalSessionId = rows[0].id;
    }

    // Insert attempt
    const { rows: attemptRows } = await sql`
      insert into test_attempts (session_id, user_id, word_id, user_spelling, is_correct, feedback, audio_duration_ms)
      values (${finalSessionId}, ${userId}, ${wordId}, ${userSpelling || ''}, ${isCorrect}, ${feedback || ''}, ${audioDurationMs || null})
      returning id;
    `;

    // Update rolling performance
    await sql`
      insert into user_word_performance (user_id, word_id, attempts, correct, last_attempted_at)
      values (${userId}, ${wordId}, 1, ${isCorrect ? 1 : 0}, now())
      on conflict (user_id, word_id) do update set
        attempts = user_word_performance.attempts + 1,
        correct = user_word_performance.correct + ${isCorrect ? 1 : 0},
        last_attempted_at = now();
    `;

    // Check if session has 10 attempts; if so, nudge difficulty based on last 20 attempts
    const { rows: attemptCount } = await sql`
      select count(*)::int as c from test_attempts where session_id = ${finalSessionId};
    `;
    if (attemptCount[0].c >= 10) {
      const { rows: last20 } = await sql`
        select is_correct from test_attempts where user_id = ${userId}
        order by attempted_at desc limit 20;
      `;
      const total = last20.length || 1;
      const correct = last20.filter((r: any) => r.is_correct).length;
      const acc = correct / total;
      let delta = 0;
      if (acc >= 0.8) delta = 1; else if (acc <= 0.5) delta = -1;
      if (delta !== 0) {
        await sql`
          update user_settings
          set target_difficulty = least(10, greatest(1, target_difficulty + ${delta})), updated_at = now()
          where user_id = ${userId};
        `;
      }
    }

    return NextResponse.json({ success: true, sessionId: finalSessionId, attemptId: attemptRows[0].id });
  } catch (e: any) {
    console.error('save-attempt error', e);
    return NextResponse.json({ error: 'Failed to save attempt', details: e?.message }, { status: 500 });
  }
}


