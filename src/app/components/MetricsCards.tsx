import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  const isPositive = change > 0;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          <div className="flex items-center gap-1 mt-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
            <span className={`text-sm ${isPositive ? 'text-red-500' : 'text-green-500'}`}>
              {Math.abs(change)}% vs 上一小时
            </span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface MetricsCardsProps {
  metrics: {
    totalErrors: number;
    errorRate: number;
    activeAlerts: number;
    avgResponseTime: number;
    errorChange: number;
    rateChange: number;
    alertChange: number;
    responseChange: number;
  };
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <MetricCard
        title="总错误数"
        value={metrics.totalErrors.toLocaleString()}
        change={metrics.errorChange}
        icon={<AlertCircle className="w-6 h-6 text-red-600" />}
        color="bg-red-100"
      />
      <MetricCard
        title="错误率"
        value={`${metrics.errorRate}%`}
        change={metrics.rateChange}
        icon={<Activity className="w-6 h-6 text-orange-600" />}
        color="bg-orange-100"
      />
      <MetricCard
        title="活跃告警"
        value={metrics.activeAlerts}
        change={metrics.alertChange}
        icon={<AlertCircle className="w-6 h-6 text-yellow-600" />}
        color="bg-yellow-100"
      />
      <MetricCard
        title="平均响应时间"
        value={`${metrics.avgResponseTime}ms`}
        change={metrics.responseChange}
        icon={<Activity className="w-6 h-6 text-blue-600" />}
        color="bg-blue-100"
      />
    </div>
  );
}
