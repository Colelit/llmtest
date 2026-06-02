#!/usr/bin/env python3
"""
RIA评测系统题目分组设置脚本 v2
使用直接SQL执行
"""
import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.export_supabase import get_client

def execute_sql(client, sql):
    """直接执行SQL语句"""
    try:
        result = client.rpc('exec_sql', {'sql': sql})
        return result
    except Exception as e:
        print(f"[ERROR] SQL execution failed: {e}")
        return None

def setup_database_migration(client):
    """
    执行数据库迁移，添加必要的字段和表
    """
    print("[INFO] Starting database migration...")

    # 1. 添加新字段到 submissions 表
    migration_queries = [
        """
        ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS group_index INTEGER;
        """,
        """
        ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS question_set TEXT[];
        """,
        """
        ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS is_fixed_question BOOLEAN DEFAULT FALSE;
        """
    ]

    for query in migration_queries:
        try:
            result = execute_sql(client, query)
            print(f"[OK] Execute migration: {query[:50]}...")
        except Exception as e:
            print(f"[WARN] Migration may already exist: {e}")

    print("[OK] Database migration completed")

def create_question_groups_table(client):
    """
    创建题目分组配置表
    """
    print("\n[INFO] Creating question groups table...")

    create_table_query = """
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
    """

    try:
        result = execute_sql(client, create_table_query)
        print("[OK] Question groups table created successfully")
    except Exception as e:
        print(f"[WARN] Table may already exist: {e}")

def initialize_question_groups(client):
    """
    初始化题目分组数据
    """
    print("\n[INFO] Initializing question groups...")

    question_groups = [
        (0, "q1", "q2", "q3"),
        (1, "q4", "q5", "q6"),
        (2, "q7", "q8", "q9")
    ]

    for group_index, q1, q2, q3 in question_groups:
        try:
            # 使用SQL直接插入
            insert_query = f"""
            INSERT INTO question_groups (group_index, question_ids, target_users, current_users, is_active)
            VALUES ({group_index}, ARRAY['{q1}', '{q2}', '{q3}'], 3, 0, TRUE)
            ON CONFLICT (group_index) DO NOTHING;
            """

            result = execute_sql(client, insert_query)
            print(f"[OK] Create group {group_index}: ['{q1}', '{q2}', '{q3}']")

        except Exception as e:
            print(f"[ERROR] Create group {group_index} failed: {e}")

def assign_existing_users(client):
    """
    为现有已完成的用户分配组别
    """
    print("\n[INFO] Assigning groups to existing users...")

    try:
        # 查询所有 v2 版本且状态为 completed 的用户
        result = client.table('submissions').select('*').eq('version', 'v2').eq('status', 'completed').execute()

        if not result.data:
            print("[WARN] No completed users found to assign")
            return

        print(f"[INFO] Found {len(result.data)} completed users")

        # 为每个用户分配组别（简单轮询分配）
        for i, user in enumerate(result.data):
            group_index = i % 3  # 轮询分配到组0,1,2

            # 获取对应的题目集合
            groups_result = execute_sql(client, f"SELECT question_ids, current_users FROM question_groups WHERE group_index = {group_index}")

            if groups_result and 'data' in groups_result and len(groups_result['data']) > 0:
                question_ids = groups_result['data'][0]['question_ids']
                current_users = groups_result['data'][0]['current_users']
                question_set = ["q0"] + question_ids  # 固定题目 + 分组题目

                # 更新用户记录
                update_query = f"""
                UPDATE submissions
                SET group_index = {group_index},
                    question_set = ARRAY['{"', '".join(question_set)}']
                WHERE id = {user['id']};
                """

                execute_sql(client, update_query)
                print(f"[OK] User {user['user_name']} assigned to group {group_index}, questions: {question_set}")

                # 更新分组的用户计数
                increment_query = f"""
                UPDATE question_groups
                SET current_users = {current_users + 1}
                WHERE group_index = {group_index};
                """

                execute_sql(client, increment_query)

    except Exception as e:
        print(f"[ERROR] Assign users failed: {e}")

def get_group_statistics(client):
    """
    获取各组统计信息
    """
    print("\n[STATISTICS] Current group statistics:")

    try:
        result = execute_sql(client, "SELECT * FROM question_groups ORDER BY group_index")

        if result and 'data' in result:
            for group in result['data']:
                progress = (group['current_users'] / group['target_users']) * 100
                print(f"Group {group['group_index']}: {group['question_ids']} - {group['current_users']}/{group['target_users']} users ({progress:.1f}%)")
        else:
            print("[WARN] No group data found")

    except Exception as e:
        print(f"[ERROR] Get statistics failed: {e}")

def main():
    print("=" * 60)
    print("RIA Evaluation System Question Groups Setup v2")
    print("=" * 60)

    try:
        client = get_client()

        # 1. 数据库迁移
        setup_database_migration(client)

        # 2. 创建分组表
        create_question_groups_table(client)

        # 3. 初始化分组配置
        initialize_question_groups(client)

        # 4. 为现有用户分配组别
        assign_existing_users(client)

        # 5. 显示统计信息
        get_group_statistics(client)

        print("\n" + "=" * 60)
        print("[OK] Setup completed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Setup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()