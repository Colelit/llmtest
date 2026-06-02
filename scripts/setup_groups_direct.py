#!/usr/bin/env python3
"""
直接使用 Supabase 客户端创建分组数据
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.export_supabase import get_client

def main():
    print("=" * 60)
    print("直接创建分组数据")
    print("=" * 60)

    client = get_client()

    # 检查权限
    print(f"\n[权限检查] 使用客户端类型: {type(client).__name__}")

    # 清空现有分组
    print("\n[1/3] 清空现有分组...")
    client.table('question_groups').delete().neq('id', 0).execute()
    print("[OK] 已清空")

    # 创建新分组
    print("\n[2/3] 创建新分组...")
    question_groups = [
        (0, "q1", "q2", "q3"),
        (1, "q4", "q5", "q6"),
        (2, "q7", "q8", "q9")
    ]

    for group_index, q1, q2, q3 in question_groups:
        try:
            client.table('question_groups').insert({
                'group_index': group_index,
                'question_ids': [q1, q2, q3],
                'target_users': 3,
                'current_users': 0,
                'is_active': True
            }).execute()
            print(f"[OK] 创建组 {group_index}: {q1}, {q2}, {q3}")
        except Exception as e:
            print(f"[ERROR] 创建组 {group_index} 失败: {e}")

    # 验证数据
    print("\n[3/3] 验证数据...")
    result = client.table('question_groups').select('*').order('group_index').execute()
    if result.data:
        print("[OK] 分组数据:")
        for group in result.data:
            print(f"  组 {group['group_index']}: {group['question_ids']}, 用户数: {group['current_users']}/{group['target_users']}")
    else:
        print("[ERROR] 没有找到分组数据")

    print("\n" + "=" * 60)
    print("[OK] 完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()