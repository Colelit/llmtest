#!/usr/bin/env python3
"""
RIA评测系统题目分组设置脚本
为v2版本设置题目分组逻辑：
- 固定题目：q0
- 3个分组，每组3道题，每组需要3个用户数据
"""
import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.export_supabase import get_client

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
            client.rpc('exec_sql', {'sql': query})
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
        client.rpc('exec_sql', {'sql': create_table_query})
        print("[OK] Question groups table created successfully")
    except Exception as e:
        print(f"[WARN] Table may already exist: {e}")

def initialize_question_groups(client):
    """
    初始化题目分组数据
    """
    print("\n[INFO] Initializing question groups...")

    question_groups = [
        {
            "group_index": 0,
            "question_ids": ["q1", "q2", "q3"],
            "target_users": 3
        },
        {
            "group_index": 1,
            "question_ids": ["q4", "q5", "q6"],
            "target_users": 3
        },
        {
            "group_index": 2,
            "question_ids": ["q7", "q8", "q9"],
            "target_users": 3
        }
    ]

    for group in question_groups:
        try:
            # 检查是否已存在
            existing = client.table('question_groups').select('*').eq('group_index', group['group_index']).execute()

            if not existing.data:
                # 插入新分组
                client.table('question_groups').insert({
                    "group_index": group['group_index'],
                    "question_ids": group['question_ids'],
                    "target_users": group['target_users'],
                    "current_users": 0,
                    "is_active": True
                }).execute()
                print(f"[OK] Create group {group['group_index']}: {group['question_ids']}")
            else:
                print(f"[WARN] Group {group['group_index']} already exists, skip")

        except Exception as e:
            print(f"[ERROR] Create group {group['group_index']} failed: {e}")

def assign_existing_users(client):
    """
    为现有已完成的用户分配组别
    """
    print("\n[INFO] Assigning groups to existing users...")

    try:
        # 查询所有 v2 版本且状态为 completed 的用户
        existing_users = client.table('submissions').select('*').eq('version', 'v2').eq('status', 'completed').execute()

        if not existing_users.data:
            print("[WARN] No completed users found to assign")
            return

        print(f"[INFO] Found {len(existing_users.data)} completed users")

        # 为每个用户分配组别（简单轮询分配）
        for i, user in enumerate(existing_users.data):
            group_index = i % 3  # 轮询分配到组0,1,2

            # 获取对应的题目集合
            group_data = client.table('question_groups').select('*').eq('group_index', group_index).execute()

            if group_data.data:
                question_ids = group_data.data[0]['question_ids']
                question_set = ["q0"] + question_ids  # 固定题目 + 分组题目

                # 更新用户记录
                client.table('submissions').update({
                    'group_index': group_index,
                    'question_set': question_set
                }).eq('id', user['id']).execute()

                print(f"[OK] User {user['user_name']} assigned to group {group_index}, questions: {question_set}")

                # 更新分组的用户计数
                client.table('question_groups').update({
                    'current_users': group_data.data[0]['current_users'] + 1
                }).eq('group_index', group_index).execute()

    except Exception as e:
        print(f"[ERROR] Assign users failed: {e}")

def get_group_statistics(client):
    """
    获取各组统计信息
    """
    print("\n[STATISTICS] Current group statistics:")

    try:
        groups = client.table('question_groups').select('*').order('group_index').execute()

        if groups.data:
            for group in groups.data:
                progress = (group['current_users'] / group['target_users']) * 100
                print(f"Group {group['group_index']}: {group['question_ids']} - {group['current_users']}/{group['target_users']} users ({progress:.1f}%)")
        else:
            print("[WARN] No group data found")

    except Exception as e:
        print(f"[ERROR] Get statistics failed: {e}")

def main():
    print("=" * 60)
    print("RIA Evaluation System Question Groups Setup")
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
        sys.exit(1)

if __name__ == "__main__":
    main()