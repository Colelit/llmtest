#!/usr/bin/env python3
# 函数：get_client()，以及新增的 load_env_local()
import os
import json
import argparse
from typing import Any, Dict, List

from supabase import create_client, Client


def load_env_local(env_path: str | None = None) -> None:
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    path = env_path or os.path.join(project_root, ".env.local")
    if not os.path.exists(path):
        alt = os.path.join(project_root, ".env")
        if not os.path.exists(alt):
            return
        path = alt

    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[len("export "):]
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]
            os.environ[key] = value


def get_client() -> Client:
    # 先加载 .env.local（或 .env）到环境变量
    load_env_local()

    url = (
        os.environ.get("SUPABASE_URL")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    )
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )

    if not url or not key:
        raise RuntimeError(
            "Missing Supabase credentials. 请在 .env.local 中配置 SUPABASE_URL 与 "
            "SUPABASE_SERVICE_ROLE_KEY（推荐）或 NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY。"
        )

    return create_client(url, key)


def fetch_all_rows(client: Client, table: str, page_size: int = 1000) -> List[Dict[str, Any]]:
    """
    分页抓取指定表的全部数据。
    - 使用 range 对 postgrest 进行分页
    - 自动终止于最后一页
    """
    all_data: List[Dict[str, Any]] = []
    start = 0

    while True:
        resp = client.table(table).select("*").range(start, start + page_size - 1).execute()

        if getattr(resp, "error", None):
            raise RuntimeError(f"Fetch error: {resp.error}")

        batch = resp.data or []
        all_data.extend(batch)

        if len(batch) < page_size:
            break

        start += page_size

    return all_data


def normalize_row_json_fields(rows: List[Dict[str, Any]]) -> None:
    """
    将可能是字符串的 JSON 字段（如 user_profile, evaluation_data）转换为对象。
    """
    for row in rows:
        for key in ("user_profile", "evaluation_data"):
            val = row.get(key)
            if isinstance(val, str):
                try:
                    row[key] = json.loads(val)
                except Exception:
                    # 如果不是合法 JSON 字符串，则忽略
                    pass


def main():
    parser = argparse.ArgumentParser(
        description="Export Supabase table data to JSON file"
    )
    parser.add_argument(
        "--table",
        required=True,
        help="Table name, e.g. 'submissions' or 'user_progress'"
    )
    parser.add_argument(
        "--out",
        default=None,
        help="Output JSON path (default: data/{table}_rows.json)"
    )
    parser.add_argument(
        "--normalize",
        action="store_true",
        help="Parse JSON strings in fields like user_profile/evaluation_data"
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON with indentation"
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=1000,
        help="Page size for pagination (default: 1000)"
    )

    args = parser.parse_args()

    client = get_client()
    rows = fetch_all_rows(client, args.table, page_size=args.page_size)

    if args.normalize:
        normalize_row_json_fields(rows)

    # 默认导出到项目 data 目录
    out_path = args.out or os.path.join(
        os.path.dirname(__file__), "..", "data", f"{args.table}_rows.json"
    )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2 if args.pretty else None)

    print(f"Exported {len(rows)} rows from '{args.table}' -> {out_path}")


if __name__ == "__main__":
    main()