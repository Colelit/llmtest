-- ============================================================
-- 删除 v2 题包中 q10 的数据
-- 执行前请确认已备份重要数据
-- 在 Supabase Dashboard → SQL Editor → New query 中执行
-- ============================================================

-- 1. 从 submissions 表中删除 v2 记录的 evaluation_data 里的 q10 键
-- 注意：Supabase 的 JSONB 删除键需要使用 jsonb 操作符
UPDATE submissions
SET evaluation_data = evaluation_data - 'q10'
WHERE version = 'v2' AND evaluation_data ? 'q10';

-- 2. 从 user_progress 表中删除 v2 且 question_id = 'q10' 的记录
DELETE FROM user_progress
WHERE version = 'v2' AND question_id = 'q10';

-- 3. 验证清理结果
SELECT user_name, evaluation_data ? 'q10' as has_q10
FROM submissions
WHERE version = 'v2';
