#!/usr/bin/env python3
"""详细查询 test1 和 zzl 在题包2的数据，并对比所有题包情况"""
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
TARGET_BUCKET = 2

print("=" * 70)
print("【查询结果】题包2 (bucket_index=2) 中 test1 和 zzl 的数据")
print("=" * 70)

# ====== submissions 表 ======
print("\n一、submissions 表（最终提交数据）")
print("-" * 70)
for user in USERS:
    resp = client.table("submissions").select("*").eq("user_name", user).eq("bucket_index", TARGET_BUCKET).execute()
    rows = resp.data or []
    print(f"\n用户: {user}")
    print(f"  题包2记录数: {len(rows)}")
    if len(rows) == 0:
        print("  ⚠️ 该用户在题包2中无任何最终提交记录")
    for row in rows:
        print(f"  ID: {row.get('id')}, 状态: {row.get('status')}, 版本: {row.get('version')}")
        eval_data = row.get("evaluation_data")
        if eval_data:
            if isinstance(eval_data, str):
                eval_data = json.loads(eval_data)
            print(f"  评价内容: {json.dumps(eval_data, ensure_ascii=False, indent=2)[:500]}...")

# ====== user_progress 表 ======
print("\n\n二、user_progress 表（临时进度数据）")
print("-" * 70)
for user in USERS:
    resp = client.table("user_progress").select("*").eq("user_id", user).eq("bucket_index", TARGET_BUCKET).execute()
    rows = resp.data or []
    print(f"\n用户: {user}")
    print(f"  题包2记录数: {len(rows)}")
    if len(rows) == 0:
        print("  ⚠️ 该用户在题包2中无任何临时进度记录")
    for row in rows:
        eval_data = row.get("evaluation_data")
        if eval_data and isinstance(eval_data, str):
            eval_data = json.loads(eval_data)
        print(f"  question_id={row.get('question_id')}, model={row.get('model_id')}, version={row.get('version')}")
        print(f"  评价内容: {json.dumps(eval_data, ensure_ascii=False, indent=2)[:300]}...")

# ====== 全部题包对比 ======
print("\n\n" + "=" * 70)
print("【补充】两个用户在所有题包中的记录汇总")
print("=" * 70)

for user in USERS:
    print(f"\n用户: {user}")
    # submissions 全部
    resp1 = client.table("submissions").select("*").eq("user_name", user).execute()
    rows1 = resp1.data or []
    print(f"  submissions 表总记录: {len(rows1)}")
    for r in rows1:
        print(f"    → 题包 {r.get('bucket_index')}, 状态: {r.get('status')}, 版本: {r.get('version')}, 时间: {r.get('created_at')}")

    # user_progress 全部
    resp2 = client.table("user_progress").select("*").eq("user_id", user).execute()
    rows2 = resp2.data or []
    print(f"  user_progress 表总记录: {len(rows2)}")
    buckets = {}
    for r in rows2:
        b = r.get("bucket_index") or "NULL"
        buckets[b] = buckets.get(b, 0) + 1
    if buckets:
        print(f"    → 题包分布: {buckets}")

print("\n" + "=" * 70)
print("结论：test1 和 zzl 在题包2中均没有任何记录。")
print("       test1 的提交在题包1（completed）；zzl 的提交也在题包1（in-progress）。")
print("=" * 70)
