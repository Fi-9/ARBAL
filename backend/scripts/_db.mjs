import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const envPath = resolve(__dirname, '../.env');
  const envContent = readFileSync(envPath, 'utf-8');

  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      return trimmed.split('=').slice(1).join('=').replace(/^["']|["']$/g, '');
    }
  }

  throw new Error('DATABASE_URL not found in environment or .env');
}

export function createDbClient(options = {}) {
  return new pg.Client({
    connectionString: getDatabaseUrl(),
    ...options,
  });
}
