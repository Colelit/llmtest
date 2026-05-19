-- ============================================================
-- RIA 评测平台 - Supabase 表结构初始化
-- 新项目: anajwugnvwqexznyapkx
-- 在 Supabase Dashboard → SQL Editor → New query 中执行
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
    bucket_index bigint,
    version text DEFAULT 'v1' CHECK (version IN ('v1', 'v2'))
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
    version text DEFAULT 'v1' CHECK (version IN ('v1', 'v2')),
    UNIQUE (user_id, question_id, model_id, version)
);

-- 3. 创建索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_submissions_user_name ON submissions(user_name);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_bucket_index ON submissions(bucket_index);
CREATE INDEX IF NOT EXISTS idx_submissions_version ON submissions(version);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_question_id ON user_progress(question_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_version ON user_progress(version);

-- 4. 启用 RLS（Row Level Security）
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - 允许匿名用户读写（RIA 评测平台无登录系统，以 user_name/user_id 隔离）
-- submissions 表策略
CREATE POLICY "Allow anon select on submissions"
    ON submissions FOR SELECT
    TO anon USING (true);

CREATE POLICY "Allow anon insert on submissions"
    ON submissions FOR INSERT
    TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on submissions"
    ON submissions FOR UPDATE
    TO anon USING (true);

-- user_progress 表策略
CREATE POLICY "Allow anon select on user_progress"
    ON user_progress FOR SELECT
    TO anon USING (true);

CREATE POLICY "Allow anon insert on user_progress"
    ON user_progress FOR INSERT
    TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on user_progress"
    ON user_progress FOR UPDATE
    TO anon USING (true);

CREATE POLICY "Allow anon delete on user_progress"
    ON user_progress FOR DELETE
    TO anon USING (true);
