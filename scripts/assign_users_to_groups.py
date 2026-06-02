#!/usr/bin/env python3
"""
为现有用户分配组别
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

def assign_existing_users(client):
    """
    为现有已完成的用户分配组别
    """
    print("[INFO] Assigning groups to existing users...")

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

            # 更新用户记录
            if group_index == 0:
                question_set = "ARRAY['q0', 'q1', 'q2', 'q3']"
            elif group_index == 1:
                question_set = "ARRAY['q0', 'q4', 'q5', 'q6']"
            else:
                question_set = "ARRAY['q0', 'q7', 'q8', 'q9']"

            update_query = f"""
            UPDATE submissions
            SET group_index = {group_index},
                question_set = {question_set}
            WHERE id = {user['id']};
            """

            execute_sql(client, update_query)
            print(f"[OK] User {user['user_name']} assigned to group {group_index}")

            # 更新分组的用户计数
            increment_query = f"""
            UPDATE question_groups
            SET current_users = current_users + 1
            WHERE group_index = {group_index};
            """

            execute_sql(client, increment_query)

    except Exception as e:
        print(f"[ERROR] Assign users failed: {e}")
        import traceback
        traceback.print_exc()

def get_group_statistics(client):
    """
    获取各组统计信息
    """
    print("\n[STATISTICS] Current group statistics:")

    try:
        result = execute_sql(client, "SELECT * FROM question_groups ORDER BY group_index")

        if result and 'data' in result and result['data']:
            for group in result['data']:
                progress = (group['current_users'] / group['target_users']) * 100
                print(f"Group {group['group_index']}: {group['question_ids']} - {group['current_users']}/{group['target_users']} users ({progress:.1f}%)")
        else:
            print("[WARN] No group data found")

    except Exception as e:
        print(f"[ERROR] Get statistics failed: {e}")

def main():
    print("=" * 60)
    print("Assign Existing Users to Groups")
    print("=" * 60)

    try:
        client = get_client()

        # 为现有用户分配组别
        assign_existing_users(client)

        # 显示统计信息
        get_group_statistics(client)

        print("\n" + "=" * 60)
        print("[OK] Assignment completed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Assignment failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()