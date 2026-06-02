#!/usr/bin/env python3
"""
启动 RIA 评测数据可视化面板
自动从 Supabase 导出最新数据并启动 Streamlit 面板
"""
import os
import sys
import subprocess
from pathlib import Path

def main():
    project_root = Path(__file__).parent
    scripts_dir = project_root / "scripts"
    export_script = scripts_dir / "export_supabase.py"
    dashboard_script = scripts_dir / "visualize_streamlit.py"

    print("=" * 60)
    print("RIA 评测数据可视化面板启动中...")
    print("=" * 60)

    # 步骤 1：导出 Supabase 数据
    print("\n[1/2] 正在从 Supabase 导出数据...")
    result = subprocess.run([
        sys.executable, str(export_script),
        "--table", "submissions",
        "--normalize",
        "--pretty"
    ], capture_output=True, text=True)

    if result.returncode == 0:
        print(f"[OK] {result.stdout.strip()}")
    else:
        print(f"[ERROR] 导出失败: {result.stderr}")
        # 继续执行，可能已有数据

    # 步骤 2：启动 Streamlit 面板
    print("\n[2/2] 启动 Streamlit 面板...")
    print("=" * 60)
    print("面板地址: http://localhost:8501")
    print("按 Ctrl+C 停止服务")
    print("=" * 60)
    print()

    subprocess.run([
        sys.executable, "-m", "streamlit", "run",
        str(dashboard_script),
        "--server.headless", "true"
    ])

if __name__ == "__main__":
    main()