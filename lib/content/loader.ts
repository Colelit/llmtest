import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import remarkGfm from 'remark-gfm';
import { ModelAnswer, Question } from '../types';
import { getModelBySlug, isImageSource } from '../models/registry';
import { adaptManualContent, validateImageReferences } from '../adapters/manual-adapter';

// 静态资源路径前缀，仅使用 NEXT_PUBLIC_BASE_PATH（Next.js 子路径配置）
// 不使用 BASE_URL（后端 API 地址），避免 iframe 中图片指向错误域名
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// 读取 Markdown CSS 内容并缓存，用于内联到 iframe 中（避免 srcDoc 中外部链接路径解析问题）
const getMarkdownCss = (): string => {
  try {
    const cssPath = path.join(process.cwd(), 'public', 'css', 'markdown.css');
    return fs.readFileSync(cssPath, 'utf8');
  } catch {
    return '';
  }
};

/**
 * 创建完整的 HTML 文档字符串，用于 iframe srcDoc
 * CSS 直接内联，避免 srcDoc 中相对路径无法解析的问题
 * @param mainContent - HTML 内容主体
 */
const createHtmlDoc = (mainContent: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getMarkdownCss()}</style>
    </head>
    <body>
      ${mainContent}
    </body>
    </html>
  `;
};

/**
 * 将 Markdown 内容转换为可用于 iframe 的 HTML 文档
 * @param markdownContent - 原始 Markdown 字符串
 * @param questionId - 题目 ID，用于图片路径重写
 * @param version - 版本号（v1 或 v2），用于图片路径前缀
 * @param modelSlug - 模型 slug，用于截图模型图片校验（可选）
 */
const convertMarkdownToHtml = async (
  markdownContent: string,
  questionId: string,
  version: 'v1' | 'v2',
  modelSlug?: string
): Promise<string> => {
  // 将 Obsidian 风格 wikilink 转换为标准 Markdown 图片语法
  let processedMarkdown = markdownContent.replace(
    /!\[\[([^\]]+\.(png|jpg|jpeg|gif|svg|webp))\]\]/gi,
    '![](images/$1)'
  );

  // 使用 remark 将 Markdown 转为 HTML
  const processedContent = await remark()
    .use(remarkGfm)
    .use(html)
    .process(processedMarkdown);

  let contentHtmlBody = processedContent.toString();

  // 重写图片 src 为 public 目录下的绝对路径
  // 匹配 src 中 images/、./images/、/images/、../images/ 等相对路径前缀
  const publicImagePath = `${basePath}/vendor/${version}/${questionId}/images/`;
  contentHtmlBody = contentHtmlBody.replace(
    /src="(?:\.{0,2}\/)?images\//gi,
    `src="${publicImagePath}`
  );

  // 截图模型额外校验：若存在非法图片路径则输出警告
  if (modelSlug && isImageSource(modelSlug)) {
    const invalidRefs = validateImageReferences(processedMarkdown);
    if (invalidRefs.length > 0) {
      console.warn(
        `[截图模型] ${modelSlug} 在题目 ${questionId} 中发现非法图片引用：`,
        invalidRefs
      );
    }
  }

  return createHtmlDoc(contentHtmlBody);
};

/**
 * v1 题库加载器
 * 兼容现有平铺结构：_answers/v1/question-{id}/
 */
