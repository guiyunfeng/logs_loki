import { FileText, Search } from 'lucide-react';
import { useState } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'critical' | 'error' | 'warning' | 'info' | 'debug';
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

interface LogStreamProps {
  logs: LogEntry[];
  onSelectLog?: (log: LogEntry) => void;
}

export function LogStream({ logs, onSelectLog }: LogStreamProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'error':
        return 'text-orange-600 bg-orange-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'debug':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-lg">实时日志流</h3>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索日志..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">所有级别</option>
          <option value="critical">严重</option>
          <option value="error">错误</option>
          <option value="warning">警告</option>
          <option value="info">信息</option>
          <option value="debug">调试</option>
        </select>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
        {filteredLogs.map((log, index) => (
          <div key={index} className="mb-2 flex gap-3 hover:bg-gray-800 p-2 rounded cursor-pointer" onClick={() => onSelectLog?.(log)}>
            <span className="text-gray-400 text-xs flex-shrink-0">{log.timestamp}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase flex-shrink-0 ${getLevelColor(log.level)}`}>
              {log.level}
            </span>
            <span className="text-gray-400 text-xs flex-shrink-0">[{log.source}]</span>
            <span className="text-gray-200">{log.message}</span>
          </div>
        ))}
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            没有匹配的日志
          </div>
        )}
      </div>
    </div>
  );
}