import { Question } from './types';
import { loadQuestions } from './content/loader';

/**
 * 获取全部题目（兼容旧接口，默认加载 v1）
 * 内部委托给 lib/content/loader.ts 的 loadQuestions('v1')
 */
export async function getAllQuestions(): Promise<Question[]> {
  return loadQuestions('v1');
}

export const BUCKET_MATRIX = [
  ['83', '46', '27', '67', '85', '59', '87', '18', '96', '50', '57', '21', '90', '94', '76', '13', '25', '86'],
  ['83', '46', '39', '67', '85', '81', '87', '18', '48', '50', '57', '74', '90', '94', '8', '13', '25', '3'],
  ['83', '91', '39', '67', '65', '81', '87', '78', '48', '50', '77', '74', '90', '4', '8', '13', '26', '3'],
  ['46', '91', '39', '34', '65', '81', '7', '78', '48', '89', '77', '74', '24', '4', '8', '93', '26', '3'],
  ['91', '92', '34', '65', '5', '7', '78', '2', '89', '77', '80', '24', '4', '70', '93', '26', '14'],
  ['20', '92', '34', '75', '5', '7', '43', '2', '89', '53', '80', '24', '55', '70', '93', '29', '14'],
  ['20', '92', '17', '75', '5', '58', '43', '2', '31', '53', '80', '84', '55', '70', '16', '29', '14'],
  ['20', '95', '17', '75', '40', '58', '43', '88', '31', '53', '66', '84', '55', '82', '16', '29', '79'],
  ['27', '95', '17', '59', '40', '58', '96', '88', '31', '21', '66', '84', '76', '82', '16', '86', '79'],
  ['27', '95', '85', '59', '40', '18', '96', '88', '57', '21', '66', '94', '76', '82', '25', '86', '79'],
];

export function getQuestionsForBucket(bucketIndex: number, allQuestions: Question[]): Question[] {
  // v2 题包使用 q1/q2 格式 ID，不使用 BUCKET_MATRIX，直接返回全部题目
  if (allQuestions.length > 0 && allQuestions[0].id.startsWith('q')) {
    return allQuestions;
  }
  const pack = BUCKET_MATRIX[bucketIndex % BUCKET_MATRIX.length];
  const questionIds = ['1', ...pack];
  const questionMap = new Map(allQuestions.map(q => [q.id, q]));
  return questionIds
    .map(id => questionMap.get(id))
    .filter((q): q is Question => q !== undefined);
}
