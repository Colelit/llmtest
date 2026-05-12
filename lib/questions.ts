import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import remarkGfm from 'remark-gfm';
import { ModelAnswer, Question } from './types';

const answersDir = path.join(process.cwd(), '_answers');
const baseUrl = process.env.BASE_URL || '';

// 将 BASE_URL 替换为更通用的 BASE_PATH，并兼容老的 BASE_URL
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_URL || '';

// Function to create a full HTML document string
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

export async function getAllQuestions(): Promise<Question[]> {
  const questionDirs = fs.readdirSync(answersDir)
    .filter(file => fs.statSync(path.join(answersDir, file)).isDirectory() && file.startsWith('question-'))
    .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]));

  const allQuestionsData = await Promise.all(
    questionDirs.map(async (dirName) => {
      const questionId = dirName.split('-')[1];
      const questionDir = path.join(answersDir, dirName);

      const questionTextPath = path.join(questionDir, 'question.txt');
      const questionText = fs.readFileSync(questionTextPath, 'utf8').trim();

      const answerFiles = fs.readdirSync(questionDir)
        .filter(file => file.endsWith('.md'))
        .sort();
      
      const answers: ModelAnswer[] = await Promise.all(
        answerFiles.map(async (fileName) => {
          const fullPath = path.join(questionDir, fileName);
          const fileContents = fs.readFileSync(fullPath, 'utf8');
          const matterResult = matter(fileContents);

          // First, convert Obsidian-style image references ![[filename.png]] to standard markdown
          let markdownContent = matterResult.content;
          
          // Convert ![[filename.png]] to ![](images/filename.png)
          markdownContent = markdownContent.replace(/!\[\[([^\]]+\.(png|jpg|jpeg|gif|svg|webp))\]\]/gi, '![](images/$1)');
          
          const processedContent = await remark()
            .use(remarkGfm)
            .use(html)
            .process(markdownContent);

          let contentHtmlBody = processedContent.toString();

          // 将图片路径前缀统一替换为含 basePath 的 Public 目录
          const publicImagePath = `${basePath}/vendor/question-${questionId}/images/`;
          contentHtmlBody = contentHtmlBody.replace(
            /src="(?:\/|\.{2}\/|\.\/)?images\//gi,
            `src="${publicImagePath}`
          );

          return {
            modelId: matterResult.data.modelId,
            modelDisplayName: matterResult.data.modelDisplayName,
            contentHtml: createHtmlDoc(contentHtmlBody),
          };
        })
      );

      return {
        id: questionId,
        text: questionText,
        answers: answers,
      };
    })
  );

  return allQuestionsData;
}

// Centralized bucket matrix: 10 packs, each with 9 dynamic question IDs.
// 30 dynamic questions (IDs 2-58, first 30 after sorting) each appear exactly 3 times.
export const BUCKET_MATRIX = [
  ['2', '3', '4', '18', '20', '21', '39', '40', '43'],
  ['5', '7', '8', '24', '25', '26', '46', '48', '50'],
  ['13', '14', '16', '27', '29', '31', '53', '55', '57'],
  ['17', '18', '20', '34', '39', '40', '58', '2', '3'],
  ['4', '5', '7', '21', '24', '25', '43', '46', '48'],
  ['8', '13', '14', '26', '27', '29', '50', '53', '55'],
  ['16', '17', '18', '31', '34', '39', '57', '58', '2'],
  ['3', '4', '5', '20', '21', '24', '40', '43', '46'],
  ['7', '8', '13', '25', '26', '27', '48', '50', '53'],
  ['14', '16', '17', '29', '31', '34', '55', '57', '58'],
];

export function getQuestionsForBucket(bucketIndex: number, allQuestions: Question[]): Question[] {
  const pack = BUCKET_MATRIX[bucketIndex % BUCKET_MATRIX.length];
  const questionIds = ['1', ...pack];
  const questionMap = new Map(allQuestions.map(q => [q.id, q]));
  return questionIds
    .map(id => questionMap.get(id))
    .filter((q): q is Question => q !== undefined);
}
