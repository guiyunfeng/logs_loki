import { useState } from 'react';
import { Search, Plus, X, Play, Copy, Code } from 'lucide-react';

interface QueryBuilderProps {
  onExecuteQuery: (query: string) => void;
}

interface QueryFilter {
  id: string;
  label: string;
  operator: string;
  value: string;
}

export function QueryBuilder({ onExecuteQuery }: QueryBuilderProps) {
  const [filters, setFilters] = useState<QueryFilter[]>([
    { id: '1', label: 'level', operator: '=~', value: 'error|critical' }
  ]);
  const [timeRange, setTimeRange] = useState('1h');
  const [logPipeline, setLogPipeline] = useState('| json');

  const addFilter = () => {
    setFilters([
      ...filters,
      { id: Date.now().toString(), label: '', operator: '=', value: '' }
    ]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, field: keyof QueryFilter, value: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const buildQuery = () => {
    const labelFilters = filters
      .filter(f => f.label && f.value)
      .map(f => `${f.label}${f.operator}"${f.value}"`)
      .join(', ');
    
    const query = `{${labelFilters || 'job=~".+"'}} ${logPipeline} [${timeRange}]`;
    return query;
  };

  const handleExecute = () => {
    onExecuteQuery(buildQuery());
  };

  const handleCopyQuery = () => {
    try { navigator.clipboard.writeText(buildQuery()); } catch {}
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Code className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold text-lg">LogQL 查询构建器</h3>
      </div>

      {/* 标签过滤器 */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">标签过滤器</label>
          <button
            onClick={addFilter}
            className="flex items-center gap-1 px-2 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded"
          >
            <Plus className="w-4 h-4" />
            添加过滤器
          </button>
        </div>

        {filters.map((filter) => (
          <div key={filter.id} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="标签名 (如: level)"
              value={filter.label}
              onChange={(e) => updateFilter(filter.id, 'label', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <select
              value={filter.operator}
              onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="=">=</option>
              <option value="!=">=</option>
              <option value="=~">=~ (正则)</option>
              <option value="!~">!~ (非正则)</option>
            </select>
            <input
              type="text"
              placeholder="值"
              value={filter.value}
              onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => removeFilter(filter.id)}
              className="p-2 text-red-500 hover:bg-red-50 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* 日志管道 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">日志管道</label>
        <input
          type="text"
          value={logPipeline}
          onChange={(e) => setLogPipeline(e.target.value)}
          placeholder="| json | label_format"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* 时间范围 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
        <div className="flex gap-2">
          {['5m', '15m', '30m', '1h', '3h', '6h', '12h', '24h'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded ${
                timeRange === range
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 生成的查询 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">生成的 LogQL 查询</label>
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-900 text-gray-100 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
            {buildQuery()}
          </div>
          <button
            onClick={handleCopyQuery}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            title="复制查询"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 执行按钮 */}
      <button
        onClick={handleExecute}
        className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 font-medium"
      >
        <Play className="w-4 h-4" />
        执行查询
      </button>

      {/* 常用查询模板 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">常用查询模板</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onExecuteQuery('{level="error"} | json')}
            className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-left"
          >
            所有错误日志
          </button>
          <button
            onClick={() => onExecuteQuery('sum by (job) (count_over_time({level="error"}[1h]))')}
            className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-left"
          >
            按服务统计错误
          </button>
          <button
            onClick={() => onExecuteQuery('rate({level=~"error|critical"}[5m])')}
            className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-left"
          >
            错误率趋势
          </button>
          <button
            onClick={() => onExecuteQuery('topk(10, sum by (message) (count_over_time({level="error"}[1h])))')}
            className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-left"
          >
            Top 10 错误
          </button>
        </div>
      </div>
    </div>
  );
}