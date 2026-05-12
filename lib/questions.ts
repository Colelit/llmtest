import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import remarkGfm from 'remark-gfm';
import { ModelAnswer, Question } from './types';

const answersDir = path.join(process.cwd(), '_answers');
const baseUrl = process.env.BASE_URL || '';

// Helper function to recursively copy a directory
const copyDirSync = (src: string, dest: string) => {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

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

      // --- Start of Image Handling Logic ---
      const questionImagesDir = path.join(questionDir, 'images');
      const publicVendorDir = path.join(process.cwd(), 'public', 'vendor', `question-${questionId}`, 'images');
      
      // Copy images to public directory if they exist
      if (fs.existsSync(questionImagesDir)) {
        copyDirSync(questionImagesDir, publicVendorDir);
      }
      // --- End of Image Handling Logic ---

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