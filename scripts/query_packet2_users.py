#!/usr/bin/env python3
"""查询题包2中 test1 和 zzl 的数据"""
import os
import sys
import json
from supabase import create_client

# 加载环境变量
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
env_path = os.path.join(project_root, ".env.local")
with open(env_path, "r", encoding="utf-8") as f:
    for raw in f:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        os.environ[key] = value

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
client = create_client(url, key)

USERS = ["test1", "zzl"]
BUCKET = 2

print("=" * 60)
print("1. submissions 表（最终提交）- 题包2")
print("=" * 60)

for user in USERS:
    resp = client.table("submissions") \
        .select("*") \
        .eq("user_name", user) \
        .eq("bucket_index", BUCKET) \
        .execute()
    rows = resp.data or []
    print(f"\n用户: {user}")
    print(f"  记录数: {len(rows)}")
    for row in rows:
        print(f"  ID: {row.get('id')}")
        print(f"  状态: {row.get('status')}")
        print(f"  版本: {row.get('version')}")
        print(f"  创建时间: {row.get('created_at')}")
        eval_data = row.get("evaluation_data")
        if eval_data:
            if isinstance(eval_data, str):
                eval_data = json.loads(eval_data)
            print(f"  评价题目数: {len(eval_data) if isinstance(eval_data, list) else 'N/A'}")
            # 打印每条评价的 model 和 question_id
            if isinstance(eval_data, list):
                for item in eval_data[:5]:
                    print(f"    - question_id: {item.get('question_id')}, model: {item.get('model_id')}, score: {item.get('score')}")
                if len(eval_data) > 5:
                    print(f"    ... 共 {len(eval_data)} 条，仅展示前5条")
        else:
            print(f"  evaluation_data: 无")

print("\n" + "=" * 60)
print("2. user_progress 表（临时进度）- 题包2")
print("=" * 60)

for user in USERS:
    resp = client.table("user_progress") \
        .select("*") \
        .eq("user_id", user) \
        .eq("bucket_index", BUCKET) \
        .execute()
    rows = resp.data or []
    print(f"\n用户: {user}")
    print(f"  记录数: {len(rows)}")
    for row in rows[:10]:
        eval_data = row.get("evaluation_data")
        if eval_data and isinstance(eval_data, str):
            eval_data = json.loads(eval_data)
        print(f"  - question_id: {row.get('question_id')}, model: {row.get('model_id')}, version: {row.get('version')}")
        if eval_data:
            print(f"    评分: {eval_data.get('score')}, 是否完成: {eval_data.get('isComplete')}")
            if eval_data.get('reason'):
                reason = eval_data['reason']
                print(f"    理由: {reason[:80]}..." if len(str(reason)) > 80 else f"    理由: {reason}")
    if len(rows) > 10:
        print(f"  ... 共 {len(rows)} 条，仅展示前10条")

print("\n查询完成。")
