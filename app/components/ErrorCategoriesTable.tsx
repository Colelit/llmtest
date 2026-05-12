"use client";

import { ERROR_CATEGORIES } from '@/lib/types';

interface ErrorCategoryInfo {
  key: string;
  name: string;
  description: string;
  examples: string[];
}

const errorCategoryDetails: ErrorCategoryInfo[] = [
  {
    key: 'factual_errors',
    name: '事实与证据谬误',
    description: '回答中包含不准确的数据、过时的信息或选择性呈现事实',
    examples: [
      '引用错误的历史收益率数据',
      '使用过时的税收政策信息',
      '只提及投资优点而隐瞒风险',
      '编造不存在的金融产品或规则'
    ]  
  },
  {
    key: 'logical_errors',
    name: '逻辑与归因错误',
    description: '推理过程存在逻辑漏洞，因果关系错误或循环论证',
    examples: [
      '认为过去涨得好的股票未来必然继续上涨',
      '将相关性错误解读为因果关系',
      '使用结果反推原因的后视镜偏见',
      '基于单一指标得出过度宽泛的结论'
    ]
  },
  {
    key: 'conceptual_errors', 
    name: '概念与框架错配',
    description: '基础概念理解错误或不当混合不同理论框架',
    examples: [
      '混淆股票和债券的基本特征',
      '错误解释复利的计算方式',
      '不合理地结合不同投资理论',
      '对风险收益关系的认知偏差'
    ]
  },
  {
    key: 'precision_illusion',
    name: '虚假精确的幻觉', 
    description: '给出看似精确但缺乏依据的数字或判断标准',
    examples: [
      '武断建议"股票配置比例应为70%"',
      '声称"某股票目标价位是XXX元"',
      '设定僵化的止损点位如"下跌10%必须卖出"',
      '给出无根据的具体时间预测'
    ]
  },
  {
    key: 'risk_blindness',
    name: '风险与预期失察',
    description: '未充分考虑或披露潜在风险，过度乐观预期',
    examples: [
      '只强调投资收益不提示风险',
      '基于历史数据线性外推未来',
      '未考虑极端市场情况的影响',
      '忽略个人风险承受能力差异'
    ]
  },
  {
    key: 'value_misalignment',
    name: '用户价值错位',
    description: '建议与用户实际需求不符，或包含诱导性内容',
    examples: [
      '向保守投资者推荐高风险产品',
      '忽略用户的流动性需求',
      '给出脱离实际情况的理想化建议',
      '回答与问题重点不符或答非所问'
    ]
  }
];

export default function ErrorCategoriesTable() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-red-600 text-white">
        <h3 className="text-lg font-bold">错误类别说明</h3>
        <p className="text-sm opacity-90 mt-1">识别AI回答中的典型问题，可多选</p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {errorCategoryDetails.map((category, index) => (
          <div key={category.key} className={`p-6 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-bold text-sm">{index + 1}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h4>
                <p className="text-gray-700 mb-3 leading-relaxed">{category.description}</p>
                <div>
                  <h5 className="text-sm font-semibold text-gray-800 mb-2">典型表现：</h5>
                  <ul className="grid md:grid-cols-2 gap-2">
                    {category.examples.map((example, exampleIndex) => (
                      <li key={exampleIndex} className="flex items-start space-x-2 text-sm text-gray-600">
                        <span className="text-red-400 mt-1.5 flex-shrink-0">•</span>
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="px-6 py-4 bg-gray-50 border-t">
        <p className="text-xs text-gray-600">
          <strong>使用提示：</strong> 每个回答可能存在多种错误类型，请根据实际情况进行多选标记。这些分类有助于系统性地分析AI回答的问题。
        </p>
      </div>
    </div>
  );
}