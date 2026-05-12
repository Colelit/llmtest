import { Question } from './types';

export function seededShuffle<T>(array: T[], seed: string): T[] {
  const m = array.length;
  const t = array.slice();
  let i = m;
  let h = 0;
  for (let j = 0; j < seed.length; j++) {
    h = Math.imul(31, h) + seed.charCodeAt(j) | 0;
  }
  const random = () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  while (i) {
    const r = Math.floor(random() * i--);
    [t[i], t[r]] = [t[r], t[i]];
  }
  return t;
}

export const QUESTION_PACKS = [
  [0, 1, 2, 10, 11, 12, 20, 21, 22],
  [3, 4, 5, 13, 14, 15, 23, 24, 25],
  [6, 7, 8, 16, 17, 18, 26, 27, 28],
  [9, 0, 3, 19, 10, 13, 29, 20, 23],
  [1, 4, 6, 11, 14, 16, 21, 24, 26],
  [2, 5, 7, 12, 15, 17, 22, 25, 27],
  [8, 9, 0, 18, 19, 10, 28, 29, 20],
  [1, 3, 6, 11, 13, 16, 21, 23, 26],
  [2, 4, 7, 12, 14, 17, 22, 24, 27],
  [5, 8, 9, 15, 18, 19, 25, 28, 29],
];

export function getUserPackIndex(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % QUESTION_PACKS.length;
}

export function allocateQuestions(userName: string, allQuestions: Question[]): Question[] {
  const sorted = [...allQuestions].sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
  const fixedIndex = sorted.findIndex(q => q.id === '1');
  const fixedQuestion = fixedIndex >= 0 ? sorted[fixedIndex] : sorted[0];
  const dynamicPool = sorted.filter(q => q.id !== fixedQuestion.id).slice(0, 30);
  if (dynamicPool.length === 0) {
    return [fixedQuestion];
  }
  const packIndex = getUserPackIndex(userName);
  const pack = QUESTION_PACKS[packIndex];
  const selectedDynamic = pack
    .map(idx => dynamicPool[idx % dynamicPool.length])
    .filter((q, i, arr) => arr.findIndex(x => x.id === q.id) === i)
    .slice(0, 9);
  return [fixedQuestion, ...selectedDynamic];
}
