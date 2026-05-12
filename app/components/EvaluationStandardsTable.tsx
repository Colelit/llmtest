"use client";

interface EvaluationStandard {
  scoreRange: string;
  levelName: string;
  coreFeatures: string;
  humanComparison: string;
  improvementSuggestion: string;
}

const evaluationStandards: EvaluationStandard[] = [
  {
    scoreRange: "1-2分",
    levelName: "有害与劣质",
    coreFeatures: "包含明显错误信息、误导性建议或有害内容；逻辑混乱，完全偏离主题；可能对用户造成经济损失或其他伤害",
    humanComparison: "相当于完全不懂金融的人胡乱给出建议",
    improvementSuggestion: "需要彻底重写，重新审视基础概念和事实准确性"
  },
  {
    scoreRange: "3-4分", 
    levelName: "不合格/无价值",
    coreFeatures: "存在较多事实错误或概念混淆；回答不完整或偏离重点；缺乏实用价值，对用户帮助有限",
    humanComparison: "相当于金融知识有限的人勉强回答，不够可靠",
    improvementSuggestion: "需要补充准确信息，完善回答结构，提高相关性"
  },
  {
    scoreRange: "5-6分",
    levelName: "合格/入门者水平", 
    coreFeatures: "基本概念正确，信息大致准确；回答较为完整但可能缺乏深度；能提供一般性指导但不够精准",
    humanComparison: "相当于刚入门的金融从业者或理财顾问助理的水平",
    improvementSuggestion: "可增加专业深度，提供更具体和个性化的建议"
  },
  {
    scoreRange: "7-8分",
    levelName: "优秀/专家级",
    coreFeatures: "概念准确，逻辑清晰；回答全面且有深度；能提供实用的专业建议；考虑到风险因素和个人情况",
    humanComparison: "相当于经验丰富的理财规划师或投资顾问的专业水准",
    improvementSuggestion: "可进一步个性化建议，增加前瞻性分析"
  },
  {
    scoreRange: "9-10分",
    levelName: "卓越/超越专家",
    coreFeatures: "不仅专业准确，还具有独特洞察；回答全面深入且高度个性化；能预见潜在问题并提供创新解决方案",
    humanComparison: "相当于顶尖投资专家或财富管理大师的水平，甚至更优",
    improvementSuggestion: "几乎无需改进，可作为行业标杆"
  }
];

export default function EvaluationStandardsTable() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-blue-600 text-white">
        <h3 className="text-lg font-bold">评分标准表</h3>
        <p className="text-sm opacity-90 mt-1">请根据以下标准对AI回答进行客观评分</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">得分范围</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">水平名称</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">核心特征</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">人类水平类比</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">改进建议</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {evaluationStandards.map((standard, index) => (
              <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-3 font-medium text-blue-600">{standard.scoreRange}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{standard.levelName}</td>
                <td className="px-4 py-3 text-gray-700 leading-relaxed">{standard.coreFeatures}</td>
                <td className="px-4 py-3 text-gray-600">{standard.humanComparison}</td>
                <td className="px-4 py-3 text-gray-600">{standard.improvementSuggestion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 bg-gray-50 border-t">
        <p className="text-xs text-gray-600">
          <strong>评分提示：</strong> 请综合考虑回答的准确性、完整性、实用性和专业性。建议先通读所有回答，再进行相对评分。
        </p>
      </div>
    </div>
  );
}