#!/usr/bin/env python3
"""
通过 SQL RPC 直接初始化分组数据
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.export_supabase import get_client

def init_groups_via_sql(client):
    """使用 SQL 直接插入分组数据"""
    sql = """
    -- 清空现有分组
    TRUNCATE TABLE question_groups RESTART IDENTITY;

    -- 创建分组
    INSERT INTO question_groups (group_index, question_ids, target_users, current_users, is_active)
    VALUES
      (0, ARRAY['q1', 'q2', 'q3'], 3, 0, TRUE),
      (1, ARRAY['q4', 'q5', 'q6'], 3, 0, TRUE),
      (2, ARRAY['q7', 'q8', 'q9'], 3, 0, TRUE);

    -- 显示结果
    SELECT * FROM question_groups ORDER BY group_index;
    """

    try:
        result = client.rpc('exec_sql', {'sql': sql})
        print(f"[OK] SQL 执行成功")
        return result
    except Exception as e:
        print(f"[ERROR] SQL 执行失败: {e}")
        return None

def main():
    print("=" * 60)
    print("通过 SQL 初始化分组数据")
    print("=" * 60)

    client = get_client()
    result = init_groups_via_sql(client)

    if result and hasattr(result, 'data'):
        print("\n[结果]")
        print(result.data)

    print("\n" + "=" * 60)
    print("[OK] 完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()