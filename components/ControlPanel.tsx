
import React from 'react';
import { RegressionParams, RegressionMetrics } from '../types';

interface Props {
  params: RegressionParams;
  metrics: RegressionMetrics;
  onParamsChange: (params: RegressionParams) => void;
  onAutoFit: () => void;
}

const ControlPanel: React.FC<Props> = ({ params, metrics, onParamsChange, onAutoFit }) => {
  const handleSlopeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onParamsChange({ ...params, slope: parseFloat(e.target.value) });
  };

  const handleInterceptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onParamsChange({ ...params, intercept: parseFloat(e.target.value) });
  };

  const metricItems = [
    { label: "均方误差 (MSE)", value: metrics.mse, color: "text-indigo-600" },
    { label: "拟合优度 (R²)", value: metrics.rSquared, color: "text-sky-500" },
    { label: "相关系数 (r)", value: metrics.pearsonR, color: "text-indigo-400" },
    { label: "标准误差", value: metrics.standardError, color: "text-slate-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-8 flex items-center">
          <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full mr-3 shadow-md shadow-indigo-100"></div>
          模型参数动态调控
        </h3>
        
        <div className="space-y-12">
          <div className="relative">
            <div className="flex justify-between mb-4 items-end">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">回归斜率 (Slope)</label>
              <div className="bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                <span className="text-xs font-mono font-bold text-indigo-600">{params.slope.toFixed(2)}</span>
              </div>
            </div>
            <input 
              type="range" 
              min="0.00" 
              max="2.00" 
              step="0.01" 
              value={params.slope} 
              onChange={handleSlopeChange}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div className="relative">
            <div className="flex justify-between mb-4 items-end">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">截距偏移 (Intercept)</label>
              <div className="bg-sky-50 px-3 py-1 rounded-lg border border-sky-100">
                <span className="text-xs font-mono font-bold text-sky-500">{params.intercept.toFixed(2)}</span>
              </div>
            </div>
            <input 
              type="range" 
              min="0.00" 
              max="100.00" 
              step="0.1" 
              value={params.intercept} 
              onChange={handleInterceptChange}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <button 
            onClick={onAutoFit}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100 transition-all active:scale-[0.98] uppercase tracking-[0.2em] shadow-sm shadow-indigo-100"
          >
            执行自动拟合算法
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metricItems.map((item, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="text-[8px] text-slate-400 mb-1.5 font-bold uppercase tracking-widest">{item.label}</div>
            <div className={`text-sm font-mono font-black ${item.color}`}>
              {isNaN(item.value) ? "0.00" : item.value.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ControlPanel;
