#!/usr/bin/env python3
"""
自动修复 Markdown 表格：为缺少分隔行（separator row）的表格添加标准分隔行。
分隔行格式：|---|---|---|（根据表头列数自动生成）
"""
import os
import re
import glob


def count_columns(header_line: str) -> int:
    """计算表头的列数（按 | 分割，去掉首尾空单元格）"""
    parts = header_line.split("|")
    # 去掉首尾的空白项
    parts = [p for p in parts if p.strip() or p == ""]
    # 如果首尾是空字符串（因为 |xx|yy| 分割后是 ['', 'xx', 'yy', '']）
    cells = header_line.split("|")
    non_empty = [c for c in cells if c.strip() != ""]
    return len(non_empty)


def is_separator_line(line: str) -> bool:
    """检查是否为 Markdown 表格分隔行"""
    if not line.startswith("|"):
        return False
    # 去掉 | 后，检查每个单元格是否只包含 - 或 :
    cells = line.split("|")
    for cell in cells:
        stripped = cell.strip()
        if stripped == "":
            continue
        # 必须至少包含3个 -
        if not re.search(r"[-]{3,}", stripped):
            return False
        # 只能包含 - 和 :
        if not re.match(r"^[:\-]+$", stripped):
            return False
    return True


def fix_tables_in_file(filepath: str) -> bool:
    """
    修复单个文件中的 Markdown 表格。
    返回是否进行了修改。
    """
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    modified = False
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # 检测表格行（以 | 开头）
        if line.strip().startswith("|") and not is_separator_line(line.strip()):
            # 向后看：如果下一行不是分隔行，则需要插入
            # 先收集连续的表格行
            table_block = [line]
            j = i + 1
            while j < len(lines) and lines[j].strip().startswith("|"):
                table_block.append(lines[j])
                j += 1

            # 检查 table_block 中是否已有分隔行
            has_sep = any(is_separator_line(l.strip()) for l in table_block)

            if not has_sep:
                # 第一行是表头，在其后插入分隔行
                header_line = table_block[0].strip()
                col_count = count_columns(header_line)
                if col_count > 0:
                    sep_line = "|" + "---|" * col_count + "\n"
                    # 找到表头行之后的第一个非空行位置
                    # 在 table_block 的第一行后面插入
                    new_block = [table_block[0], sep_line] + table_block[1:]
                    new_lines.extend(new_block)
                    modified = True
                    i = j
                    continue

            # 未修改，原样输出
            new_lines.extend(table_block)
            i = j
            continue
        else:
            new_lines.append(line)
            i += 1

    if modified:
        with open(filepath, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
    return modified


def main():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    all_md_files = []
    for pattern in ["_answers/v1/*/*.md", "_answers/v2/*/*.md"]:
        all_md_files.extend(glob.glob(os.path.join(project_root, pattern)))

    fixed_count = 0
    for filepath in sorted(all_md_files):
        if fix_tables_in_file(filepath):
            rel = os.path.relpath(filepath, project_root)
            print(f"已修复: {rel}")
            fixed_count += 1

    print(f"\n总共扫描 {len(all_md_files)} 个文件，修复 {fixed_count} 个文件。")


if __name__ == "__main__":
    main()
