import { loadQuestions } from './lib/content/loader.ts';

async function test() {
  const v1Questions = await loadQuestions('v1');
  const v2Questions = await loadQuestions('v2');

  const v1q1 = v1Questions.find(q => q.id === '1');
  const v2q1 = v2Questions.find(q => q.id === 'q1');

  const v1ModelH = v1q1.answers.find(a => a.modelId === '蚂小财');
  const v2Maxiaocai = v2q1.answers.find(a => a.modelId === 'maxiaocai');

  console.log('=== v1 model-h HTML (first 1500 chars) ===');
  console.log(v1ModelH.contentHtml.substring(0, 1500));
  console.log('\n=== v2 maxiaocai HTML (first 1500 chars) ===');
  console.log(v2Maxiaocai.contentHtml.substring(0, 1500));

  console.log('\n=== v1 img count ===');
  console.log((v1ModelH.contentHtml.match(/<img/g) || []).length);
  console.log('=== v2 img count ===');
  console.log((v2Maxiaocai.contentHtml.match(/<img/g) || []).length);
}

test().catch(console.error);
