import { createDbClient } from './_db.mjs';

const client = createDbClient({ connectionTimeoutMillis: 8000 });

await client.connect();

const { rows } = await client.query(`
  SELECT 
    c.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    CASE WHEN kcu.column_name IS NOT NULL THEN 'PK' ELSE '' END as pk
  FROM information_schema.columns c
  LEFT JOIN information_schema.key_column_usage kcu
    ON c.table_name = kcu.table_name 
    AND c.column_name = kcu.column_name
    AND kcu.constraint_name IN (
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE constraint_type = 'PRIMARY KEY' AND table_schema = 'public'
    )
  WHERE c.table_schema = 'public'
  ORDER BY c.table_name, c.ordinal_position
`);

let currentTable = '';
for (const row of rows) {
  if (row.table_name !== currentTable) {
    currentTable = row.table_name;
    console.log(`\n[${currentTable}]`);
  }
  const len = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
  const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
  const pk = row.pk ? ' PK' : '';
  const def = row.column_default ? ` DEFAULT ${row.column_default}` : '';
  console.log(`  ${row.column_name.padEnd(25)} ${(row.data_type + len).padEnd(25)} ${nullable}${pk}${def}`);
}

await client.end();
