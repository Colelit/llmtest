import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const answersDir = path.join(projectRoot, '_answers');
const publicVendorDir = path.join(projectRoot, 'public', 'vendor');

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

const questionDirs = fs.readdirSync(answersDir)
  .filter(d => d.startsWith('question-') && fs.statSync(path.join(answersDir, d)).isDirectory());

for (const dirName of questionDirs) {
  const questionId = dirName.split('-')[1];
  const imagesSrc = path.join(answersDir, dirName, 'images');
  const imagesDest = path.join(publicVendorDir, `question-${questionId}`, 'images');

  if (fs.existsSync(imagesSrc)) {
    copyDirSync(imagesSrc, imagesDest);
    console.log(`Synced images for question ${questionId} -> ${imagesDest}`);
  } else {
    console.log(`No images folder for question ${questionId}, skipping.`);
  }
}