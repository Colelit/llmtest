/**
 * 模型注册表
 * 统一管理所有接入评测系统的模型元数据
 */

export interface ModelInfo {
  slug: string;           // 唯一标识，如 'gemini'
  displayName: string;    // 展示名，如 'Gemini'
  family: 'generic' | 'vertical';  // 模型家族：通用 / 垂类
  source: 'api' | 'manual' | 'manual_image' | 'scrape';  // 数据来源
  adapterType: 'default' | 'manual' | 'scrape';  // 解析适配器类型
  isActive: boolean;      // 是否激活参与评测
}

/**
 * 全量模型注册表
 * 垂类截图模型使用 manual_image 来源 + manual 适配器，保留图片引用、跳过文本清洗
 */
export const MODEL_REGISTRY: ModelInfo[] = [
  // 通用模型（API 来源）
  { slug: 'chatgpt', displayName: 'ChatGPT', family: 'generic', source: 'api', adapterType: 'default', isActive: true },
  { slug: 'gemini', displayName: 'Gemini', family: 'generic', source: 'api', adapterType: 'default', isActive: true },
  { slug: 'deepseek', displayName: 'DeepSeek', family: 'generic', source: 'api', adapterType: 'default', isActive: true },

  // 通用模型（手动录入，需清洗）
  { slug: 'doubao', displayName: '豆包', family: 'generic', source: 'manual', adapterType: 'manual', isActive: true },

  // 垂类模型（截图录入，保留图片引用）
  { slug: 'maxiaocai', displayName: '匿名模型C', family: 'vertical', source: 'manual_image', adapterType: 'manual', isActive: true },
  { slug: 'tonghuashun', displayName: '匿名模型D', family: 'vertical', source: 'manual_image', adapterType: 'manual', isActive: true },

  // 垂类预留（未激活）
  { slug: 'wind-alice', displayName: 'Wind Alice', family: 'vertical', source: 'scrape', adapterType: 'scrape', isActive: false },
  { slug: 'miaoxiang', displayName: '妙想', family: 'vertical', source: 'scrape', adapterType: 'scrape', isActive: false },
];

/**
 * 获取当前激活的模型列表
 */
export function getActiveModels(): ModelInfo[] {
  return MODEL_REGISTRY.filter(m => m.isActive);
}

/**
 * 根据 slug 查找模型信息
 */
export function getModelBySlug(slug: string): ModelInfo | undefined {
  return MODEL_REGISTRY.find(m => m.slug === slug);
}

/**
 * 判断模型是否为截图来源（manual_image）
 * 截图模型需保留 Markdown 图片引用，跳过文本清洗
 */
export function isImageSource(modelSlug: string): boolean {
  const model = getModelBySlug(modelSlug);
  return model?.source === 'manual_image';
}
