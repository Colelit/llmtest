/**
 * 将 data/submissions_rows.json 中的历史数据导入新 Supabase 项目
 * 用法: node scripts/import_submissions.js
 */
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://anajwugnvwqexznyapkx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYWp3dWdudndxZXh6bnlhcGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MjE5NzgsImV4cCI6MjA5NDI5Nzk3OH0.q5mbsezHdxBCAXtxcy4zoOF99cL0olwO7YWf_EQ2_B0';

async function insertBatch(table, records, batchSize = 50) {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error(`❌ Batch ${i / batchSize + 1} failed:`, err.message || err);
      throw new Error(`Insert failed at batch ${i / batchSize + 1}`);
    }

    console.log(`✅ Inserted batch ${i / batchSize + 1}/${Math.ceil(records.length / batchSize)} (${batch.length} records)`);
  }
}

async function main() {
  const dataPath = path.join(__dirname, '..', 'data', 'submissions_rows.json');
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  console.log(`📊 Loaded ${raw.length} records from submissions_rows.json\n`);

  // 移除 id 字段，让数据库自动生成；bucket_index 保持 null（历史数据无此字段）
  const records = raw.map(({ id, ...rest }) => rest);

  console.log('🚀 Importing to submissions table...');
  await insertBatch('submissions', records);

  console.log('\n🎉 Import complete!');
}

main().catch(err => {
  console.error('\n💥 Import failed:', err.message);
  process.exit(1);
});
