export interface ModelAnswer {
  modelId: string;
  modelDisplayName: string;
  contentHtml: string;
}

export interface Question {
  id: string;
  text: string;
  answers: ModelAnswer[];
}

// 评价数据结构 - 删除优点，更新缺点分类
export interface EvaluationData {
  score: number;
  cons: string[]; // 使用新的6大错误类别
}

// 用户信息结构 - 更新字段
export interface UserInfo {
  name: string;
  financialLearningYears: string; // 替换 profession
  gender: string; // 新增性别字段
  experience: string; // 保持原有的使用频率字段
}

// 布局模式类型 - 从10模型调整为8模型
export type LayoutMode = '1x8' | '2x4';

// 6大专业错误类别
export const ERROR_CATEGORIES = {
  factual_errors: '事实与证据谬误',
  logical_errors: '逻辑与归因错误', 
  conceptual_errors: '概念与框架错配',
  precision_illusion: '虚假精确的幻觉',
  risk_blindness: '风险与预期失察',
  value_misalignment: '用户价值错位'
} as const;

export const ERROR_CATEGORY_KEYS = Object.keys(ERROR_CATEGORIES) as Array<keyof typeof ERROR_CATEGORIES>; 