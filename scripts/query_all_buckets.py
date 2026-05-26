#!/usr/bin/env python3
"""查询 test1 和 zzl 在所有题包中的数据"""
import os
import sys
import json

# Fix encoding on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

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

print("=" * 70)
print("一、submissions 表（最终提交）- 所有题包")
print("=" * 70)

for user in USERS:
    resp = client.table("submissions").select("*").eq("user_name", user).execute()
    rows = resp.data or []
    print(f"\n用户: {user}")
    print(f"  总记录数: {len(rows)}")
    for row in rows:
        print(f"  ├─ ID: {row.get('id')}")
        print(f"  ├─ 状态: {row.get('status')}")
        print(f"  ├─ 题包: {row.get('bucket_index')}")
        print(f"  ├─ 版本: {row.get('version')}")
        print(f"  ├─ 创建时间: {row.get('created_at')}")
        eval_data = row.get("evaluation_data")
        if eval_data:
            if isinstance(eval_data, str):
                eval_data = json.loads(eval_data)
            if isinstance(eval_data, list):
                print(f"  └─ 评价题目数: {len(eval_data)}")
                for item in eval_data[:3]:
                    print(f"      • question_id={item.get('question_id')}, model={item.get('model_id')}, score={item.get('score')}")
                if len(eval_data) > 3:
                    print(f"      ... 共 {len(eval_data)} 条")
            else:
                print(f"  └─ evaluation_data: {str(eval_data)[:200]}")
        else:
            print(f"  └─ evaluation_data: 无")

print("\n" + "=" * 70)
print("二、user_progress 表（临时进度）- 所有题包")
print("=" * 70)

for user in USERS:
    resp = client.table("user_progress").select("*").eq("user_id", user).execute()
    rows = resp.data or []
    print(f"\n用户: {user}")
    print(f"  总记录数: {len(rows)}")
    # 按题包分组统计
    buckets = {}
    for row in rows:
        b = row.get("bucket_index") or "NULL"
        buckets[b] = buckets.get(b, 0) + 1
    if buckets:
        print(f"  题包分布: {buckets}")
    for row in rows[:5]:
        eval_data = row.get("evaluation_data")
        if eval_data and isinstance(eval_data, str):
            eval_data = json.loads(eval_data)
        print(f"  ├─ question_id={row.get('question_id')}, model={row.get('model_id')}, bucket={row.get('bucket_index')}, version={row.get('version')}")
        if eval_data:
            print(f"  │   score={eval_data.get('score')}, isComplete={eval_data.get('isComplete')}")
    if len(rows) > 5:
        print(f"  ... 共 {len(rows)} 条，仅展示前5条")

print("\n查询完成。")
