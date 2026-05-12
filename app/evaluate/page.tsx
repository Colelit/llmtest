import { getAllQuestions } from '@/lib/questions';
import EvaluationClient from '@/app/components/EvaluationClient';
import { seededShuffle, allocateQuestions } from '@/lib/utils';
import { Question } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EvaluatePage({ searchParams }: PageProps) {
  const allQuestions = await getAllQuestions();
  const resolvedSearchParams = await searchParams;

  if (!allQuestions || allQuestions.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p>未能加载任何问题，请检查_answers文件夹。</p>
      </main>
    );
  }

  const userParam = resolvedSearchParams.user;
  const idsParam = resolvedSearchParams.ids;
  const seed = resolvedSearchParams.seed;
  const countParam = resolvedSearchParams.count;

  let questionsToDisplay: Question[];

  if (idsParam) {
    const idsString = Array.isArray(idsParam) ? idsParam[0] : idsParam;
    const ids = idsString.split(',').map(s => s.trim()).filter(Boolean);
    const questionMap = new Map(allQuestions.map(q => [q.id, q]));
    questionsToDisplay = ids
      .map(id => questionMap.get(id))
      .filter((q): q is Question => q !== undefined);
  } else if (userParam) {
    const userName = Array.isArray(userParam) ? userParam[0] : userParam;
    questionsToDisplay = allocateQuestions(userName, allQuestions);
  } else if (seed) {
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
  } else {
    questionsToDisplay = allQuestions;
  }

  return <EvaluationClient allQuestions={questionsToDisplay} />;
}
