import { useState, useCallback } from 'react';
import {
  Search, Play, Clock, Trash2, ChevronDown, ChevronUp,
  Copy, Check, AlertCircle, Loader2, Download, Filter,
} from 'lucide-react';
import { queryLoki, fetchLokiLabels, fetchLokiLabelValues } from '../../services/lokiService';

interface LogResult {
  timestamp: string;
  message: string;
  labels: Record<string, string>;
}

interface QueryHistoryItem {
  query: string;
  time: string;
  resultCount: number;
}

const EXAMPLE_QUERIES = [
  { label: '所有日志', query: '{job!=""}' },
  { label: '错误日志', query: '{job!=""} |= "error"' },
  { label: '按服务筛选', query: '{job="your-service"}' },
  { label: '正则匹配', query: '{job!=""} |~ "timeout|connection refused"' },
  { label: 'JSON 解析', query: '{job!=""} | json | level="error"' },
  { label: '错误计数 (按服务)', query: 'sum by (job) (count_over_time({job!=""} [1h]))' },
  { label: '错误率', query: 'sum(rate({job!=""} [5m]))' },
  { label: 'Top 10 错误服务', query: 'topk(10, sum by (job) (count_over_time({job!=""} [1h])))' },
];

const TIME_PRESETS = [
  { label: '最近 15 分钟', minutes: 15 },
  { label: '最近 1 小时', minutes: 60 },
  { label: '最近 3 小时', minutes: 180 },
  { label: '最近 6 小时', minutes: 360 },
  { label: '最近 12 小时', minutes: 720 },
  { label: '最近 24 小时', minutes: 1440 },
  { label: '最近 3 天', minutes: 4320 },
  { label: '最近 7 天', minutes: 10080 },
];

