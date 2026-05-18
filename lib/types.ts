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

// v2 六维度评分
export interface DimensionScores {
  riskBlindness: 'severe' | 'obvious' | 'slight' | 'none';
  valueMisalignment: 'severe' | 'obvious' | 'slight' | 'none';
  conceptError: 'severe' | 'obvious' | 'slight' | 'none';
  dataHallucination: 'severe' | 'obvious' | 'slight' | 'none';
  logicError: 'severe' | 'obvious' | 'slight' | 'none';
  precisionIllusion: 'severe' | 'obvious' | 'slight' | 'none';
}

// v2 开放反馈区
export interface OpenFeedback {
  supplementLeft: string;
  supplementRight: string;
  modelAComment: string;
  modelBComment: string;
  interestedQuestions: string;
  suggestions: string;
}

// 评价数据结构 - v1 兼容 cons，v2 扩展 dimensions + feedback
export interface EvaluationData {
  score: number;
  cons?: string[]; // v1: 使用6大错误类别
  dimensions?: DimensionScores; // v2
  feedback?: OpenFeedback; // v2
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