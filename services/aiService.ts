// services/aiService.ts
import { DataPoint, RegressionParams, RegressionMetrics, AIModel, AIProvider } from '../types';

// 各提供商的配置
const PROVIDER_CONFIG = {
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com',
    models: {
      'gemini-3-pro': 'gemini-3-pro-preview',
      'gemini-3-flash': 'gemini-3-flash-preview'
    }
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    models: {
      'deepseek-chat': 'deepseek-chat',
      'deepseek-reasoner': 'deepseek-reasoner'
    }
  }
};

// 主分析函数
export const analyzeRegression = async (
  params: RegressionParams,
  metrics: RegressionMetrics,
  data: DataPoint[],
  modelName: AIModel = 'gemini-3-pro',
  apiKey?: string,
  provider: AIProvider = 'gemini'
) => {
  if (!apiKey) {
    throw new Error('未提供API Key。请先在设置中配置。');
  }

  try {
    if (provider === 'gemini') {
      return await callGeminiAPI(params, metrics, data, modelName, apiKey);
    } else if (provider === 'deepseek') {
      return await callDeepSeekAPI(params, metrics, data, modelName, apiKey);
    } else {
      throw new Error(`不支持的AI提供商: ${provider}`);
    }
  } catch (error: any) {
    console.error(`${provider} API 错误:`, error);
    throw handleAPIError(error, provider);
  }
};

// Gemini API 调用
async function callGeminiAPI(
  params: RegressionParams,
  metrics: RegressionMetrics,
  data: DataPoint[],
  modelName: AIModel,
  apiKey: string
): Promise<string> {
  const config = PROVIDER_CONFIG.gemini;
  const model = config.models[modelName] || 'gemini-3-pro-preview';
  
  const prompt = buildAnalysisPrompt(params, metrics, data, 'gemini');
  
  const response = await fetch(
    `${config.baseURL}/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 2000
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 错误 (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Gemini 未返回有效内容');
  }

  return formatResponse(content, 'gemini', modelName);
}

// DeepSeek API 调用
async function callDeepSeekAPI(
  params: RegressionParams,
  metrics: RegressionMetrics,
  data: DataPoint[],
  modelName: AIModel,
  apiKey: string
): Promise<string> {
  const config = PROVIDER_CONFIG.deepseek;
  const model = config.models[modelName] || 'deepseek-chat';
  
  const messages = [
    {
      role: 'system',
      content: '你是一个顶级统计学家和数据建模专家，正在为一个交互式回归分析实验室提供专业的分析报告。'
    },
    {
      role: 'user',
      content: buildAnalysisPrompt(params, metrics, data, 'deepseek')
    }
  ];

  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 错误 (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('DeepSeek 未返回有效内容');
  }

  return formatResponse(content, 'deepseek', modelName);
}

// 构建分析提示词
function buildAnalysisPrompt(
  params: RegressionParams,
  metrics: RegressionMetrics,
  data: DataPoint[],
  provider: AIProvider
): string {
  const sampleSize = data.length;
  const parentMean = data.reduce((sum, d) => sum + d.parent, 0) / sampleSize;
  const childMean = data.reduce((sum, d) => sum + d.child, 0) / sampleSize;
  
  const providerStyle = provider === 'deepseek' 
    ? '请以 DeepSeek 的身份，提供深度、严谨、数学化的分析。'
    : '请以 Gemini 的身份，提供专业、清晰、易于理解的分析。';

  return `
# 回归分析专家报告

## 数据集背景
我正在分析高尔顿遗传数据集（Francis Galton, 1886），记录了 928 对父母与子女的身高关系，这是"回归现象"的发现基础。

## 当前回归模型
- **回归方程**: ŷ = ${params.slope.toFixed(4)}x + ${params.intercept.toFixed(4)}
- **样本容量**: n = ${sampleSize}
- **父母平均身高**: ${parentMean.toFixed(2)} 英寸
- **子女平均身高**: ${childMean.toFixed(2)} 英寸

## 模型性能指标
1. **拟合优度 (R²)**: ${metrics.rSquared.toFixed(4)}
2. **均方误差 (MSE)**: ${metrics.mse.toFixed(4)}
3. **均方根误差 (RMSE)**: ${metrics.rmse.toFixed(4)}
4. **平均绝对误差 (MAE)**: ${metrics.mae.toFixed(4)}
5. **皮尔逊相关系数 (r)**: ${metrics.pearsonR.toFixed(4)}
6. **标准误差**: ${metrics.standardError.toFixed(4)}

## 分析要求
${providerStyle}

### 1. 模型质量评估
- 基于统计指标评估当前拟合质量
- 解释 R² 和相关系数的实际意义

### 2. 回归现象分析
- 解释斜率 ${params.slope.toFixed(4)} 的含义
- 说明"向平均值回归"的统计学原理

### 3. 优化建议
- 参数是否需要调整？如何调整？
- 改进模型的建议

### 4. 专业洞察
- 模型的局限性
- 现代统计学的改进方法

请使用专业的学术语言，同时保持对初学者的友好性。
`;
}

// 格式化响应
function formatResponse(content: string, provider: AIProvider, modelName: AIModel): string {
  const timestamp = new Date().toLocaleString();
  const providerName = provider === 'gemini' ? 'Google Gemini' : 'DeepSeek';
  
  return `# 🔍 AI 回归分析报告

**服务提供商**: ${providerName}
**模型版本**: ${modelName}
**分析时间**: ${timestamp}
**报告状态**: ✅ 实时 AI 分析

---

${content}

---

*分析由 ${providerName} ${modelName} 生成，仅供参考和学习使用*`;
}

// 错误处理
function handleAPIError(error: any, provider: AIProvider): Error {
  const errorMessage = error.message?.toLowerCase() || '';
  
  // 认证错误
  if (errorMessage.includes('401') || 
      errorMessage.includes('unauthorized') || 
      errorMessage.includes('api key') ||
      errorMessage.includes('invalid')) {
    return new Error('API Key 无效或已过期');
  }
  
  // 额度限制
  if (errorMessage.includes('429') || 
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota')) {
    return new Error('API 调用额度已用完');
  }
  
  // 网络错误
  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') ||
      errorMessage.includes('failed to fetch')) {
    return new Error('网络连接失败，请检查网络设置');
  }
  
  // 服务错误
  if (errorMessage.includes('5')) {
    return new Error(`${provider === 'gemini' ? 'Gemini' : 'DeepSeek'} 服务暂时不可用，请稍后重试`);
  }
  
  return new Error(`${provider === 'gemini' ? 'Gemini' : 'DeepSeek'} 分析失败: ${error.message || '未知错误'}`);
}

// 验证 API Key 格式
export function validateApiKey(key: string, provider: AIProvider): boolean {
  if (!key || key.trim().length < 20) return false;
  
  switch (provider) {
    case 'gemini':
      return key.startsWith('AIza');
    case 'deepseek':
      return key.startsWith('sk-') || key.startsWith('dsk_');
    default:
      return key.length > 20;
  }
}