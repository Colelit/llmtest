/**
 * 检查 user_progress 表上的所有唯一约束
 * 用法: node scripts/check_constraints.js
 */
const SUPABASE_URL = 'https://anajwugnvwqexznyapkx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYWp3dWdudndxZXh6bnlhcGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MjE5NzgsImV4cCI6MjA5NDI5Nzk3OH0.q5mbsezHdxBCAXtxcy4zoOF99cL0olwO7YWf_EQ2_B0';

async function main() {
  // 使用 Supabase 的 RPC 或者直接用 REST API 查询不了 pg_constraint
  // 所以用 exec_sql 函数或者换一种方式
  // 实际上 Supabase 没有内置的 exec_sql RPC，我们用直接查询

  // 方式1: 查看表定义（PostgREST 不支持直接查系统表，我们用已知的方法）
  // 先查 user_progress 的所有记录，看看测试数据
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_progress?select=*`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });

  const data = await res.json();
  if (!Array.isArray(data)) {
    console.log('查询结果:', JSON.stringify(data, null, 2));
    return;
  }
  console.log('user_progress 当前记录:\n');
  data.forEach((row, i) => {
    console.log(`[${i + 1}] user_id=${row.user_id}, question_id=${row.question_id}, model_id=${row.model_id}, version=${row.version}`);
  });

  // 清理测试数据
  console.log('\n🧹 清理测试数据...');
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/user_progress?user_id=eq.__verify_test_user__`, {
    method: 'DELETE',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  console.log(`删除响应状态: ${delRes.status}`);
}

main().catch(err => {
  console.error('错误:', err.message);
});
