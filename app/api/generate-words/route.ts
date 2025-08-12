import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function POST(req: NextRequest) {
  try {
    const { userId = DEFAULT_USER_ID } = await req.json().catch(() => ({}));

    // Ensure user exists
    await sql`insert into users (id) values (${userId}) on conflict (id) do nothing;`;
    await sql`insert into user_settings (user_id) values (${userId}) on conflict (user_id) do nothing;`;

    // Fetch target difficulty
    const { rows: settings } = await sql`select target_difficulty from user_settings where user_id = ${userId}`;
    const target = Math.max(1, Math.min(10, Number(settings?.[0]?.target_difficulty ?? 5)));

    // Main candidates (include fields now; avoid array param problems later)
    const { rows: main } = await sql`
      select id, word, normalized_difficulty as difficulty
      from words
      where normalized_difficulty between ${target - 1} and ${target + 1}
      order by random() limit 6;
    `;

    // Relearn: lowest accuracy words for this user
    const { rows: relearn } = await sql`
      select w.id, w.word, w.normalized_difficulty as difficulty
      from user_word_performance uwp
      join words w on w.id = uwp.word_id
      where uwp.user_id = ${userId}
        and (case when uwp.attempts = 0 then 0 else uwp.correct::decimal/uwp.attempts end) < 0.6
      order by uwp.last_attempted_at asc nulls first
      limit 2;
    `;

    // Review: well-known but not necessarily recent
    const { rows: review } = await sql`
      select w.id, w.word, w.normalized_difficulty as difficulty
      from user_word_performance uwp
      join words w on w.id = uwp.word_id
      where uwp.user_id = ${userId}
        and uwp.attempts >= 3
        and (case when uwp.attempts = 0 then 0 else uwp.correct::decimal/uwp.attempts end) >= 0.8
      order by uwp.last_attempted_at asc nulls first
      limit 2;
    `;

    // Merge unique by id
    const byId = new Map<string, any>();
    for (const r of [...main, ...relearn, ...review]) {
      if (!byId.has(r.id)) byId.set(r.id, r);
    }

    // Top up if needed
    if (byId.size < 10) {
      const { rows: topup } = await sql`
        select id, word, normalized_difficulty as difficulty
        from words
        where normalized_difficulty between ${Math.max(1, target - 2)} and ${Math.min(10, target + 2)}
        order by random() limit 20;
      `;
      for (const r of topup) {
        if (!byId.has(r.id)) byId.set(r.id, r);
        if (byId.size >= 10) break;
      }
    }

    const words = Array.from(byId.values()).slice(0, 10).map((w) => ({
      id: w.id,
      word: w.word,
      difficulty: w.difficulty,
      contextSentence: null,
      phoneticPattern: null,
    }));

    return NextResponse.json({ words });
  } catch (e: any) {
    console.error('generate-words error', e);
    return NextResponse.json({ error: 'Failed to select words', details: e?.message }, { status: 500 });
  }
}


