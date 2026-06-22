import { createDbClient } from './_db.mjs';

const client = createDbClient();

async function run() {
  try {
    await client.connect();
    console.log('Connected to database to drop schema.');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    console.log('Schema public recreated successfully (all tables and enums dropped).');
  } catch (err) {
    console.error('Failed to clear database schema:', err.message);
  } finally {
    await client.end();
  }
}

run();
