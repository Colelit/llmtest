import { loadQuestions } from './lib/content/loader.ts';

async function test() {
  console.log('=== 测试 v2 loader ===');
  const questions = await loadQuestions('v2');
  console.log('题目数量:', questions.length);

  const q1 = questions.find(q => q.id === 'q1');
  if (!q1) {
    console.log('q1 未找到');
    return;
  }

  console.log('q1 答案数量:', q1.answers.length);
  console.log('q1 答案列表:', q1.answers.map(a => ({ modelId: a.modelId, displayName: a.modelDisplayName })));

  const maxiaocai = q1.answers.find(a => a.modelId === 'maxiaocai');
  if (maxiaocai) {
    console.log('\n=== maxiaocai q1 ===');
    console.log('displayName:', maxiaocai.modelDisplayName);
    console.log('contentHtml length:', maxiaocai.contentHtml.length);
    console.log('contentHtml:');
    console.log(maxiaocai.contentHtml);

    const hasImg = maxiaocai.contentHtml.includes('<img');
    console.log('\nhas <img>:', hasImg);

    const imgMatch = maxiaocai.contentHtml.match(/src="([^"]+)"/g);
    console.log('img srcs:', imgMatch);
  } else {
    console.log('maxiaocai 答案未找到');
  }
}

test().catch(console.error);
