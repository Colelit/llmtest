/**
 * 验证 submissions 和 user_progress 表是否已有 bucket_index 列
 * 用法: node scripts/verify_bucket_index.js
 */
const SUPABASE_URL = 'https://anajwugnvwqexznyapkx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYWp3dWdudndxZXh6bnlhcGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MjE5NzgsImV4cCI6MjA5NDI5Nzk3OH0.q5mbsezHdxBCAXtxcy4zoOF99cL0olwO7YWf_EQ2_B0';

async function testColumn(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=bucket_index&limit=1`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  if (res.ok) {
    console.log(`✅ ${table}: bucket_index 列已存在`);
    return true;
  }
  const err = await res.json();
  if (err.message?.includes("Could not find the 'bucket_index' column")) {
    console.log(`❌ ${table}: bucket_index 列不存在`);
    return false;
  }
  if (err.message?.includes("Could not find the table")) {
    console.log(`❌ ${table}: 表不存在`);
    return false;
  }
  console.log(`⚠️ ${table}: 未知错误 -`, err.message);
  return false;
}

async function countRows(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Prefer: 'count=exact',
    },
  });
  const count = res.headers.get('content-range')?.match(/\d+\/(\d+)/)?.[1] || '?';
  console.log(`   📊 ${table} 记录数: ${count}`);
}

async function main() {
  console.log('验证 Supabase 表结构...\n');
  const s = await testColumn('submissions');
  if (s) await countRows('submissions');
  const u = await testColumn('user_progress');
  if (u) await countRows('user_progress');
  console.log('\n' + (s && u ? '全部通过 ✅' : '仍有缺失 ❌'));
  process.exit(s && u ? 0 : 1);
}

main();
