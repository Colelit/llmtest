-- ============================================================
-- RIA 评测平台 - Supabase 表结构初始化 & 迁移
-- 新项目: anajwugnvwqexznyapkx
-- 在 Supabase Dashboard → SQL Editor → New query 中执行
-- 兼容：全新数据库 + 已有数据库升级
-- ============================================================

-- 1. 创建 submissions 表（最终评测数据）
CREATE TABLE IF NOT EXISTS submissions (
    id serial PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    user_name text NOT NULL UNIQUE,
    user_profile jsonb DEFAULT '{}',
    evaluation_data jsonb DEFAULT '{}',
    duration_seconds bigint,
    status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'in-progress', 'completed')),
    bucket_index bigint
);

-- 2. 创建 user_progress 表（临时每题每模型进度）
CREATE TABLE IF NOT EXISTS user_progress (
    id serial PRIMARY KEY,
    user_id text NOT NULL,
    question_id text NOT NULL,
    model_id text NOT NULL,
    evaluation_data jsonb DEFAULT '{}',
    bucket_index bigint,
    updated_at timestamptz DEFAULT now(),
    UNIQUE (user_id, question_id, model_id)
);

-- 3. 兼容升级：为已存在的表添加 version 列
ALTER TABLE IF EXISTS submissions
ADD COLUMN IF NOT EXISTS version text DEFAULT 'v1' CHECK (version IN ('v1', 'v2'));

ALTER TABLE IF EXISTS user_progress
ADD COLUMN IF NOT EXISTS version text DEFAULT 'v1' CHECK (version IN ('v1', 'v2'));

-- 4. 兼容升级：更新 user_progress 唯一约束为包含 version
-- 先尝试删除旧约束（如果不存在则忽略）
ALTER TABLE user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_question_id_model_id_key;

-- 再尝试添加新约束（如果已存在则忽略）
DO $$
BEGIN
    ALTER TABLE user_progress
    ADD CONSTRAINT user_progress_user_id_question_id_model_id_version_key
    UNIQUE (user_id, question_id, model_id, version);
EXCEPTION WHEN duplicate_table THEN
    -- 约束已存在，无需处理
    NULL;
END $$;

-- 5. 创建索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_submissions_user_name ON submissions(user_name);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_bucket_index ON submissions(bucket_index);
CREATE INDEX IF NOT EXISTS idx_submissions_version ON submissions(version);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_question_id ON user_progress(question_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_version ON user_progress(version);

-- 6. 启用 RLS（Row Level Security）
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - 允许匿名用户读写（RIA 评测平台无登录系统，以 user_name/user_id 隔离）
-- 先删除已存在的策略，再重新创建（兼容升级）
-- submissions 表策略
DROP POLICY IF EXISTS "Allow anon select on submissions" ON submissions;
CREATE POLICY "Allow anon select on submissions"
    ON submissions FOR SELECT
    TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert on submissions" ON submissions;
CREATE POLICY "Allow anon insert on submissions"
    ON submissions FOR INSERT
    TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on submissions" ON submissions;
CREATE POLICY "Allow anon update on submissions"
    ON submissions FOR UPDATE
    TO anon USING (true);

-- user_progress 表策略
DROP POLICY IF EXISTS "Allow anon select on user_progress" ON user_progress;
CREATE POLICY "Allow anon select on user_progress"
    ON user_progress FOR SELECT
    TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert on user_progress" ON user_progress;
CREATE POLICY "Allow anon insert on user_progress"
    ON user_progress FOR INSERT
    TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on user_progress" ON user_progress;
CREATE POLICY "Allow anon update on user_progress"
    ON user_progress FOR UPDATE
    TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon delete on user_progress" ON user_progress;
CREATE POLICY "Allow anon delete on user_progress"
    ON user_progress FOR DELETE
    TO anon USING (true);
