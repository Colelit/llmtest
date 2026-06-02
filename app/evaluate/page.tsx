import { getQuestionsForBucket, getQuestionsByIds } from '@/lib/questions';
import { loadQuestions } from '@/lib/content/loader';
import EvaluationClient from '@/app/components/EvaluationClient';
import { seededShuffle } from '@/lib/utils';
import { Question } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EvaluatePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const version = (resolvedSearchParams.version as 'v1' | 'v2') || 'v1';
  const allQuestions = await loadQuestions(version);

  if (!allQuestions || allQuestions.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p>未能加载任何问题，请检查_answers文件夹。</p>
      </main>
    );
  }

  const bucketParam = resolvedSearchParams.bucket;
  const idsParam = resolvedSearchParams.ids;
  const seed = resolvedSearchParams.seed;
  const countParam = resolvedSearchParams.count;

  let questionsToDisplay: Question[];

  // 优先使用 ids 参数（v2 分组题目集合）
  if (idsParam) {
    const idsString = Array.isArray(idsParam) ? idsParam[0] : idsParam;
    const ids = idsString.split(',').map(s => s.trim()).filter(Boolean);
    questionsToDisplay = getQuestionsByIds(ids, allQuestions);
  }
  // 其次使用 bucket 参数（v1 题包）
  else if (bucketParam !== undefined) {
    const bucketIndex = parseInt(Array.isArray(bucketParam) ? bucketParam[0] : bucketParam, 10);
    if (!isNaN(bucketIndex)) {
      questionsToDisplay = getQuestionsForBucket(bucketIndex, allQuestions);
    } else {
      questionsToDisplay = allQuestions;
    }
  }
  // 再次使用 seed 参数（随机抽取）
  else if (seed) {
    const seedString = Array.isArray(seed) ? seed[0] : seed;
    const shuffled = seededShuffle(allQuestions, seedString);
    let count = 5;
    if (countParam) {
      const parsedCount = parseInt(Array.isArray(countParam) ? countParam[0] : countParam, 10);
      if (!isNaN(parsedCount) && parsedCount > 0) {
        count = parsedCount;
      }
    }
    questionsToDisplay = shuffled.slice(0, count);
  }
  // 默认显示全部题目
  else {
    questionsToDisplay = allQuestions;
  }

  return <EvaluationClient allQuestions={questionsToDisplay} version={version} />;
}
