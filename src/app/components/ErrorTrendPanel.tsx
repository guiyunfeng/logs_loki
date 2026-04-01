import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, AlertCircle } from 'lucide-react';

interface ErrorTrendPanelProps {
  readonly data: Array<{ time: string; critical: number; error: number; warning: number }>;
}

export function ErrorTrendPanel({ data }: ErrorTrendPanelProps) {
  // 空数据状态
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-lg">错误趋势分析（24小时）</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center text-gray-400">
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
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-green-500" />
        <h3 className="font-semibold text-lg">错误趋势分析（24小时）</h3>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis />
          <Tooltip 
            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="critical" 
            stroke="#dc2626" 
            strokeWidth={2}
            name="严重错误"
            dot={false}
            key="line-critical"
          />
          <Line 
            type="monotone" 
            dataKey="error" 
            stroke="#ea580c" 
            strokeWidth={2}
            name="错误"
            dot={false}
            key="line-error"
          />
          <Line 
            type="monotone" 
            dataKey="warning" 
            stroke="#f59e0b" 
            strokeWidth={2}
            name="警告"
            dot={false}
            key="line-warning"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}