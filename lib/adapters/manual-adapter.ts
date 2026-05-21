/**
 * 手动录入模型适配器
 * 处理 source 为 'manual' 或 'manual_image' 的模型答案
 *
 * - manual：通用模型手动录入（如豆包），执行文本清洗（水印删除、表情替换等）
 * - manual_image：垂类模型截图录入（如蚂小财、同花顺），保留图片引用，跳过文本清洗
 */

import { isImageSource } from '@/lib/models/registry';

export interface AdapterResult {
  content: string;      // 处理后的 Markdown 正文
  skipCleaning: boolean; // 是否跳过了文本清洗
}

/**
 * 豆包等手动录入模型的清洗规则
 * 去除水印、替换表情符号为标准 Markdown
 */
function cleanManualContent(raw: string): string {
  let content = raw;

  // 1. 删除豆包水印行（如 "由豆包生成"、"doubao.com"）
  content = content.replace(/^\s*由豆包生成.*$/gim, '');
  content = content.replace(/^\s*doubao\.com.*$/gim, '');

  // 2. 将微信/常见表情符号替换为纯文本描述
  const emojiMap: Record<string, string> = {
    '👍': '（点赞）',
    '👎': '（反对）',
    '❤️': '（心）',
    '😊': '（微笑）',
    '😂': '（笑哭）',
    '🤔': '（思考）',
    '⚠️': '（警告）',
    '✅': '（勾选）',
    '❌': '（叉号）',
  };
  for (const [emoji, text] of Object.entries(emojiMap)) {
    content = content.split(emoji).join(text);
  }

  // 3. 压缩连续空行
  content = content.replace(/\n{3,}/g, '\n\n');

  return content.trim();
}

/**
 * 处理模型答案内容
 *
 * @param rawContent 原始 Markdown 正文（不含 frontmatter）
 * @param modelSlug 模型 slug，用于判断来源类型
 * @returns 处理后的结果
 */
export function adaptManualContent(rawContent: string, modelSlug: string): AdapterResult {
  // 截图来源模型：保留图片引用，不执行任何文本清洗
  if (isImageSource(modelSlug)) {
    return {
      content: rawContent,
      skipCleaning: true,
    };
  }

  // 普通手动录入模型：执行标准清洗流程
  return {
    content: cleanManualContent(rawContent),
    skipCleaning: false,
  };
}

/**
 * 验证截图模型图片引用格式是否合法
 * 合法格式：![desc](./images/xxx.png)
 * @returns 非法引用的列表，为空则表示全部合法
 */
export function validateImageReferences(content: string): string[] {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const invalid: string[] = [];
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    const src = match[2];
    // 只允许相对路径 ./images/ 开头的引用
    if (!src.startsWith('./images/')) {
      invalid.push(src);
    }
  }

  return invalid;
}
