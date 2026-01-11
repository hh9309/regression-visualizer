
import React, { useState } from 'react';

const KnowledgeBase: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const modules = [
    {
      title: "回归核心思想",
      content: "回归分析的核心在于探索变量间的相关关系。弗朗西斯·高尔顿通过观察发现，极端身高的父母，其子女身高往往更接近人群平均水平。这种‘向平均值回归’的现象，揭示了自然规律。它是统计学预测的基础，试图通过已知变量来解释和预测未知变量。"
    },
    {
      title: "最小二乘法 (OLS)",
      content: "最小二乘法是一种数学优化技术。它通过最小化残差（观测值与预测值之差）的平方和来寻找数据的最佳函数匹配。在简单线性回归中，我们通过调整斜率和截距，使得所有数据点到回归线的垂直距离的平方和达到最小。"
    },
    {
      title: "数学推导简述",
      content: "设目标函数为误差平方和 L。为了求得最小值，我们分别对斜率 w 和截距 b 求偏导并令其为 0。通过解这组线性方程组，我们可以精确获得最佳的斜率 w 和截距 b。这是现代数据建模最基本的解析解法之一。"
    },
    {
      title: "相关性与局限",
      content: "回归线显示了变量之间的数学联系，但并不自动意味着因果关系。相关性描述的是数值上的同步演化。在应用回归模型时，必须结合领域知识来判断模型是否具有实际解释力，防止陷入统计性偏误，尤其是在小样本或受限数据中。"
    }
  ];

  return (
    <div className="bg-white rounded-[2.5rem] border border-indigo-50 shadow-lg overflow-hidden transition-all hover:shadow-indigo-50/50">
      <div className="flex bg-slate-50/50 p-2 overflow-x-auto gap-1">
        {modules.map((m, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`flex-1 px-6 py-3 text-[11px] font-bold rounded-2xl transition-all whitespace-nowrap ${
              activeTab === idx 
                ? "text-indigo-600 bg-white shadow-md shadow-indigo-100/50 scale-[1.02]" 
                : "text-slate-400 hover:text-indigo-500 hover:bg-white/50"
            }`}
          >
            {m.title}
          </button>
        ))}
      </div>
      <div className="p-10">
        <div className="prose prose-indigo max-w-none">
          <p className="text-slate-500 leading-[2] text-sm font-medium">
            {modules[activeTab].content}
          </p>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
