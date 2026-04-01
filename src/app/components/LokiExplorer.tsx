import { useState, useEffect } from 'react';
import { queryLoki } from '../../services/lokiService';

interface LokiExplorerProps {
  lokiUrl: string;
}

export function LokiExplorer({ lokiUrl }: LokiExplorerProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const start = Date.now() - 3600 * 1000; // 过去一小时
        const end = Date.now();
        const data = await queryLoki('{job="example"}', start, end);
        setLogs(data.data.result || []);
      } catch (err) {
        setError('获取日志失败，请检查 Loki 配置');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [lokiUrl]);

  return (
    <div>
      <h1>Loki 日志</h1>
      {loading && <p>加载中...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <pre>{JSON.stringify(logs, null, 2)}</pre>
    </div>
  );
}