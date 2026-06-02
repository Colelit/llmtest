#!/usr/bin/env python3
"""
测试题包分配逻辑
"""
import requests

def test_allocation():
    base_url = "http://localhost:10005"

    print("=" * 60)
    print("测试题包分配逻辑")
    print("=" * 60)

    # 模拟 10 个新用户
    for i in range(1, 11):
        response = requests.get(f"{base_url}/api/get-next-group")
        data = response.json()

        print(f"\n用户 {i}:")
        print(f"  分组: {data.get('group_index')}")
        print(f"  题目: {data.get('question_ids')}")

    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)

if __name__ == "__main__":
    test_allocation()