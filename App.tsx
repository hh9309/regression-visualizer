import React, { useState, useMemo, useEffect } from 'react';
import { GALTON_DATA, INITIAL_PARAMS } from './constants';
import { RegressionParams, RegressionMetrics, AIModel, AIProvider } from './types';
import RegressionChart from './components/RegressionChart';
import ControlPanel from './components/ControlPanel';
import KnowledgeBase from './components/KnowledgeBase';
import { analyzeRegression, validateApiKey } from './services/aiService';

const App: React.FC = () => {
  const [params, setParams] = useState<RegressionParams>(INITIAL_PARAMS);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-3-pro');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [showSettings, setShowSettings] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [apiKey, setApiKey] = useState<string>('');

  // 初始化时从本地存储加载配置
  useEffect(() => {
    const savedApiKey = localStorage.getItem('REGRESSION_AI_API_KEY');
    const savedProvider = localStorage.getItem('REGRESSION_AI_PROVIDER') as AIProvider | null;
    const savedModel = localStorage.getItem('REGRESSION_AI_MODEL') as AIModel | null;
    
    if (savedApiKey && savedProvider && savedModel) {
      setApiKey(savedApiKey);
      setSelectedProvider(savedProvider);
      setSelectedModel(savedModel);
      setHasKey(true);
    }
  }, []);

  const metrics = useMemo<RegressionMetrics>(() => {
    let sse = 0, sae = 0, sst = 0;
    let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;
    const n = GALTON_DATA.length;
    const meanY = GALTON_DATA.reduce((acc, d) => acc + d.child, 0) / n;

    GALTON_DATA.forEach(d => {
      const prediction = params.slope * d.parent + params.intercept;
      const error = d.child - prediction;
      sse += Math.pow(error, 2);
      sae += Math.abs(error);
      sst += Math.pow(d.child - meanY, 2);
      sumX += d.parent;
      sumY += d.child;
      sumX2 += d.parent * d.parent;
      sumY2 += d.child * d.child;
      sumXY += d.parent * d.child;
    });

    const mse = sse / n;
    const rmse = Math.sqrt(mse);
    const mae = sae / n;
    const rSquared = sst === 0 ? 0 : 1 - (sse / sst);
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const pearsonR = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const standardError = n > 2 ? Math.sqrt(sse / (n - 2)) : 0;

    return { mse, rmse, mae, rSquared, pearsonR, standardError };
  }, [params]);

  const autoFit = () => {
    const n = GALTON_DATA.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    GALTON_DATA.forEach(d => {
      sumX += d.parent; sumY += d.child;
      sumXY += d.parent * d.child; sumX2 += d.parent * d.parent;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    setParams({ slope, intercept });
  };

  const handleVerifyKey = () => {
    if (!keyInput.trim()) {
      alert(`请输入${getProviderDisplayName(selectedProvider)} API密钥`);
      return;
    }
    
    setIsVerifying(true);
    
    // 验证密钥格式
    const isValid = validateApiKey(keyInput, selectedProvider);
    if (!isValid) {
      const formatHint = selectedProvider === 'gemini' 
        ? '应以 "AIza" 开头'
        : '应以 "sk-" 或 "dsk_" 开头';
      alert(`${getProviderDisplayName(selectedProvider)} API Key格式不正确，${formatHint}`);
      setIsVerifying(false);
      return;
    }
    
    try {
      // 保存到本地存储
      localStorage.setItem('REGRESSION_AI_API_KEY', keyInput);
      localStorage.setItem('REGRESSION_AI_PROVIDER', selectedProvider);
      localStorage.setItem('REGRESSION_AI_MODEL', selectedModel);
      
      setApiKey(keyInput);
      setHasKey(true);
      setShowSettings(false);
      
      setKeyInput('');
      
      setTimeout(() => {
        alert(`🎉 ${getProviderDisplayName(selectedProvider)} API Key 配置成功！`);
      }, 100);
      
    } catch (error) {
      console.error('API Key保存失败:', error);
      alert('配置保存失败，请重试');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!hasKey || !apiKey) {
      setShowSettings(true);
      return;
    }
    
    setIsAnalyzing(true);
    setAiAnalysis('');
    
    try {
      const result = await analyzeRegression(
        params,
        metrics,
        GALTON_DATA,
        selectedModel,
        apiKey,
        selectedProvider
      );
      
      setAiAnalysis(result);
    } catch (e: any) {
      console.error('AI分析错误:', e);
      
      if (e.message?.includes('API Key无效') || 
          e.message?.includes('已过期') ||
          e.message?.includes('认证')) {
        // 清除无效密钥
        localStorage.removeItem('REGRESSION_AI_API_KEY');
        localStorage.removeItem('REGRESSION_AI_PROVIDER');
        localStorage.removeItem('REGRESSION_AI_MODEL');
        setHasKey(false);
        setApiKey('');
        setShowSettings(true);
        setAiAnalysis(`🔑 API Key无效，请重新配置`);
      } else if (e.message?.includes('网络')) {
        setAiAnalysis(`🌐 网络连接失败，请检查网络`);
      } else if (e.message?.includes('额度')) {
        setAiAnalysis(`💰 API使用额度不足`);
      } else {
        setAiAnalysis(`❌ 分析失败：${e.message || '未知错误'}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getProviderDisplayName = (provider: AIProvider): string => {
    return provider === 'gemini' ? 'Google Gemini' : 'DeepSeek';
  };

  const getProviderModels = (provider: AIProvider): AIModel[] => {
    return provider === 'gemini' 
      ? ['gemini-3-pro', 'gemini-3-flash']
      : ['deepseek-chat', 'deepseek-reasoner'];
  };

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    const models = getProviderModels(provider);
    if (models.length > 0) {
      setSelectedModel(models[0]);
    }
    setKeyInput('');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-700 pb-20 font-sans selection:bg-indigo-100">
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-slate-900">回归分析交互实验室</h1>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${hasKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-400'}`}></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {hasKey ? `${getProviderDisplayName(selectedProvider)} READY` : 'AI 分析待配置'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all border ${showSettings ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            AI 配置
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">
        {showSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-indigo-900/10 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden border border-white">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">AI 服务配置</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">API Configuration</p>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-slate-300 hover:text-indigo-600 transition-colors p-1 hover:bg-slate-50 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-8">
                {/* 1. 选择服务提供商 */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px]">1</span>
                    选择 AI 服务商
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleProviderChange('gemini')}
                      className={`p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center ${selectedProvider === 'gemini' 
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-400 shadow-lg shadow-blue-100' 
                        : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}`}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-sm font-black text-slate-800">Gemini</div>
                      <div className="text-[10px] text-slate-500">免费额度</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleProviderChange('deepseek')}
                      className={`p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center ${selectedProvider === 'deepseek' 
                        ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-400 shadow-lg shadow-blue-100' 
                        : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}`}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                      <div className="text-sm font-black text-slate-800">DeepSeek</div>
                      <div className="text-[10px] text-slate-500">高性价比</div>
                    </button>
                  </div>
                </div>

                {/* 2. API Key 输入 */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px]">2</span>
                    输入 {getProviderDisplayName(selectedProvider)} API Key
                  </label>
                  <div className="space-y-4">
                    <div className="relative">
                      <input 
                        type="password"
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder={`输入 ${getProviderDisplayName(selectedProvider)} API Key...`}
                        className={`w-full h-14 px-5 rounded-2xl border-2 text-sm font-mono transition-all outline-none ${keyInput.trim() ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-300 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-200 focus:border-indigo-400 focus:shadow-md'}`}
                      />
                      {keyInput.trim() && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <div className={`w-3 h-3 rounded-full ${validateApiKey(keyInput, selectedProvider) ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-medium mb-1">密钥格式：</p>
                      <p className="text-[9px] text-slate-400">
                        {selectedProvider === 'gemini' 
                          ? '以 "AIza" 开头，从 Google AI Studio 获取'
                          : '以 "sk-" 或 "dsk_" 开头，从 DeepSeek 平台获取'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. 模型选择 */}
                <div className={`space-y-6 ${!keyInput.trim() ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px]">3</span>
                    选择模型
                  </label>
                  <div className="space-y-6">
                    <div className="relative">
                      <select 
                        disabled={!keyInput.trim()}
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value as AIModel)}
                        className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-slate-200 font-bold text-slate-700 text-sm appearance-none focus:border-indigo-400 focus:shadow-md outline-none transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {getProviderModels(selectedProvider).map(model => (
                          <option key={model} value={model}>
                            {model === 'gemini-3-pro' && 'Gemini 3 Pro (深度分析)'}
                            {model === 'gemini-3-flash' && 'Gemini 3 Flash (快速响应)'}
                            {model === 'deepseek-chat' && 'DeepSeek Chat (通用型)'}
                            {model === 'deepseek-reasoner' && 'DeepSeek Reasoner (推理型)'}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <button 
                      onClick={handleVerifyKey}
                      disabled={isVerifying || !keyInput.trim() || !validateApiKey(keyInput, selectedProvider)}
                      className="w-full h-14 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 hover:scale-[1.02] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {isVerifying ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          验证中...
                        </>
                      ) : '确认配置'}
                    </button>
                    
                    {hasKey && (
                      <div className="p-3 bg-green-50 rounded-xl border border-green-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-bold text-green-700">已配置</span>
                        </div>
                        <button 
                          onClick={() => {
                            localStorage.removeItem('REGRESSION_AI_API_KEY');
                            localStorage.removeItem('REGRESSION_AI_PROVIDER');
                            localStorage.removeItem('REGRESSION_AI_MODEL');
                            setHasKey(false);
                            setApiKey('');
                            setKeyInput('');
                          }}
                          className="text-[10px] text-red-500 font-bold hover:text-red-700"
                        >
                          清除
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 text-center">
                    密钥仅保存在浏览器本地，不会上传到服务器
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter">拟合空间实时可视化</h2>
                  <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">Interactive Regression Mapping</p>
                </div>
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 rounded-2xl border border-indigo-100 shadow-sm">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">当前估计方程</div>
                  <div className="text-xl font-mono font-black text-slate-800">
                    ŷ = <span className="text-indigo-600">{params.slope.toFixed(4)}</span>x + <span className="text-indigo-600">{params.intercept.toFixed(4)}</span>
                  </div>
                </div>
              </div>
              <RegressionChart data={GALTON_DATA} params={params} />
            </section>

            <KnowledgeBase />

            <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-3 rounded-2xl shadow-lg shadow-indigo-100">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">AI 分析报告</h2>
                    <p className="text-[10px] font-bold text-slate-400">
                      {hasKey ? `${getProviderDisplayName(selectedProvider)} - ${selectedModel}` : '请先配置 AI 服务'}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing || !hasKey}
                  className={`px-8 h-12 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center gap-2 ${isAnalyzing ? 'bg-indigo-50 text-indigo-300 cursor-wait' : !hasKey ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-2xl hover:shadow-indigo-200'}`}
                >
                  {isAnalyzing ? '分析中...' : (!hasKey ? '配置密钥' : '生成报告')}
                </button>
              </div>

              <div className="min-h-[300px]">
                {aiAnalysis ? (
                  <div className="p-8 bg-gradient-to-br from-indigo-50/20 to-blue-50/20 rounded-[2rem] border border-indigo-50 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap animate-in fade-in duration-500">
                    <div className="mb-4 p-3 bg-white/50 rounded-xl border border-indigo-100">
                      <span className="text-xs font-bold text-indigo-600">
                        {getProviderDisplayName(selectedProvider)} 分析报告
                      </span>
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
                  </div>
                ) : (
                  <div className="h-60 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center shadow-sm mb-4 opacity-60">
                      <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                      {hasKey ? '点击按钮生成分析报告' : '请配置 AI 服务'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-28 space-y-10">
              <ControlPanel params={params} metrics={metrics} onParamsChange={setParams} onAutoFit={autoFit} />
              
              {/* 实验原理模块 - 内容增加到40字 */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-sm">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-6">
                  实验原理速览
                </h4>
                <div className="space-y-6 text-sm text-indigo-900/70">
                  <div>
                    <strong className="text-indigo-900 block mb-2 uppercase tracking-wider">● 最小二乘法原理：</strong>
                    <p className="leading-relaxed">
                      通过数学优化寻找最佳拟合直线，使所有数据点到回归线的垂直距离平方和达到最小，
                      这是回归分析中最基础且重要的参数估计方法。
                    </p>
                  </div>
                  <div>
                    <strong className="text-indigo-900 block mb-2 uppercase tracking-wider">● 高尔顿回归现象：</strong>
                    <p className="leading-relaxed">
                      19世纪高尔顿发现子女身高趋向于人群平均值的统计规律，这一“回归均值”现象
                      奠定了现代统计学基础，揭示了遗传与环境因素的复杂相互作用。
                    </p>
                  </div>
                  <div>
                    <strong className="text-indigo-900 block mb-2 uppercase tracking-wider">● AI增强分析技术：</strong>
                    <p className="leading-relaxed">
                      结合Gemini或DeepSeek大模型技术，提供超越传统统计的深度洞察，能够自动
                      识别模式、给出优化建议，并解释复杂统计概念，使数据分析更智能高效。
                    </p>
                  </div>
                  <div>
                    <strong className="text-indigo-900 block mb-2 uppercase tracking-wider">● 模型评估指标：</strong>
                    <p className="leading-relaxed">
                      通过R²、MSE、相关系数等多个统计指标全面评估回归模型质量，这些指标从不同
                      角度反映拟合精度、预测能力和变量间关系的强度与方向。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em]">
          © 2025 回归分析实验室 | 支持 Gemini & DeepSeek AI
        </p>
      </footer>
    </div>
  );
};

export default App;