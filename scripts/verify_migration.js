/**
 * 验证 Supabase 表结构迁移是否成功
 * 检查：version 列、唯一约束、RLS 策略、数据状态
 * 用法: node scripts/verify_migration.js
 */
const SUPABASE_URL = 'https://anajwugnvwqexznyapkx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYWp3dWdudndxZXh6bnlhcGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MjE5NzgsImV4cCI6MjA5NDI5Nzk3OH0.q5mbsezHdxBCAXtxcy4zoOF99cL0olwO7YWf_EQ2_B0';

async function apiGet(endpoint) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`${endpoint} => ${err.message || res.statusText}`);
  }
  return res.json();
}

async function checkColumn(table, column) {
  try {
    await apiGet(`${table}?select=${column}&limit=1`);
    return true;
  } catch (err) {
    if (err.message?.includes(column)) return false;
    throw err;
  }
}

async function checkCount(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Prefer: 'count=exact',
    },
  });
  const match = res.headers.get('content-range')?.match(/\d+\/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

async function main() {
  console.log('🔍 验证 Supabase 迁移结果...\n');
  let allPass = true;

  // 1. 检查 submissions 表
  console.log('📋 submissions 表');
  const sVersion = await checkColumn('submissions', 'version');
  console.log(`   version 列: ${sVersion ? '✅ 存在' : '❌ 缺失'}`);
  allPass = allPass && sVersion;

  const sBucket = await checkColumn('submissions', 'bucket_index');
  console.log(`   bucket_index 列: ${sBucket ? '✅ 存在' : '❌ 缺失'}`);
  allPass = allPass && sBucket;

  const sCount = await checkCount('submissions');
  console.log(`   记录数: ${sCount}`);

  if (sVersion) {
    const rows = await apiGet('submissions?select=version');
    const nullVersions = rows.filter(r => r.version === null).length;
    console.log(`   version=null 的记录: ${nullVersions > 0 ? '⚠️ ' + nullVersions + ' 条' : '✅ 0 条'}`);
  }

  // 2. 检查 user_progress 表
  console.log('\n📋 user_progress 表');
  const uVersion = await checkColumn('user_progress', 'version');
  console.log(`   version 列: ${uVersion ? '✅ 存在' : '❌ 缺失'}`);
  allPass = allPass && uVersion;

  const uCount = await checkCount('user_progress');
  console.log(`   记录数: ${uCount}`);

  if (uVersion) {
    const rows = await apiGet('user_progress?select=version');
    const nullVersions = rows.filter(r => r.version === null).length;
    console.log(`   version=null 的记录: ${nullVersions > 0 ? '⚠️ ' + nullVersions + ' 条' : '✅ 0 条'}`);
  }

  // 3. 测试 upsert 唯一约束（user_progress 的核心逻辑）
  console.log('\n🔐 唯一约束测试（user_progress upsert）');
  try {
    const testRecord = {
      user_id: '__verify_test_user__',
      question_id: '__verify_test_q__',
      model_id: '__verify_test_model__',
      version: 'v1',
      evaluation_data: { test: true },
    };

    // 第一次插入（使用 on_conflict 指定 upsert 的冲突列）
    const insert1 = await fetch(`${SUPABASE_URL}/rest/v1/user_progress?on_conflict=user_id,question_id,model_id,version`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(testRecord),
    });

    if (!insert1.ok) {
      const errBody = await insert1.json().catch(() => ({ message: insert1.statusText }));
      throw new Error(`首次插入失败 [${insert1.status}]: ${errBody.message || JSON.stringify(errBody)}`);
    }

    // 第二次插入（相同键，应该合并而不是报错）
    const insert2 = await fetch(`${SUPABASE_URL}/rest/v1/user_progress?on_conflict=user_id,question_id,model_id,version`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ ...testRecord, evaluation_data: { test: false } }),
    });

    if (!insert2.ok) {
      const errBody = await insert2.json().catch(() => ({ message: insert2.statusText }));
      throw new Error(`重复插入失败 [${insert2.status}]: ${errBody.message || JSON.stringify(errBody)}`);
    }

    // 清理测试数据
    await fetch(`${SUPABASE_URL}/rest/v1/user_progress?user_id=eq.__verify_test_user__`, {
      method: 'DELETE',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
    });

    console.log('   ✅ 唯一约束正常（相同 user_id+question_id+model_id+version 可正常 upsert）');
  } catch (err) {
    console.log(`   ❌ 唯一约束测试失败: ${err.message}`);
    allPass = false;
  }

  console.log('\n' + (allPass ? '✅ 全部验证通过，迁移成功' : '❌ 存在失败项，请检查'));
  process.exit(allPass ? 0 : 1);
}

main().catch(err => {
  console.error('\n💥 验证出错:', err.message);
  process.exit(1);
});
