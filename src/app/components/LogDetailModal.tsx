import { X, Copy, ExternalLink, Download } from 'lucide-react';
import { LogEntry } from '../services/logAnalyzer';

interface LogDetailModalProps {
  log: LogEntry | null;
  onClose: () => void;
}

export function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  if (!log) return null;

  const handleCopy = () => {
    try { navigator.clipboard.writeText(JSON.stringify(log, null, 2)); } catch {}
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'error': return 'bg-orange-100 text-orange-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'info': return 'bg-blue-100 text-blue-700';
      case 'debug': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">日志详情</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-gray-100 rounded"
              title="复制 JSON"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 基本信息 */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">时间戳</label>
                <div className="mt-1 font-mono text-sm">{log.timestamp}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">日志级别</label>
                <div className="mt-1">
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded ${getLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">来源</label>
                <div className="mt-1 text-sm">{log.source}</div>
              </div>
            </div>
          </div>

          {/* 日志消息 */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-600 mb-2 block">日志消息</label>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap break-words">
              {log.message}
            </div>
          </div>

          {/* 元数据 */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">元数据 (Metadata)</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="mt-6 flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
              <ExternalLink className="w-4 h-4" />
              在 Grafana 中查看
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
              <Download className="w-4 h-4" />
              导出日志
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}