import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import remarkGfm from 'remark-gfm';
import { ModelAnswer, Question } from '../types';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_URL || '';

/**
 * 创建完整的 HTML 文档字符串，用于 iframe srcDoc
 * @param mainContent - HTML 内容主体
 */
const createHtmlDoc = (mainContent: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="${basePath}/css/markdown.css">
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
 */
const convertMarkdownToHtml = async (
  markdownContent: string,
  questionId: string,
  version: 'v1' | 'v2'
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
  const publicImagePath = `${basePath}/vendor/${version}/${questionId}/images/`;
  contentHtmlBody = contentHtmlBody.replace(
    /src="(?:\/|\.{2}\/|\.)?images\//gi,
    `src="${publicImagePath}`
  );

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

          // v2 中 modelDisplayName 暂时使用匿名格式，后续 Wave 3 从 registry 动态读取
          const modelSlug = path.basename(fileName, '.md');
          const modelId = matterResult.data.modelId || modelSlug;

          const contentHtml = await convertMarkdownToHtml(
            matterResult.content,
            questionId,
            'v2'
          );

          return {
            modelId,
            modelDisplayName: '', // Wave 3 中从 registry 填充并匿名化
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
