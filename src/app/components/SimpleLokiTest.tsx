import { useState } from 'react';
import { Play, AlertTriangle } from 'lucide-react';

interface SimpleLokiTestProps {
  lokiUrl: string;
}

export function SimpleLokiTest({ lokiUrl }: SimpleLokiTestProps) {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('{job=~".+"}');

  const runTest = async () => {
    setLoading(true);
    setResult('');
    
    try {
      // 测试 1: 直接查询
      const testUrl = `${lokiUrl}/loki/api/v1/query?query=${encodeURIComponent(query)}&limit=10`;
      
      setResult(`🔍 正在查询: ${testUrl}\n\n`);
      
      const response = await fetch(testUrl);
      const headers: any = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      setResult(prev => prev + `📡 状态码: ${response.status} ${response.statusText}\n`);
      setResult(prev => prev + `📋 Content-Type: ${response.headers.get('content-type')}\n\n`);
      
      const text = await response.text();
      
      setResult(prev => prev + `📦 响应内容 (前 1000 字符):\n${text.substring(0, 1000)}\n\n`);
      
      try {
        const data = JSON.parse(text);
        setResult(prev => prev + `✅ JSON 解析成功!\n`);
        setResult(prev => prev + `📊 数据结构:\n${JSON.stringify(data, null, 2).substring(0, 2000)}`);
      } catch (e) {
        setResult(prev => prev + `❌ JSON 解析失败，这是 HTML 或纯文本响应\n`);
        setResult(prev => prev + `⚠️ 可能的问题:\n`);
        setResult(prev => prev + `  1. CORS 跨域问题 - 需要在 Loki 配置中允许跨域\n`);
        setResult(prev => prev + `  2. URL 路径错误\n`);
        setResult(prev => prev + `  3. Loki 服务未正确运行\n`);
      }
    } catch (err) {
      setResult(prev => prev + `\n❌ 请求失败: ${err instanceof Error ? err.message : String(err)}\n\n`);
      
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setResult(prev => prev + `🚨 这很可能是 CORS 跨域问题!\n\n`);
        setResult(prev => prev + `解决方案:\n`);
        setResult(prev => prev + `1. 在 Loki 配置文件中添加:\n`);
        setResult(prev => prev + `   server:\n`);
        setResult(prev => prev + `     http_listen_port: 3100\n`);
        setResult(prev => prev + `     grpc_listen_port: 9096\n`);
        setResult(prev => prev + `     log_level: info\n\n`);
        setResult(prev => prev + `2. 使用反向代理 (Nginx/Caddy) 添加 CORS 头:\n`);
        setResult(prev => prev + `   Access-Control-Allow-Origin: *\n`);
        setResult(prev => prev + `   Access-Control-Allow-Methods: GET, POST, OPTIONS\n`);
        setResult(prev => prev + `   Access-Control-Allow-Headers: Content-Type\n\n`);
        setResult(prev => prev + `3. 或者在浏览器中禁用 CORS 检查 (仅用于开发测试)\n`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h3 className="font-semibold text-lg">直接查询测试</h3>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <strong>说明:</strong> 这个工具会直接发送请求到 Loki 并显示完整的响应，帮助诊断连接问题。
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Loki URL:</label>
          <div className="text-sm text-gray-600 font-mono bg-gray-100 p-2 rounded">
            {lokiUrl}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">查询语句:</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            placeholder='{job=~".+"}'
          />
        </div>

        <button
          onClick={runTest}
          disabled={loading}
          className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          {loading ? '执行中...' : '执行测试'}
        </button>

        {result && (
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
            {result}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
        <strong>💡 提示:</strong> 如果看到 CORS 错误，你可能需要：
        <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
          <li>配置 Loki 允许跨域请求</li>
          <li>使用 Nginx 或 Caddy 作为反向代理添加 CORS 头</li>
          <li>在开发环境中临时禁用浏览器 CORS 检查</li>
          <li>确保 Loki 服务正在运行且 URL 正确</li>
        </ul>
      </div>
    </div>
  );
}
