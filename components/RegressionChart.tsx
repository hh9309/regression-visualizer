
import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Scatter
} from 'recharts';
import { DataPoint, RegressionParams } from '../types';

interface Props {
  data: DataPoint[];
  params: RegressionParams;
}

const DEFAULT_X = [58, 76];
const DEFAULT_Y = [55, 80];

const RegressionChart: React.FC<Props> = ({ data, params }) => {
  const [xDomain, setXDomain] = useState<number[]>(DEFAULT_X);
  const [yDomain, setYDomain] = useState<number[]>(DEFAULT_Y);
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  const regressionLineData = useMemo(() => {
    // 动态生成回归线段，确保其覆盖当前视图范围
    const startX = xDomain[0] - 5;
    const endX = xDomain[1] + 5;
    
    return [
      { 
        parent: startX, 
        child: params.slope * startX + params.intercept 
      },
      { 
        parent: endX, 
        child: params.slope * endX + params.intercept 
      }
    ];
  }, [params.slope, params.intercept, xDomain]);

  // 重置视角
  const resetView = () => {
    setXDomain(DEFAULT_X);
    setYDomain(DEFAULT_Y);
  };

  // 滚轮缩放处理
  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    const xRange = xDomain[1] - xDomain[0];
    const yRange = yDomain[1] - yDomain[0];
    
    const newXRange = xRange * zoomFactor;
    const newYRange = yRange * zoomFactor;
    
    const xMid = (xDomain[0] + xDomain[1]) / 2;
    const yMid = (yDomain[0] + yDomain[1]) / 2;

    setXDomain([xMid - newXRange / 2, xMid + newXRange / 2]);
    setYDomain([yMid - newYRange / 2, yMid + newYRange / 2]);
  };

  // 拖拽平移处理
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !lastMousePos.current || !containerRef.current) return;

    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    const { width, height } = containerRef.current.getBoundingClientRect();

    // 将像素位移转换为数据单位位移
    const xDataMove = (dx / width) * (xDomain[1] - xDomain[0]);
    const yDataMove = (dy / height) * (yDomain[1] - yDomain[0]);

    setXDomain([xDomain[0] - xDataMove, xDomain[1] - xDataMove]);
    setYDomain([yDomain[0] + yDataMove, yDomain[1] + yDataMove]);

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [isPanning, xDomain, yDomain]);

  const handleMouseUp = () => {
    setIsPanning(false);
    lastMousePos.current = null;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md shadow-2xl border border-indigo-100 p-4 rounded-2xl text-[11px] ring-1 ring-black/5">
          <p className="font-bold text-slate-800 mb-2 flex items-center">
            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
            样本数据详情
          </p>
          <div className="space-y-1">
            <p className="text-slate-500 flex justify-between gap-4">
              <span>父母身高:</span>
              <span className="text-indigo-600 font-mono font-bold">{payload[0].value.toFixed(2)} in</span>
            </p>
            <p className="text-slate-500 flex justify-between gap-4">
              <span>子女身高:</span>
              <span className="text-indigo-600 font-mono font-bold">{(payload[1]?.value || payload[0].payload.child).toFixed(2)} in</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatTick = (val: number) => val.toFixed(2);

  return (
    <div className="relative group">
      {/* 交互提示及重置按钮 */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-indigo-50 text-[10px] text-indigo-400 font-bold flex items-center shadow-sm">
          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          滚轮缩放 / 拖拽平移
        </div>
        <button 
          onClick={resetView}
          className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-full shadow-lg transition-transform active:scale-90"
          title="重置视角"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div 
        ref={containerRef}
        className={`w-full h-[480px] bg-slate-50/40 rounded-[2.5rem] p-6 transition-colors ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="6 6" vertical={true} stroke="#e2e8f0" strokeOpacity={0.6} />
            
            <XAxis 
              type="number" 
              dataKey="parent" 
              domain={xDomain} 
              allowDataOverflow
              stroke="#64748b" 
              fontSize={11}
              tickLine={true}
              tickFormatter={formatTick}
              axisLine={{ stroke: '#94a3b8', strokeWidth: 2.5 }}
              tick={{ fill: '#64748b', fontWeight: 600 }}
              label={{ value: '父母平均身高 (Inches)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#475569', fontWeight: 800, letterSpacing: '0.05em' }}
            />
            
            <YAxis 
              type="number" 
              dataKey="child" 
              domain={yDomain} 
              allowDataOverflow
              stroke="#64748b" 
              fontSize={11}
              tickLine={true}
              tickFormatter={formatTick}
              axisLine={{ stroke: '#94a3b8', strokeWidth: 2.5 }}
              tick={{ fill: '#64748b', fontWeight: 600 }}
              label={{ value: '子女身高 (Inches)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569', fontWeight: 800, letterSpacing: '0.05em' }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Scatter 
              name="Galton Data" 
              data={data} 
              fill="#6366f1" 
              shape="circle" 
              fillOpacity={0.6}
            />
            
            <Line
              type="monotone"
              data={regressionLineData}
              dataKey="child"
              stroke="#4f46e5"
              strokeWidth={4}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RegressionChart;
