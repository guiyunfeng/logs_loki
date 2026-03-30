import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Server, AlertCircle } from 'lucide-react';

interface ServiceData {
  service: string;
  total: number;
  critical: number;
  error: number;
  warning: number;
}

interface ServiceAnalysisPanelProps {
  data: ServiceData[];
}

export function ServiceAnalysisPanel({ data }: ServiceAnalysisPanelProps) {
  // 空数据状态
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-cyan-500" />
          <h3 className="font-semibold text-lg">服务维度分析</h3>
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
        <Server className="w-5 h-5 text-cyan-500" />
        <h3 className="font-semibold text-lg">服务维度分析</h3>
      </div>
      
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="service" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip 
            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
          />
          <Legend />
          <Bar dataKey="critical" stackId="a" fill="#dc2626" name="严重" />
          <Bar dataKey="error" stackId="a" fill="#ea580c" name="错误" />
          <Bar dataKey="warning" stackId="a" fill="#f59e0b" name="警告" />
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.slice(0, 4).map((service, index) => (
          <div key={`service-${index}-${service.service}`} className="border border-gray-200 rounded p-3">
            <div className="text-xs text-gray-500 mb-1">{service.service}</div>
            <div className="text-xl font-bold">{service.total}</div>
            <div className="text-xs text-gray-600 mt-1">
              C:{service.critical} E:{service.error} W:{service.warning}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}