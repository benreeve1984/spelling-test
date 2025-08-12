const { createReadStream } = require('fs');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse');
const { sql } = require('@vercel/postgres');

// Load env from .env.local if present
try {
  const dotenvPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(dotenvPath)) {
    require('dotenv').config({ path: dotenvPath });
  }
} catch (_) {}

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

async function run() {
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is required');
    process.exit(1);
  }

  const csvPath = path.resolve(process.cwd(), 'uk_spelling_smart9_v0.csv');
  const rows = [];

  await new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(parse({ columns: true, trim: true }))
      .on('data', (r) => rows.push(r))
      .on('end', resolve)
      .on('error', reject);
  });

  for (const r of rows) {
    const word = String(r.word || '').trim();
    if (!word) continue;

    const diff100 = Number(r.difficulty_0_100);
    const normalized = Math.max(1, Math.min(10, Math.round(diff100 / 10)));
    const level = String((r.level || '').toLowerCase() || null);
    const letters = r.letters ? Number(r.letters) : null;
    const syllables = r.syllables ? Number(r.syllables) : null;
    const tags = r.tags ? String(r.tags) : null;

    await sql`
      insert into words (word, difficulty_0_100, normalized_difficulty, level, letters, syllables, tags)
      values (${word}, ${diff100}, ${normalized}, ${level}, ${letters}, ${syllables}, ${tags})
      on conflict (word) do update set
        difficulty_0_100 = excluded.difficulty_0_100,
        normalized_difficulty = excluded.normalized_difficulty,
        level = excluded.level,
        letters = excluded.letters,
        syllables = excluded.syllables,
        tags = excluded.tags;
    `;
  }

  console.log(`Seeded ${rows.length} rows.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


