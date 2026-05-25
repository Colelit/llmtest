-- ============================================================
-- RIA 评测平台 - 数据库清理与约束迁移脚本
-- 执行前请确认已备份重要数据
-- 在 Supabase Dashboard → SQL Editor → New query 中执行
-- ============================================================

-- 1. 删除 submissions 表中除 test1 外的所有记录
DELETE FROM submissions WHERE user_name != 'test1';

-- 2. 删除 user_progress 表中所有记录（test1 本来就没有）
DELETE FROM user_progress;

-- 3. 验证清理结果
SELECT 'submissions remaining' as check_item, COUNT(*) as count FROM submissions;
SELECT 'user_progress remaining' as check_item, COUNT(*) as count FROM user_progress;

-- 4. 修改 submissions 表唯一约束：从 user_name 改为 (user_name, version)
-- 先删除旧约束（如果存在）
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_user_name_key;
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_user_name_version_key;

-- 再添加新约束
ALTER TABLE submissions ADD CONSTRAINT submissions_user_name_version_key UNIQUE (user_name, version);

-- 5. 修改 user_progress 表唯一约束：加入 bucket_index
-- 先删除旧约束（如果存在）
ALTER TABLE user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_question_id_model_id_key;
ALTER TABLE user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_question_id_model_id_version_key;
ALTER TABLE user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_question_id_model_id_version_bucket_key;

-- 再添加新约束
ALTER TABLE user_progress
ADD CONSTRAINT user_progress_user_id_question_id_model_id_version_bucket_key
UNIQUE (user_id, question_id, model_id, version, bucket_index);

-- 6. 验证约束
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'submissions'::regclass AND contype = 'u';
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'user_progress'::regclass AND contype = 'u';