export function LogQLExplorer() {
  const [query, setQuery] = useState('{job!=""}');
  const [results, setResults] = useState<LogResult[]>([]);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState(60); // 默认 1 小时
  const [limit, setLimit] = useState(100);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');
  const [labels, setLabels] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [labelValues, setLabelValues] = useState<string[]>([]);
  const [showLabelBrowser, setShowLabelBrowser] = useState(false);
  const [filterText, setFilterText] = useState('');

  const executeQuery = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);
    setRawResponse(null);

    try {
      const end = Math.floor(Date.now() / 1000);
      const start = end - timeRange * 60;

      const response = await queryLoki(query.trim(), start, end);
      setRawResponse(response);

      const logs: LogResult[] = [];
      if (response.data?.result?.length > 0) {
        // 判断结果类型：streams 或 metric
        const resultType = response.data.resultType;

        if (resultType === 'matrix' || resultType === 'vector') {
          // metric 查询结果
          response.data.result.forEach((item: any) => {
            const metric = item.metric || {};
            const metricLabel = Object.entries(metric)
              .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
              .join(', ');

            if (item.values) {
              // matrix
              item.values.forEach((val: [number, string]) => {
                logs.push({
                  timestamp: new Date(val[0] * 1000).toISOString(),
                  message: `{${metricLabel}} => ${val[1]}`,
                  labels: metric,
                });
              });
            } else if (item.value) {
              // vector
              logs.push({
                timestamp: new Date(item.value[0] * 1000).toISOString(),
                message: `{${metricLabel}} => ${item.value[1]}`,
                labels: metric,
              });
            }
          });
        } else {
          // streams 日志结果
          response.data.result.forEach((stream: any) => {
            const streamLabels = stream.stream || {};
            stream.values?.forEach((value: [string, string]) => {
              logs.push({
                timestamp: new Date(Number(value[0]) / 1000000).toISOString(),
                message: value[1],
                labels: streamLabels,
              });
            });
          });
        }
      }

      // 按时间倒序
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setResults(logs.slice(0, limit));

      // 添加到历史
      setHistory(prev => {
        const newItem: QueryHistoryItem = {
          query: query.trim(),
          time: new Date().toLocaleTimeString('zh-CN'),
          resultCount: logs.length,
        };
        const filtered = prev.filter(h => h.query !== query.trim());
        return [newItem, ...filtered].slice(0, 20);
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '查询失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [query, timeRange, limit]);

  const loadLabels = useCallback(async () => {
    try {
      const response = await fetchLokiLabels();
      setLabels(response.data || []);
    } catch {
      setLabels([]);
    }
  }, []);

  const loadLabelValues = useCallback(async (label: string) => {
    setSelectedLabel(label);
    try {
      const response = await fetchLokiLabelValues(label);
      setLabelValues(response.data || []);
    } catch {
      setLabelValues([]);
    }
  }, []);

  const insertLabelFilter = (label: string, value: string) => {
    const filter = `${label}="${value}"`;
    if (query.includes('{')) {
      // 在已有选择器中添加
      const insertPos = query.lastIndexOf('}');
      const before = query.slice(0, insertPos);
      const after = query.slice(insertPos);
      const separator = before.endsWith('{') ? '' : ', ';
      setQuery(`${before}${separator}${filter}${after}`);
    } else {
      setQuery(`{${filter}}`);
    }
  };

  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportResults = () => {
    const data = results.map(r => ({
      timestamp: r.timestamp,
      message: r.message,
      ...r.labels,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logql-results-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredResults = filterText
    ? results.filter(r => r.message.toLowerCase().includes(filterText.toLowerCase()))
    : results;

  const getSeverityColor = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes('"level":"critical"') || lower.includes('"level":"fatal"'))
      return 'border-l-red-600';
    if (lower.includes('"level":"error"') || lower.includes('"level":"err"'))
      return 'border-l-orange-500';
    if (lower.includes('"level":"warn"'))
      return 'border-l-yellow-500';
    return 'border-l-gray-300';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      executeQuery();
    }
  };

  return (
    <div className="space-y-6">
      {/* 查询区域 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">LogQL 查询</h2>
          <span className="text-xs text-gray-500 ml-2">直接查询 Loki 日志，支持 LogQL 语法</span>
        </div>

        {/* 查询输入 */}
        <div className="mb-4">
          <div className="relative">
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="输入 LogQL 查询表达式，例如: {job!=&quot;&quot;} |= &quot;error&quot;"
              className="w-full font-mono text-sm bg-gray-950 text-green-400 p-4 pr-24 rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y placeholder:text-gray-600"
            />
            <button
              onClick={executeQuery}
              disabled={loading || !query.trim()}
              className="absolute right-3 top-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? '查询中...' : '执行'}
            </button>
          </div>
          <div className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-3">
            <span>Ctrl + Enter 执行查询</span>
            <span>·</span>
            <span>支持日志查询和 Metric 查询</span>
          </div>
        </div>

        {/* 参数栏 */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* 时间范围 */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <select
              value={timeRange}
              onChange={e => setTimeRange(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {TIME_PRESETS.map(p => (
                <option key={p.minutes} value={p.minutes}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* 结果限制 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">限制:</span>
            <select
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {[50, 100, 200, 500, 1000].map(n => (
                <option key={n} value={n}>{n} 条</option>
              ))}
            </select>
          </div>

          {/* 标签浏览器 */}
          <button
            onClick={() => {
              setShowLabelBrowser(!showLabelBrowser);
              if (!showLabelBrowser && labels.length === 0) loadLabels();
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            标签浏览器
            {showLabelBrowser ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* 示例查询 */}
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
          >
            💡 示例查询
            {showExamples ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* 历史记录 */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            历史 ({history.length})
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 标签浏览器面板 */}
        {showLabelBrowser && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">标签浏览器</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">可用标签</p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {labels.length > 0 ? labels.map(label => (
                    <button
                      key={label}
                      onClick={() => loadLabelValues(label)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        selectedLabel === label
                          ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                      }`}
                    >
                      {label}
                    </button>
                  )) : (
                    <span className="text-xs text-gray-400">加载中...</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  {selectedLabel ? `${selectedLabel} 的值` : '选择一个标签查看值'}
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {labelValues.map(value => (
                    <button
                      key={value}
                      onClick={() => insertLabelFilter(selectedLabel, value)}
                      className="px-2 py-1 text-xs rounded border bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                      title={`插入 ${selectedLabel}="${value}"`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 示例查询面板 */}
        {showExamples && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-700 mb-3">示例 LogQL 查询</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_QUERIES.map(ex => (
                <button
                  key={ex.label}
                  onClick={() => setQuery(ex.query)}
                  className="text-left p-2.5 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
                >
                  <div className="text-xs font-medium text-gray-700">{ex.label}</div>
                  <code className="text-[11px] font-mono text-indigo-600 break-all">{ex.query}</code>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 历史记录面板 */}
        {showHistory && history.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">查询历史</h4>
              <button
                onClick={() => setHistory([])}
                className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                清空
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {history.map((h, i) => (
                <button
                  key={`${h.time}-${i}`}
                  onClick={() => setQuery(h.query)}
                  className="w-full text-left p-2 bg-white rounded border border-gray-100 hover:border-indigo-300 transition-colors flex items-center gap-3"
                >
                  <code className="text-[11px] font-mono text-gray-700 flex-1 break-all">{h.query}</code>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {h.resultCount} 条 · {h.time}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">查询失败</p>
            <p className="text-xs text-red-600 mt-1 font-mono break-all">{error}</p>
          </div>
        </div>
      )}

      {/* 结果区域 */}
      {(results.length > 0 || rawResponse) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* 结果头 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">
                查询结果
                {' '}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filteredResults.length}{filterText ? ` / ${results.length}` : ''} 条)
                </span>
              </h3>
              {rawResponse?.data?.resultType && (
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">
                  {rawResponse.data.resultType}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* 结果内筛选 */}
              <div className="relative">
                <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  placeholder="筛选结果..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-40"
                />
              </div>

              {/* 视图切换 */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 text-xs ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  表格
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-3 py-1.5 text-xs ${viewMode === 'raw' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  原始
                </button>
              </div>

              {/* 导出 */}
              <button
                onClick={exportResults}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                导出
              </button>

              {/* 复制全部 */}
              <button
                onClick={() => copyText(JSON.stringify(rawResponse, null, 2), 'raw-all')}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
              >
                {copiedId === 'raw-all' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === 'raw-all' ? '已复制' : '复制'}
              </button>
            </div>
          </div>

          {/* 表格视图 */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500 w-44">时间</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500">内容</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500 w-24">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResults.map((log, i) => (
                    <tr key={`${log.timestamp}-${i}`} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-xs font-mono text-gray-500 align-top whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('zh-CN', {
                          month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                        })}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          className={`border-l-2 pl-3 ${getSeverityColor(log.message)} cursor-pointer text-left w-full`}
                          onClick={() => toggleRow(i)}
                        >
                          <pre className={`text-xs font-mono text-gray-700 whitespace-pre-wrap break-all ${
                            expandedRows.has(i) ? '' : 'line-clamp-2'
                          }`}>
                            {log.message}
                          </pre>
                          {expandedRows.has(i) && Object.keys(log.labels).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {Object.entries(log.labels).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="inline-flex text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                                >
                                  <span className="text-indigo-600 font-medium">{k}</span>=<span>{String(v)}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <button
                          onClick={() => copyText(log.message, `log-${i}`)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="复制日志内容"
                        >
                          {copiedId === `log-${i}` ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredResults.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {filterText ? '没有匹配的结果' : '没有查询到数据'}
                </div>
              )}
            </div>
          )}

          {/* 原始视图 */}
          {viewMode === 'raw' && (
            <pre className="text-[11px] font-mono bg-gray-950 text-green-400 p-4 rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto leading-relaxed">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* 空状态 */}
      {!loading && results.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">输入 LogQL 查询表达式并点击执行</p>
          <p className="text-xs text-gray-400">
            支持日志流查询 <code className="bg-gray-100 px-1 rounded">{'{ }'}</code> 和聚合查询 <code className="bg-gray-100 px-1 rounded">sum / rate / count_over_time</code>
          </p>
        </div>
      )}
    </div>
  );
}
