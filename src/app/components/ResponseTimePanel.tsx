import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Clock, AlertCircle } from 'lucide-react';

interface ResponseTimeData {
  time: string;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}

interface ResponseTimePanelProps {
  data: ResponseTimeData[];
}

export function ResponseTimePanel({ data }: ResponseTimePanelProps) {
  // 空数据状态
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-lg">响应时间分析</h3>
          </div>
        </div>
        <div className="h-[280px] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无数据</p>
            <p className="text-sm mt-1">点击右上角"刷新数据"加载</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-lg">响应时间分析</h3>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>P50</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>P95</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>P99</span>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorP99" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 12 }} />
          <YAxis label={{ value: '响应时间 (ms)', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Area type="monotone" dataKey="p99" stroke="#dc2626" fillOpacity={1} fill="url(#colorP99)" />
          <Area type="monotone" dataKey="p95" stroke="#ea580c" fillOpacity={1} fill="url(#colorP95)" />
          <Area type="monotone" dataKey="p50" stroke="#3b82f6" fillOpacity={1} fill="url(#colorP50)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}