const loadV1Questions = async (): Promise<Question[]> => {
  const answersDir = path.join(process.cwd(), '_answers', 'v1');

  if (!fs.existsSync(answersDir)) {
    console.warn('v1 题库目录不存在:', answersDir);
    return [];
  }

  const questionDirs = fs.readdirSync(answersDir)
    .filter(file => {
      const fullPath = path.join(answersDir, file);
      return fs.statSync(fullPath).isDirectory() && file.startsWith('question-');
    })
    .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]));

  const allQuestionsData = await Promise.all(
    questionDirs.map(async (dirName) => {
      const questionId = dirName.split('-')[1];
      const questionDir = path.join(answersDir, dirName);

      // 读取题干
      const questionTextPath = path.join(questionDir, 'question.txt');
      let questionText = '';
      if (fs.existsSync(questionTextPath)) {
        questionText = fs.readFileSync(questionTextPath, 'utf8').trim();
      }

      // 读取模型答案文件
      const answerFiles = fs.readdirSync(questionDir)
        .filter(file => file.endsWith('.md'))
        .sort();

      const answers: ModelAnswer[] = await Promise.all(
        answerFiles.map(async (fileName) => {
          const fullPath = path.join(questionDir, fileName);
          const fileContents = fs.readFileSync(fullPath, 'utf8');
          const matterResult = matter(fileContents);

          const contentHtml = await convertMarkdownToHtml(
            matterResult.content,
            `question-${questionId}`,
            'v1'
          );

          return {
            modelId: matterResult.data.modelId,
            modelDisplayName: matterResult.data.modelDisplayName,
            contentHtml,
          };
        })
      );

      return {
        id: questionId,
        text: questionText,
        answers,
      };
    })
  );

  // 过滤掉没有题干或没有答案的空题目
  return allQuestionsData.filter(q => q.text.trim().length > 0 && q.answers.length > 0);
};

/**
 * v2 题库加载器
 * 新结构：_answers/v2/{questionId}/question.md + {model-slug}.md
 * 使用 registry 获取模型元数据，通过 adapter 处理不同来源的答案
 */
const loadV2Questions = async (): Promise<Question[]> => {
  const answersDir = path.join(process.cwd(), '_answers', 'v2');

  if (!fs.existsSync(answersDir)) {
    console.warn('v2 题库目录不存在:', answersDir);
    return [];
  }

  // 扫描 v2 下的题目目录
  const questionDirs = fs.readdirSync(answersDir)
    .filter(file => {
      const fullPath = path.join(answersDir, file);
      return fs.statSync(fullPath).isDirectory();
    })
    .sort();

  const allQuestionsData = await Promise.all(
    questionDirs.map(async (questionId) => {
      const questionDir = path.join(answersDir, questionId);

      // 读取题干
      const questionMdPath = path.join(questionDir, 'question.md');
      let questionText = '';
      if (fs.existsSync(questionMdPath)) {
        const fileContents = fs.readFileSync(questionMdPath, 'utf8');
        const matterResult = matter(fileContents);
        questionText = matterResult.content.trim();
      }

      // 读取模型答案文件（排除 question.md）
      const answerFiles = fs.readdirSync(questionDir)
        .filter(file => file.endsWith('.md') && file !== 'question.md')
        .sort();

      const answers: ModelAnswer[] = await Promise.all(
        answerFiles.map(async (fileName) => {
          const fullPath = path.join(questionDir, fileName);
          const fileContents = fs.readFileSync(fullPath, 'utf8');
          const matterResult = matter(fileContents);

          // 从文件名提取模型 slug
          const modelSlug = path.basename(fileName, '.md');

          // 从 frontmatter 获取 modelId，fallback 为 slug
          const modelId = matterResult.data.modelId || modelSlug;

          // 查询注册表获取模型展示名，优先使用 frontmatter 中的 modelDisplayName
          const registryModel = getModelBySlug(modelSlug);
          const modelDisplayName = matterResult.data.modelDisplayName || registryModel?.displayName || modelSlug;

          // 通过适配器处理内容：截图模型保留图片引用、跳过清洗
          const adapted = adaptManualContent(matterResult.content, modelSlug);

          const contentHtml = await convertMarkdownToHtml(
            adapted.content,
            questionId,
            'v2',
            modelSlug
          );

          return {
            modelId,
            modelDisplayName,
            contentHtml,
          };
        })
      );

      return {
        id: questionId,
        text: questionText,
        answers,
      };
    })
  );

  // 过滤掉没有题干或没有答案的空题目
  return allQuestionsData.filter(q => q.text.trim().length > 0 && q.answers.length > 0);
};

/**
 * 按版本加载题库
 * @param version - 'v1' 或 'v2'
 * @returns 题目列表
 */
export async function loadQuestions(version: 'v1' | 'v2'): Promise<Question[]> {
  if (version === 'v1') {
    return loadV1Questions();
  }
  return loadV2Questions();
}
