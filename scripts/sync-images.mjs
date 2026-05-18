import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const publicVendorDir = path.join(projectRoot, 'public', 'vendor');

/**
 * 递归复制目录
 * @param {string} src - 源目录
 * @param {string} dest - 目标目录
 */
const copyDirSync = (src, dest) => {
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

/**
 * 同步 v1 题库图片
 * 源路径：_answers/v1/question-{id}/images/
 * 目标路径：public/vendor/v1/question-{id}/images/
 */
const syncV1Images = () => {
  const v1AnswersDir = path.join(projectRoot, '_answers', 'v1');
  const v1PublicDir = path.join(publicVendorDir, 'v1');

  if (!fs.existsSync(v1AnswersDir)) {
    console.log('v1 题库目录不存在，跳过');
    return;
  }

  const questionDirs = fs.readdirSync(v1AnswersDir)
    .filter(d => d.startsWith('question-') && fs.statSync(path.join(v1AnswersDir, d)).isDirectory());

  for (const dirName of questionDirs) {
    const questionId = dirName;
    const imagesSrc = path.join(v1AnswersDir, dirName, 'images');
    const imagesDest = path.join(v1PublicDir, questionId, 'images');

    if (fs.existsSync(imagesSrc)) {
      copyDirSync(imagesSrc, imagesDest);
      console.log(`[v1] Synced images for ${questionId} -> ${imagesDest}`);
    } else {
      console.log(`[v1] No images folder for ${questionId}, skipping.`);
    }
  }
};

/**
 * 同步 v2 题库图片
 * 源路径：_answers/v2/{questionId}/images/
 * 目标路径：public/vendor/v2/{questionId}/images/
 */
const syncV2Images = () => {
  const v2AnswersDir = path.join(projectRoot, '_answers', 'v2');
  const v2PublicDir = path.join(publicVendorDir, 'v2');

  if (!fs.existsSync(v2AnswersDir)) {
    console.log('v2 题库目录不存在，跳过');
    return;
  }

  const questionDirs = fs.readdirSync(v2AnswersDir)
    .filter(d => fs.statSync(path.join(v2AnswersDir, d)).isDirectory());

  for (const questionId of questionDirs) {
    const imagesSrc = path.join(v2AnswersDir, questionId, 'images');
    const imagesDest = path.join(v2PublicDir, questionId, 'images');

    if (fs.existsSync(imagesSrc)) {
      copyDirSync(imagesSrc, imagesDest);
      console.log(`[v2] Synced images for ${questionId} -> ${imagesDest}`);
    } else {
      console.log(`[v2] No images folder for ${questionId}, skipping.`);
    }
  }
};

// 执行同步
console.log('=== 开始同步题库图片 ===\n');
syncV1Images();
console.log('');
syncV2Images();
console.log('\n=== 同步完成 ===');
