-- RIA评测系统题目分组数据库设置脚本
-- 请在 Supabase SQL 编辑器中执行以下SQL语句

-- 1. 添加新字段到 submissions 表
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS group_index INTEGER;

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS question_set TEXT[];

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS is_fixed_question BOOLEAN DEFAULT FALSE;

-- 2. 创建题目分组配置表
CREATE TABLE IF NOT EXISTS question_groups (
    id SERIAL PRIMARY KEY,
    group_index INTEGER UNIQUE NOT NULL,
    question_ids TEXT[] NOT NULL,
    target_users INTEGER DEFAULT 3,
    current_users INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 初始化题目分组数据
INSERT INTO question_groups (group_index, question_ids, target_users, current_users, is_active)
VALUES
    (0, ARRAY['q1', 'q2', 'q3'], 3, 0, TRUE),
    (1, ARRAY['q4', 'q5', 'q6'], 3, 0, TRUE),
    (2, ARRAY['q7', 'q8', 'q9'], 3, 0, TRUE)
ON CONFLICT (group_index) DO NOTHING;

-- 4. 为现有已完成用户分配组别 (假设有3个用户，ID分别为28, 31, 35)
-- 请根据实际情况调整用户ID
UPDATE submissions
SET group_index = 0,
    question_set = ARRAY['q0', 'q1', 'q2', 'q3']
WHERE id = 28 AND version = 'v2' AND status = 'completed';

UPDATE submissions
SET group_index = 1,
    question_set = ARRAY['q0', 'q4', 'q5', 'q6']
WHERE id = 31 AND version = 'v2' AND status = 'completed';

UPDATE submissions
SET group_index = 2,
    question_set = ARRAY['q0', 'q7', 'q8', 'q9']
WHERE id = 35 AND version = 'v2' AND status = 'completed';

-- 5. 更新分组的用户计数
UPDATE question_groups
SET current_users = current_users + 1
WHERE group_index = 0;

UPDATE question_groups
SET current_users = current_users + 1
WHERE group_index = 1;

UPDATE question_groups
SET current_users = current_users + 1
WHERE group_index = 2;

-- 6. 验证设置
SELECT '=== Question Groups ===' as info;
SELECT * FROM question_groups ORDER BY group_index;

SELECT '=== User Assignments ===' as info;
SELECT id, user_name, group_index, question_set, status
FROM submissions
WHERE version = 'v2'
ORDER BY id;