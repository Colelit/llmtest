#!/usr/bin/env python3
"""
获取下一个可用的题目分组
用于新用户注册时分配组别
"""
import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.export_supabase import get_client

def get_next_available_group(client):
    """
    获取下一个可用的分组
    优先选择 current_users < target_users 的组
    如果所有组都满了，则轮询选择
    """
    try:
        # 获取所有活跃的分组
        groups = client.table('question_groups').select('*').eq('is_active', True).order('group_index').execute()

        if not groups.data:
            # 如果分组表为空，返回默认分组0
            print("⚠ 分组表为空，使用默认分组0")
            return {
                'group_index': 0,
                'question_ids': ['q1', 'q2', 'q3'],
                'question_set': ['q0', 'q1', 'q2', 'q3']
            }

        # 寻找未满的分组
        for group in groups.data:
            if group['current_users'] < group['target_users']:
                question_set = ['q0'] + group['question_ids']
                return {
                    'group_index': group['group_index'],
                    'question_ids': group['question_ids'],
                    'question_set': question_set
                }

        # 如果所有组都满了，选择用户数最少的组（轮询）
        min_users = min(group['current_users'] for group in groups.data)
        for group in groups.data:
            if group['current_users'] == min_users:
                question_set = ['q0'] + group['question_ids']
                return {
                    'group_index': group['group_index'],
                    'question_ids': group['question_ids'],
                    'question_set': question_set
                }

    except Exception as e:
        print(f"✗ 获取分组失败: {e}")
        # 返回默认分组
        return {
            'group_index': 0,
            'question_ids': ['q1', 'q2', 'q3'],
            'question_set': ['q0', 'q1', 'q2', 'q3']
        }

def increment_group_users(client, group_index):
    """
    增加指定分组的用户计数
    """
    try:
        group = client.table('question_groups').select('*').eq('group_index', group_index).execute()
        if group.data:
            current_users = group.data[0]['current_users']
            client.table('question_groups').update({
                'current_users': current_users + 1
            }).eq('group_index', group_index).execute()
            print(f"✓ 分组 {group_index} 用户数更新为 {current_users + 1}")
    except Exception as e:
        print(f"⚠ 更新分组用户数失败: {e}")

def main():
    """
    测试函数：获取下一个可用分组
    """
    print("🔄 获取下一个可用分组...")

    try:
        client = get_client()
        group_info = get_next_available_group(client)

        print(f"\n📋 分配结果:")
        print(f"  - 组别: {group_info['group_index']}")
        print(f"  - 随机题目: {group_info['question_ids']}")
        print(f"  - 完整题目集合: {group_info['question_set']}")

        # 如果需要增加用户计数（取消注释）
        # increment_group_users(client, group_info['group_index'])

        return group_info

    except Exception as e:
        print(f"✗ 获取分组失败: {e}")
        return None

if __name__ == "__main__":
    main()