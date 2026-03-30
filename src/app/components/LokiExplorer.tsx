import { useState } from 'react';
import { Search, AlertCircle, CheckCircle, Database, Info, Copy, ExternalLink } from 'lucide-react';

interface LokiExplorerProps {
  lokiUrl: string;
}

export function LokiExplorer({ lokiUrl }: LokiExplorerProps) {
  const [labels, setLabels] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [labelValues, setLabelValues] = useState<string[]>([]);
  const [sampleLogs, setSampleLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testUrl, setTestUrl] = useState(lokiUrl);

  // 测试连接
  const testConnection = async () => {
    setLoading(true);
    setError('');
    setDebugInfo(null);
    
    const testEndpoints = [
      '/loki/api/v1/labels',
      '/api/v1/labels',
      '/labels',
    ];

    const results: any = {
      baseUrl: testUrl,
      tests: [],
      recommendation: '',
    };

    for (const endpoint of testEndpoints) {
      const fullUrl = `${testUrl}${endpoint}`;
      try {
        const startTime = Date.now();
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        const duration = Date.now() - startTime;
        
        const contentType = response.headers.get('content-type');
        let data: any;
        let dataPreview = '';
        
        try {
          const text = await response.text();
          dataPreview = text.substring(0, 200);
          data = JSON.parse(text);
        } catch (e) {
          data = null;
        }

        results.tests.push({
          endpoint,
          url: fullUrl,
          status: response.status,
          statusText: response.statusText,
          contentType,
          duration: `${duration}ms`,
          success: response.ok && contentType?.includes('application/json'),
          dataPreview,
          hasData: !!data,
        });

        // 如果成功，保存标签
        if (response.ok && data?.data) {
          setLabels(data.data);
          results.recommendation = `✅ 使用此端点: ${fullUrl}`;
        }
      } catch (err) {
        results.tests.push({
          endpoint,
          url: fullUrl,
          error: err instanceof Error ? err.message : String(err),
          success: false,
        });
      }
    }

    setDebugInfo(results);
    setLoading(false);
  };

  // 获取所有标签
  const fetchLabels = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${lokiUrl}/loki/api/v1/labels`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setLabels(data.data || []);
    } catch (err) {
      setError(`获取标签失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取标签值
  const fetchLabelValues = async (label: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${lokiUrl}/loki/api/v1/label/${label}/values`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setLabelValues(data.data || []);
    } catch (err) {
      setError(`获取标签值失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取样本日志
  const fetchSampleLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const query = selectedLabel && labelValues.length > 0
        ? `{${selectedLabel}="${labelValues[0]}"}`
        : '{job=~".+"}';
      
      const params = new URLSearchParams({
        query,
        limit: '20',
      });

      const response = await fetch(`${lokiUrl}/loki/api/v1/query?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      const logs: any[] = [];
      if (data.data?.result) {
        data.data.result.forEach((stream: any) => {
          if (stream.values && stream.values.length > 0) {
            stream.values.slice(0, 5).forEach(([timestamp, line]: [string, string]) => {
              logs.push({
                timestamp,
                line,
                labels: stream.stream,
              });
            });
          }
        });
      }
      setSampleLogs(logs);
    } catch (err) {
      setError(`获取日志失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLabelSelect = (label: string) => {
    setSelectedLabel(label);
    fetchLabelValues(label);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-lg">Loki 数据探查器</h3>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="space-y-4">
        {/* 步骤 1: 测试连接 */}
        <div>
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-500">测试连接以确保 Loki URL 正确</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded w-full"
            />
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? '加载中...' : '测试连接'}
            </button>
          </div>

          {debugInfo && (
            <div className="mt-3 p-4 bg-gray-100 border border-gray-300 rounded">
              <div className="font-medium mb-2">测试结果:</div>
              <div className="space-y-2">
                {debugInfo.tests.map((test: any) => (
                  <div key={test.endpoint} className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 ${
                        test.success ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {test.success ? <CheckCircle /> : <AlertCircle />}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{test.endpoint}:</span> {test.statusText} ({test.duration})
                    </div>
                    {test.dataPreview && (
                      <div className="mt-1 text-xs text-gray-500">
                        数据预览: {test.dataPreview}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {debugInfo.recommendation && (
                <div className="mt-3 text-sm text-gray-500">
                  {debugInfo.recommendation}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 步骤 2: 获取标签 */}
        <div>
          <button
            onClick={fetchLabels}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? '加载中...' : '1. 查询所有标签'}
          </button>

          {labels.length > 0 && (
            <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">找到 {labels.length} 个标签</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <button
                    key={label}
                    onClick={() => handleLabelSelect(label)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedLabel === label
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 步骤 3: 显示标签值 */}
        {selectedLabel && labelValues.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="font-medium mb-2">标签 "{selectedLabel}" 的值:</div>
            <div className="flex flex-wrap gap-2">
              {labelValues.map((value) => (
                <span
                  key={value}
                  className="px-3 py-1 bg-white border border-blue-300 rounded text-sm"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 步骤 4: 获取样本日志 */}
        <div>
          <button
            onClick={fetchSampleLogs}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? '加载中...' : '2. 获取样本日志'}
          </button>

          {sampleLogs.length > 0 && (
            <div className="mt-3 p-4 bg-gray-900 text-gray-100 rounded-lg max-h-96 overflow-y-auto">
              <div className="mb-2 text-sm text-gray-400">共 {sampleLogs.length} 条样本日志:</div>
              {sampleLogs.map((log, index) => (
                <div key={index} className="mb-4 pb-4 border-b border-gray-700 last:border-0">
                  <div className="text-xs text-gray-500 mb-1">
                    时间: {new Date(parseInt(log.timestamp) / 1000000).toLocaleString('zh-CN')}
                  </div>
                  <div className="text-xs text-purple-400 mb-2">
                    标签: {JSON.stringify(log.labels)}
                  </div>
                  <div className="font-mono text-sm bg-gray-800 p-2 rounded overflow-x-auto">
                    {log.line}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 建议的查询 */}
        {sampleLogs.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <div className="font-medium mb-2 text-yellow-900">💡 根据你的数据，建议使用以下查询:</div>
            <div className="space-y-2">
              <div className="bg-white p-3 rounded border border-yellow-300">
                <div className="text-xs text-gray-600 mb-1">基础查询:</div>
                <code className="text-sm">
                  {selectedLabel && labelValues.length > 0
                    ? `{${selectedLabel}="${labelValues[0]}"}`
                    : '{job=~".+"}'}
                </code>
              </div>
              {labels.includes('level') && (
                <div className="bg-white p-3 rounded border border-yellow-300">
                  <div className="text-xs text-gray-600 mb-1">错误日志查询:</div>
                  <code className="text-sm">{'{level=~"error|critical"}'}</code>
                </div>
              )}
              <div className="bg-white p-3 rounded border border-yellow-300">
                <div className="text-xs text-gray-600 mb-1">所有日志:</div>
                <code className="text-sm">{'{job=~".+"}'}</code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}