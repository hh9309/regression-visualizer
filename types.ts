
export interface DataPoint {
  parent: number;
  child: number;
}

export interface RegressionParams {
  slope: number;
  intercept: number;
}

export interface RegressionMetrics {
  mse: number;       // Mean Squared Error
  rmse: number;      // Root Mean Squared Error
  mae: number;       // Mean Absolute Error
  rSquared: number;  // R-Squared (Coefficient of Determination)
  pearsonR: number;  // Pearson Correlation Coefficient
  standardError: number; // Standard Error of the Estimate
}

// AI 提供商和模型类型
export type AIProvider = 'gemini' | 'deepseek';

export type AIModel = 
  | 'gemini-3-pro' 
  | 'gemini-3-flash'
  | 'deepseek-chat'
  | 'deepseek-reasoner';