import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface TopNErrorsPanelProps {
  data: Array<{ name: string; count: number; severity: string }>;
}

export function TopNErrorsPanel({ data }: TopNErrorsPanelProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#dc2626';
      case 'error':
        return '#ea580c';
      case 'warning':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  // 空数据状态
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-lg">Top 10 错误排名</h3>
        </div>
        <div className="h-[350px] flex items-center justify-center text-gray-400">
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
        <TrendingUp className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-lg">Top 10 错误排名</h3>
      </div>
      
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" key="grid" />
          <XAxis type="number" key="xaxis" />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={100}
            tick={{ fontSize: 12 }}
            key="yaxis"
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                    <p className="font-semibold">{payload[0].payload.name}</p>
                    <p className="text-sm">错误次数: {payload[0].value}</p>
                    <p className="text-sm">严重程度: 
                      <span className="ml-1 font-semibold" style={{ color: getSeverityColor(payload[0].payload.severity) }}>
                        {payload[0].payload.severity}
                      </span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} key="bar-count">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getSeverityColor(entry.severity)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}