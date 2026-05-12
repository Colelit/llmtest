import type { ModelAnswer, EvaluationData } from "@/lib/types";
import { ERROR_CATEGORIES, ERROR_CATEGORY_KEYS } from '@/lib/types';

type EvaluationCardProps = {
  questionId: string;
  answer: ModelAnswer;
  evaluation: EvaluationData;
  onUpdate: (questionId: string, modelId: string, data: EvaluationData) => void;
};

export default function EvaluationCard({ questionId, answer, evaluation, onUpdate }: EvaluationCardProps) {
  
  if (!evaluation) return null; // In case data is not ready yet

  const handleScoreChange = (newScore: number) => {
    onUpdate(questionId, answer.modelId, { ...evaluation, score: newScore });
  };

  const handleCheckboxChange = (option: string) => {
    const newList = evaluation.cons.includes(option)
      ? evaluation.cons.filter(item => item !== option)
      : [...evaluation.cons, option];
    
    onUpdate(questionId, answer.modelId, { ...evaluation, cons: newList });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
      <div className="p-2 bg-gray-700 text-white">
        <h3 className="text-lg font-semibold">{answer.modelDisplayName}</h3>
      </div>
      <div className="flex-1 border-t border-b border-gray-200">
        <iframe
          srcDoc={answer.contentHtml}
          className="w-full h-full min-h-[300px] border-0 evaluation-iframe"
          title={`${answer.modelDisplayName}'s Answer`}
        />
      </div>
      <div className="p-2 bg-gray-50">
        {/* Scoring */}
        <div className="mb-2">
          <p className="block text-xs font-medium text-gray-700 mb-1">评分 (1-10分)</p>
          <div className="flex flex-wrap gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
              <button
                key={s}
                onClick={() => handleScoreChange(s)}
                className={`w-6 h-6 rounded-full transition-colors text-xs ${
                  evaluation.score === s ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {/* 缺点 - 6大专业错误类别 */}
        <div>
          <p className="block text-xs font-medium text-gray-700 mb-1">错误类别 (可多选)</p>
          <div className="grid grid-cols-3 gap-1">
            {ERROR_CATEGORY_KEYS.map(key => (
              <label key={key} className="flex items-start space-x-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={evaluation.cons.includes(key)}
                  onChange={() => handleCheckboxChange(key)}
                  className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-xs leading-tight">{ERROR_CATEGORIES[key]}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">
                    {key === 'factual_errors' && '数据幻觉、事实硬伤'}
                    {key === 'logical_errors' && '后视镜偏见、循环论证'}
                    {key === 'conceptual_errors' && '基础概念混淆、过度简化'}
                    {key === 'precision_illusion' && '武断配置比例、神秘价格点位'}
                    {key === 'risk_blindness' && '报喜不报忧、线性外推'}
                    {key === 'value_misalignment' && '不切实际建议、答非所问'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 