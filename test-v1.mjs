import { loadQuestions } from './lib/content/loader.ts';

async function test() {
  const questions = await loadQuestions('v1');
  const q1 = questions.find(q => q.id === '1');
  if (!q1) {
    console.log('q1 not found');
    return;
  }

  const modelH = q1.answers.find(a => a.modelId === '蚂小财');
  if (modelH) {
    console.log('=== v1 model-h (蚂小财) ===');
    console.log('displayName:', modelH.modelDisplayName);
    // 提取 body 内容
    const bodyMatch = modelH.contentHtml.match(/<body>([\s\S]*)<\/body>/);
    if (bodyMatch) {
      console.log('body content:');
      console.log(bodyMatch[1].trim());
    }
    console.log('has <img>:', modelH.contentHtml.includes('<img'));
    const imgSrc = modelH.contentHtml.match(/src="([^"]+)"/);
    if (imgSrc) console.log('img src:', imgSrc[1]);
  } else {
    console.log('model-h not found');
    console.log('Available:', q1.answers.map(a => a.modelId));
  }
}

test().catch(console.error);
