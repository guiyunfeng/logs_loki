import { Bell, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface Alert {
  id: string;
  severity: 'critical' | 'error' | 'warning';
  message: string;
  timestamp: string;
  count: number;
  source: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'error' | 'warning'>('all');

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.severity === filter);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'error':
        return 'bg-orange-50 border-orange-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const alertCounts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    error: alerts.filter(a => a.severity === 'error').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-lg">告警中心</h3>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded ${filter === 'all' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}
          >
            全部 ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1 text-sm rounded ${filter === 'critical' ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}
          >
            严重 ({alertCounts.critical})
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`px-3 py-1 text-sm rounded ${filter === 'error' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100'}`}
          >
            错误 ({alertCounts.error})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-3 py-1 text-sm rounded ${filter === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'}`}
          >
            警告 ({alertCounts.warning})
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAlerts.map((alert) => (
          <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityBg(alert.severity)}`}>
            <div className="flex items-start gap-3">
              {getSeverityIcon(alert.severity)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold uppercase text-xs">
                    {alert.severity}
                  </span>
                  <span className="text-xs text-gray-500">{alert.timestamp}</span>
                </div>
                <p className="text-sm mb-2">{alert.message}</p>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>来源: {alert.source}</span>
                  <span>触发次数: {alert.count}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {filteredAlerts.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            暂无告警信息
          </div>
        )}
      </div>
    </div>
  );
}
