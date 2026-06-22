import { createDbClient } from './_db.mjs';

async function run() {
  const client = createDbClient();
  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL for Sprint 2 DocumentRequirement seeding.');

    const requirements = [
      { type: 'KK', isRequired: true },
      { type: 'AKTA', isRequired: true },
      { type: 'IJAZAH_TERAKHIR', isRequired: true },
      { type: 'PAS_FOTO', isRequired: true },
      { type: 'RAPORT', isRequired: false },
      { type: 'KTP_AYAH', isRequired: false },
      { type: 'KTP_IBU', isRequired: false },
      { type: 'SURAT_PINDAH', isRequired: false },
      { type: 'SERTIFIKAT', isRequired: false },
      { type: 'PRAKERIN', isRequired: false },
      { type: 'SKL', isRequired: false },
      { type: 'PENDUKUNG', isRequired: false },
    ];

    console.log('🌱 Seeding DocumentRequirements...');
    for (const req of requirements) {
      const id = `req-${req.type.toLowerCase().replace('_', '-')}`;
      await client.query(`
        INSERT INTO "DocumentRequirement" (id, type, "isRequired", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (type) DO UPDATE SET "isRequired" = EXCLUDED."isRequired", "updatedAt" = NOW()
      `, [id, req.type, req.isRequired]);
      console.log(`- ${req.type}: isRequired = ${req.isRequired}`);
    }

    const settings = [
      { key: 'APP_NAME', value: 'ARBAL' },
      { key: 'SCHOOL_NAME', value: 'PKBM Teknologi Mustaqbal' },
      { key: 'BACKUP_ENABLED', value: 'false' },
      { key: 'AUTO_PURGE_TRASH', value: 'true' },
    ];

    console.log('🌱 Clearing existing SystemSettings...');
    await client.query('DELETE FROM "SystemSetting"');

    console.log('🌱 Seeding SystemSettings...');
    for (const setting of settings) {
      const id = `setting-${setting.key.toLowerCase().replace(/_/g, '-')}`;
      await client.query(`
        INSERT INTO "SystemSetting" (id, key, value, "updatedAt")
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (key) DO NOTHING
      `, [id, setting.key, setting.value]);
      console.log(`- Setting ${setting.key} initialized.`);
    }

    console.log('✅ DocumentRequirement and SystemSetting seeding completed successfully.');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
