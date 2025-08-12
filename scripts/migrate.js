// Simple migration runner for Vercel Postgres
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');
// Load environment from .env.local when running locally
try {
  const dotenvPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(dotenvPath)) {
    require('dotenv').config({ path: dotenvPath });
  }
} catch (_) {}

// Fallback: allow DATABASE_URL as alias for POSTGRES_URL
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

function run() {
  const file = path.resolve(__dirname, '..', 'db', 'migrations', '001_init.sql');
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is required');
    process.exit(1);
  }
  const sql = fs.readFileSync(file, 'utf8');
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  client.connect()
    .then(() => client.query(sql))
    .then(() => client.end())
    .then(() => console.log('Migration complete'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

run();


