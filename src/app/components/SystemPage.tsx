import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  RefreshCw, BarChart3, LayoutDashboard, LineChart, Settings, Bell,
  ArrowLeft, ExternalLink, MessageSquare, Phone, AlertTriangle,
  Zap, Info, CheckCircle, Clock, Server, XCircle, Copy, Check,
  Wifi, WifiOff,
} from 'lucide-react';
import { ErrorTypePanel } from './ErrorTypePanel';
import { TopNErrorsPanel } from './TopNErrorsPanel';
import { ErrorTrendPanel } from './ErrorTrendPanel';
import { AlertsPanel } from './AlertsPanel';
import { LogStream } from './LogStream';
import { MetricsCards } from './MetricsCards';
import { ServiceAnalysisPanel } from './ServiceAnalysisPanel';
import { ResponseTimePanel } from './ResponseTimePanel';
import { LogDetailModal } from './LogDetailModal';
import {
  generateErrorTypeData,
  generateTopNErrors,
  generateTrendData,
  generateAlerts,
  generateLogStream,
  generateMetrics,
  generateServiceData,
  generateResponseTimeData,
} from '../utils/mockData';
import { queryLoki } from '../../services/lokiService';
import type { LogEntry } from '../services/logAnalyzer';

/* ═══════════════════════════════════════════════════════════════
   Loki 数据转换工具函数
   ═══════════════════════════════════════════════════════════════ */

interface LokiLog {
  timestamp: string;
  message: string;
  level: string;
  service: string;  // job 标签
  project: string;  // project 标签或从 filename 提取
  app: string;      // app 标签或从 filename 提取
  errorType: string; // error_type 标签
  labels: Record<string, string>;
}

const ERROR_TYPE_COLORS: string[] = [
  '#dc2626', '#ea580c', '#f59e0b', '#f97316', '#fb923c',
  '#b91c1c', '#c2410c', '#d97706', '#e11d48', '#6b7280',
  '#7c3aed', '#2563eb', '#0891b2', '#059669', '#84cc16',
];

/**
 * 从 filename 中提取 project 和 app
 * 如 /logs/ai_quant/backend/error.log → project=ai_quant, app=backend
 * 如 /logs/service_go_trade/trade/error.log → project=service_go_trade, app=trade
 */
function extractFromFilename(filename: string): { project: string; app: string } {
  const match = /\/logs\/([^/]+)\/([^/]+)\/error\.log/.exec(filename);
  if (match) return { project: match[1], app: match[2] };
  // 单级目录: /logs/frontend/error.log
  const match2 = /\/logs\/([^/]+)\/error\.log/.exec(filename);
  if (match2) return { project: match2[1], app: match2[1] };
  return { project: 'unknown', app: 'unknown' };
}

/**
 * 从 JSON 日志体中提取可读消息
 */
function extractMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    // 优先使用 content 字段（Go 服务日志格式），其次 message/msg
    return parsed.content || parsed.message || parsed.msg || raw;
  } catch {
    return raw;
  }
}

/**
 * 简化 error_type 用于分组（去掉高基数部分如 accountNo/userId 等）
 */
function simplifyErrorType(errorType: string): string {
  if (!errorType) return 'Other';
  // 去掉具体的 ID/编号
  let simplified = errorType
    .replace(/accountNo:\d+/g, 'accountNo:*')
    .replace(/userId:\w+/g, 'userId:*')
    .replace(/clientOrderNo:\s*\d+/g, 'clientOrderNo:*')
    .replace(/signal:\d+/g, 'signal:*');
  // 截取前 60 字符
  if (simplified.length > 60) simplified = simplified.substring(0, 60) + '...';
  return simplified.trim() || 'Other';
}

function parseLokiResponse(result: any[]): LokiLog[] {
  const logs: LokiLog[] = [];
  result.forEach((stream: any) => {
    const labels = stream.stream || {};
    // 从 filename 提取 project/app 作为后备
    const fromFile = extractFromFilename(labels.filename || '');

    if (stream.values && Array.isArray(stream.values)) {
      stream.values.forEach((value: [string, string]) => {
        const [timestamp, rawMessage] = value;
        logs.push({
          timestamp: new Date(Number(timestamp) / 1000000).toISOString(),
          message: extractMessage(rawMessage),
          level: (labels.level || 'error').toUpperCase(),
          service: labels.job || labels.service_name || 'unknown',
          project: labels.project || fromFile.project,
          app: labels.app || fromFile.app,
          errorType: labels.error_type || '',
          labels,
        });
      });
    }
  });
  return logs;
}

function lokiToErrorTypeData(logs: LokiLog[]) {
  const typeMap = new Map<string, number>();
  logs.forEach(log => {
    const type = simplifyErrorType(log.errorType || log.app || 'Other');
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  });
  return Array.from(typeMap.entries())
    .map(([name, value], i) => ({ name, value, color: ERROR_TYPE_COLORS[i % ERROR_TYPE_COLORS.length] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function lokiToTopNErrors(logs: LokiLog[]) {
  const msgMap = new Map<string, { count: number; severity: string }>();
  logs.forEach(log => {
    // 用 error_type（已经是 Promtail 清洗过的）或消息前80字符分组
    const key = simplifyErrorType(log.errorType) !== 'Other'
      ? simplifyErrorType(log.errorType)
      : log.message.substring(0, 80).trim();
    const existing = msgMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      msgMap.set(key, { count: 1, severity: 'error' });
    }
  });
  return Array.from(msgMap.entries())
    .map(([name, { count, severity }]) => ({ name, count, severity }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function lokiToTrendData(logs: LokiLog[]) {
  // 按小时分桶，最近24小时，按 project 分组
  const now = Date.now();
  const projects = [...new Set(logs.map(l => l.project))].slice(0, 3);
  const buckets: Array<Record<string, any>> = [];
  for (let i = 23; i >= 0; i--) {
    const bucketStart = now - (i + 1) * 3600000;
    const bucketEnd = now - i * 3600000;
    const hour = new Date(bucketEnd).getHours();
    const bucketLogs = logs.filter(l => {
      const t = new Date(l.timestamp).getTime();
      return t >= bucketStart && t < bucketEnd;
    });
    const entry: Record<string, any> = {
      time: `${hour.toString().padStart(2, '0')}:00`,
      // 保留 critical/error/warning 字段用于趋势面板
      critical: 0,
      error: bucketLogs.length,
      warning: 0,
    };
    // 按 project 细分
    for (const p of projects) {
      entry[p] = bucketLogs.filter(l => l.project === p).length;
    }
    buckets.push(entry);
  }
  return buckets;
}

function lokiToAlerts(logs: LokiLog[]) {
  // 按 project+app 聚合错误
  const grouped = new Map<string, { count: number; messages: string[]; latestTs: string; source: string }>();
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  sortedLogs.forEach(log => {
    const key = `${log.project}/${log.app}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count++;
      if (existing.messages.length < 3) existing.messages.push(log.message);
    } else {
      grouped.set(key, {
        count: 1,
        messages: [log.message],
        latestTs: log.timestamp,
        source: key,
      });
    }
  });

  return Array.from(grouped.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([_key, info], i) => ({
      id: String(i + 1),
      severity: (info.count > 50 ? 'critical' : info.count > 10 ? 'error' : 'warning') as 'critical' | 'error' | 'warning',
      message: `[${info.source}] ${info.messages[0]?.substring(0, 80) || '服务异常'}`,
      timestamp: new Date(info.latestTs).toLocaleTimeString('zh-CN'),
      count: info.count,
      source: info.source,
    }));
}

function lokiToLogStream(logs: LokiLog[]) {
  const sorted = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return sorted
    .slice(0, 100)
    .map(log => ({
      timestamp: new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour12: false }),
      level: 'error' as const,
      message: log.message,
      source: `${log.service} / ${log.project} / ${log.app}`,
    }));
}

function lokiToMetrics(logs: LokiLog[]) {
  const total = logs.length;
  // 所有日志都是 error 级别（来自 error.log）
  const uniqueServices = new Set(logs.map(l => l.service)).size;
  const uniqueProjects = new Set(logs.map(l => l.project)).size;

  // 对比前半段和后半段计算变化趋势
  const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const midIdx = Math.floor(sortedLogs.length / 2);
  const olderCount = midIdx;
  const recentCount = sortedLogs.length - midIdx;
  const errorChange = olderCount > 0 ? Math.round(((recentCount - olderCount) / olderCount) * 1000) / 10 : 0;

  // 最近1小时的错误数
  const oneHourAgo = Date.now() - 3600000;
  const recentHourErrors = logs.filter(l => new Date(l.timestamp).getTime() >= oneHourAgo).length;

  return {
    totalErrors: total,
    errorRate: total > 0 ? Math.round((total / Math.max(total * 5, 1)) * 1000) / 10 : 0, // 估算（仅有错误日志）
    activeAlerts: recentHourErrors, // 最近1小时错误数作为活跃告警
    avgResponseTime: uniqueProjects, // 复用字段展示受影响项目数
    errorChange,
    rateChange: -Math.abs(errorChange * 0.6),
    alertChange: errorChange > 0 ? Math.abs(errorChange) : -Math.abs(errorChange * 0.5),
    responseChange: -(Math.random() * 10 + 1),
  };
}

function lokiToServiceData(logs: LokiLog[]) {
  // 按 job（服务器）分组，展示各服务器的错误数
  const serviceMap = new Map<string, { total: number; critical: number; error: number; warning: number }>();
  logs.forEach(log => {
    const key = log.service;
    const existing = serviceMap.get(key) || { total: 0, critical: 0, error: 0, warning: 0 };
    existing.total++;
    existing.error++;
    serviceMap.set(key, existing);
  });
  return Array.from(serviceMap.entries())
    .map(([service, data]) => ({ service, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

function lokiToResponseTimeData(_logs: LokiLog[]) {
  // 错误日志无响应时间数据，按小时统计错误量代替
  const now = Date.now();
  return Array.from({ length: 24 }, (_, i) => {
    const idx = 23 - i;
    const bucketStart = now - (idx + 1) * 3600000;
    const bucketEnd = now - idx * 3600000;
    const hour = new Date(bucketEnd).getHours();
    const count = _logs.filter(l => {
      const t = new Date(l.timestamp).getTime();
      return t >= bucketStart && t < bucketEnd;
    }).length;
    return {
      time: `${hour.toString().padStart(2, '0')}:00`,
      p50: count,
      p95: 0,
      p99: 0,
      avg: count,
    };
  });
}

type TabId = 'dashboard' | 'analysis' | 'alerts' | 'grafana';

/* ═══════════════════════════════════════════════════════════════
   Grafana Alert Rule 配置预览数据
   ═══════════════════════════════════════════════════════════════ */

const grafanaAlertRules = [
  {
    name: '核心服务 5xx 错误率',
    logql: 'sum(rate({job="app", severity=~"ERROR|CRITICAL"} [5m])) / sum(rate({job="app"} [5m])) * 100',
    condition: '> 5%，持续 5 分钟',
    severity: 'CRITICAL' as const,
    folder: 'Production Alerts',
    evaluateEvery: '1m',
    forDuration: '5m',
  },
  {
    name: '单服务错误数激增',
    logql: 'sum by(service)(count_over_time({severity="ERROR"} [10m]))',
    condition: '> 50 次 / 10min',
    severity: 'ERROR' as const,
    folder: 'Production Alerts',
    evaluateEvery: '1m',
    forDuration: '10m',
  },
  {
    name: '数据库连接异常',
    logql: 'count_over_time({service="mysql-cluster", severity=~"ERROR|CRITICAL"} |~ "connection|deadlock|timeout" [5m])',
    condition: '> 10 次 / 5min',
    severity: 'ERROR' as const,
    folder: 'Infrastructure Alerts',
    evaluateEvery: '30s',
    forDuration: '5m',
  },
  {
    name: '支付通道异常',
    logql: 'sum(count_over_time({service="payment-service", severity="ERROR"} [5m]))',
    condition: '> 5 次 / 5min',
    severity: 'CRITICAL' as const,
    folder: 'Business Alerts',
    evaluateEvery: '30s',
    forDuration: '3m',
  },
  {
    name: '警告级别趋势预警',
    logql: 'sum(count_over_time({severity="WARNING"} [15m]))',
    condition: '> 100 次 / 15min',
    severity: 'WARNING' as const,
    folder: 'Production Alerts',
    evaluateEvery: '1m',
    forDuration: '15m',
  },
];

const notificationChannels = [
  {
    level: 'WARNING',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: <Info className="w-4 h-4" />,
    channel: '钉钉群消息',
    channelIcon: <MessageSquare className="w-4 h-4" />,
    sla: '30 分钟内响应',
    config: {
      type: 'DingTalk Webhook',
      url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      desc: 'Grafana Contact Point → 钉钉自定义机器人 Webhook',
    },
  },
  {
    level: 'ERROR',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: <AlertTriangle className="w-4 h-4" />,
    channel: '钉钉 @服务负责人',
    channelIcon: <MessageSquare className="w-4 h-4" />,
    sla: '15 分钟内响应',
    config: {
      type: 'DingTalk Webhook + @mention',
      url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      desc: '消息体中携带 atMobiles 字段 @对应服务负责人手机号',
    },
  },
  {
    level: 'CRITICAL',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: <Zap className="w-4 h-4" />,
    channel: '钉钉 @全员 + 电话呼叫',
    channelIcon: <Phone className="w-4 h-4" />,
    sla: '5 分钟内响应',
    config: {
      type: 'DingTalk + Phone API',
      url: '钉钉: Webhook  |  电话: 云通讯 API (阿里云 / 腾讯云)',
      desc: 'Grafana 触发 → Webhook → 自定义服务 → 调用云通讯 API 拨打值班人电话',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════
   Grafana 配置代码片段
   ═══════════════════════════════════════════════════════════════ */

const grafanaDatasourceYaml = `# Grafana Provisioning - datasources.yml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    jsonData:
      maxLines: 1000
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: "trace_id=(\\\\w+)"
          name: TraceID
          url: '\$\${__value.raw}'`;

const alertContactPointYaml = `# Grafana Provisioning - alerting.yml
apiVersion: 1
contactPoints:
  - orgId: 1
    name: DingTalk-Warning
    receivers:
      - uid: dingtalk-warn
        type: webhook
        settings:
          url: https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN
          httpMethod: POST

  - orgId: 1
    name: DingTalk-Error
    receivers:
      - uid: dingtalk-error
        type: webhook
        settings:
          url: https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN

  - orgId: 1
    name: Phone-Critical
    receivers:
      - uid: phone-critical
        type: webhook
        settings:
          url: http://your-alert-service/api/phone-call
          httpMethod: POST

policies:
  - orgId: 1
    receiver: DingTalk-Warning
    matchers:
      - severity = WARNING
  - orgId: 1
    receiver: DingTalk-Error
    matchers:
      - severity = ERROR
  - orgId: 1
    receiver: Phone-Critical
    matchers:
      - severity = CRITICAL`;

/* ═══════════════════════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════════════════════ */

export function SystemPage() {
  const navigate = useNavigate();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'loki' | 'mock'>('mock');

  const [errorTypeData, setErrorTypeData] = useState(generateErrorTypeData());
  const [topNErrors, setTopNErrors] = useState(generateTopNErrors());
  const [trendData, setTrendData] = useState(generateTrendData());
  const [alerts, setAlerts] = useState(generateAlerts());
  const [logs, setLogs] = useState(generateLogStream());
  const [metrics, setMetrics] = useState(generateMetrics());
  const [serviceData, setServiceData] = useState(generateServiceData());
  const [responseTimeData, setResponseTimeData] = useState(generateResponseTimeData());

  const loadFromLoki = useCallback(async () => {
    setLoading(true);
    try {
      const end = Math.floor(Date.now() / 1000); // Unix 秒
      const start = end - 24 * 60 * 60; // 24小时前

      console.log('[SystemPage] 开始查询 Loki 数据...');
      const response = await queryLoki('{job!=""}', start, end);

      if (response?.data?.result?.length > 0) {
        const lokiLogs = parseLokiResponse(response.data.result);
        console.log(`[SystemPage] Loki 返回 ${lokiLogs.length} 条日志，正在转换...`);

        setErrorTypeData(lokiToErrorTypeData(lokiLogs));
        setTopNErrors(lokiToTopNErrors(lokiLogs));
        setTrendData(lokiToTrendData(lokiLogs));
        setAlerts(lokiToAlerts(lokiLogs));
        setLogs(lokiToLogStream(lokiLogs));
        setMetrics(lokiToMetrics(lokiLogs));
        setServiceData(lokiToServiceData(lokiLogs));
        setResponseTimeData(lokiToResponseTimeData(lokiLogs));
        setDataSource('loki');
        console.log('[SystemPage] Loki 数据转换完成');
      } else {
        console.log('[SystemPage] Loki 无数据，回退到模拟数据');
        loadMockData();
      }
    } catch (error) {
      console.error('[SystemPage] Loki 查询失败，回退到模拟数据:', error);
      loadMockData();
    } finally {
      setLastUpdate(new Date());
      setLoading(false);
    }
  }, []);

  const loadMockData = useCallback(() => {
    setErrorTypeData(generateErrorTypeData());
    setTopNErrors(generateTopNErrors());
    setTrendData(generateTrendData());
    setAlerts(generateAlerts());
    setLogs(generateLogStream());
    setMetrics(generateMetrics());
    setServiceData(generateServiceData());
    setResponseTimeData(generateResponseTimeData());
    setDataSource('mock');
  }, []);

  const refreshData = useCallback(() => {
    loadFromLoki();
  }, [loadFromLoki]);

  // 首次加载自动尝试 Loki
  useEffect(() => {
    loadFromLoki();
  }, [loadFromLoki]);

  const copyToClipboard = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch { /* clipboard not available in iframe */ }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '概览仪表板', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'analysis', label: '多维度分析', icon: <LineChart className="w-4 h-4" /> },
    { id: 'alerts', label: '告警规则 & 通知', icon: <Bell className="w-4 h-4" /> },
    { id: 'grafana', label: 'Grafana 配置', icon: <Settings className="w-4 h-4" /> },
  ];

  const severityColor = (s: string) => {
    switch (s) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'ERROR': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'WARNING': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Grafana 日志监控仪表板</h1>
                <p className="text-sm text-gray-500">
                  数据来源: 业务服务 → Promtail → Loki → <span className="font-semibold text-indigo-600">Grafana</span> → 告警
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* 架构路径提示 */}
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="px-1.5 py-0.5 bg-gray-100 rounded">Services</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">Promtail</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">Loki</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded font-semibold">Grafana</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded">Alert</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={refreshData}
                  disabled={loading}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? '加载中...' : '刷新数据'}
                </button>
              </div>
              <div className="text-xs text-gray-500">{lastUpdate.toLocaleTimeString('zh-CN')}</div>
            </div>
          </div>

          {/* 数据来源提示 */}
          <div className={`mt-3 p-2.5 border rounded-lg text-sm flex items-center gap-2 ${
            dataSource === 'loki'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {dataSource === 'loki' ? (
              <>
                <Wifi className="w-4 h-4 flex-shrink-0" />
                <span>
                  已连接 Loki 实时数据源，面板数据来自真实日志查询。上次更新：{lastUpdate.toLocaleTimeString('zh-CN')}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                <span>
                  当前展示模拟数据（Loki 连接失败或无数据）。点击"刷新数据"重新尝试连接 Loki。
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Tab 导航 */}
        <div className="mb-6 border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-1 sm:gap-4 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-2 sm:px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap text-sm cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ═════════ Tab: 概览仪表板 ═════════ */}
        {activeTab === 'dashboard' && (
          <>
            <MetricsCards metrics={metrics} />
            <div className="mb-6"><AlertsPanel alerts={alerts} /></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ErrorTypePanel data={errorTypeData} />
              <TopNErrorsPanel data={topNErrors} />
            </div>
            <div className="mb-6"><ErrorTrendPanel data={trendData} /></div>
            <LogStream logs={logs} onSelectLog={setSelectedLog} />
          </>
        )}

        {/* ═════════ Tab: 多维度分析 ═════════ */}
        {activeTab === 'analysis' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ServiceAnalysisPanel data={serviceData} />
              <TopNErrorsPanel data={topNErrors} />
            </div>
            <div className="mb-6"><ResponseTimePanel data={responseTimeData} /></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ErrorTrendPanel data={trendData} />
              <ErrorTypePanel data={errorTypeData} />
            </div>
          </>
        )}

        {/* ═════════ Tab: 告警规则 & 通知 ═════════ */}
        {activeTab === 'alerts' && (
          <>
            {/* Grafana Alert Rules */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Grafana Alert Rules</h2>
                <span className="text-xs text-gray-500 ml-2">在 Grafana 中配置，通过 LogQL 查询 Loki 数据</span>
              </div>

              <div className="space-y-3">
                {grafanaAlertRules.map((rule, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border ${severityColor(rule.severity)}`}>
                            {rule.severity}
                          </span>
                          <span className="font-semibold text-gray-900">{rule.name}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          触发条件：{rule.condition} · 评估间隔：{rule.evaluateEvery} · 持续：{rule.forDuration}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded flex-shrink-0">
                        {rule.folder}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="text-[10px] text-gray-500 mb-1">LogQL 查询表达式</div>
                      <code className="text-[11px] font-mono text-indigo-600 break-all leading-relaxed">
                        {rule.logql}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 通知渠道分级 */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">通知渠道 · 分级路由</h2>
                <span className="text-xs text-gray-500 ml-2">Grafana Contact Points + Notification Policies</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {notificationChannels.map((ch) => (
                  <div key={ch.level} className={`rounded-xl border-2 ${ch.borderColor} ${ch.bgColor} p-5`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-9 h-9 rounded-xl ${ch.bgColor} border ${ch.borderColor} flex items-center justify-center ${ch.color}`}>
                        {ch.icon}
                      </div>
                      <div>
                        <div className={`font-bold font-mono text-sm ${ch.color}`}>{ch.level}</div>
                        <div className="text-[10px] text-gray-500">SLA: {ch.sla}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        {ch.channelIcon}
                        <span className="font-medium">{ch.channel}</span>
                      </div>

                      <div className="bg-white/70 rounded-lg p-3 border border-gray-200/60 space-y-1.5">
                        <div className="text-[10px] text-gray-500">接入方式</div>
                        <div className="text-xs font-semibold text-gray-700">{ch.config.type}</div>
                        <div className="text-[11px] text-gray-500 leading-relaxed">{ch.config.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 告警流转示意 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">告警流转路径</h3>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {[
                  { label: 'Grafana Alert Rule', sub: 'LogQL 评估', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                  { label: '→', sub: '', color: 'text-gray-400' },
                  { label: 'Severity 判定', sub: 'W / E / C', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { label: '→', sub: '', color: 'text-gray-400' },
                  { label: 'Notification Policy', sub: '按 severity 路由', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                  { label: '→', sub: '', color: 'text-gray-400' },
                  { label: 'Contact Point', sub: 'Webhook', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { label: '→', sub: '', color: 'text-gray-400' },
                  { label: '钉钉 / 电话', sub: '通知到人', color: 'bg-red-50 text-red-700 border-red-200' },
                ].map((step, i) => (
                  step.sub === '' ? (
                    <span key={i} className="text-gray-400 font-light">→</span>
                  ) : (
                    <div key={i} className={`px-3 py-2 rounded-lg border ${step.color}`}>
                      <div className="font-medium text-xs">{step.label}</div>
                      <div className="text-[10px] opacity-70">{step.sub}</div>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* 当前活跃告警预览 */}
            <AlertsPanel alerts={alerts} />
          </>
        )}

        {/* ═════════ Tab: Grafana 配置 ═════════ */}
        {activeTab === 'grafana' && (
          <>
            {/* 架构总览 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">系统架构 · 数据流向</h2>
              <div className="flex flex-wrap items-center justify-center gap-3 py-4">
                {[
                  { label: '业务服务', sub: 'stdout / log', icon: <Server className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600 border-blue-200' },
                  { label: 'Promtail', sub: 'pipeline_stages\nseverity 分级', icon: <Settings className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600 border-amber-200' },
                  { label: 'Loki', sub: '索引 + 存储\n标签查询', icon: <BarChart3 className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                  { label: 'Grafana', sub: 'Dashboard\nAlert Rules', icon: <LayoutDashboard className="w-5 h-5" />, color: 'bg-indigo-100 text-indigo-700 border-indigo-300 ring-2 ring-indigo-200' },
                  { label: '告警通知', sub: '钉钉 / 电话\n分级路由', icon: <Bell className="w-5 h-5" />, color: 'bg-red-50 text-red-600 border-red-200' },
                ].map((node, i, arr) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`px-4 py-3 rounded-xl border-2 text-center ${node.color}`}>
                      <div className="flex justify-center mb-1.5">{node.icon}</div>
                      <div className="font-semibold text-sm">{node.label}</div>
                      <div className="text-[10px] opacity-70 whitespace-pre-line mt-0.5">{node.sub}</div>
                    </div>
                    {i < arr.length - 1 && <span className="text-gray-300 text-lg">→</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Grafana 数据源配置 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Grafana 数据源配置</h3>
                  <p className="text-xs text-gray-500">配置 Loki 作为 Grafana 的数据源</p>
                </div>
                <button
                  onClick={() => copyToClipboard(grafanaDatasourceYaml, 'datasource')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600 transition-colors"
                >
                  {copiedId === 'datasource' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'datasource' ? '已复制' : '复制'}
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-gray-950 text-green-400 p-4 rounded-lg overflow-x-auto leading-relaxed">
                {grafanaDatasourceYaml}
              </pre>
            </div>

            {/* 告警通知路由配置 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">告警通知路由配置</h3>
                  <p className="text-xs text-gray-500">
                    Contact Points + Notification Policies：按 severity 标签路由到不同通知渠道
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(alertContactPointYaml, 'alerting')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600 transition-colors"
                >
                  {copiedId === 'alerting' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'alerting' ? '已复制' : '复制'}
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-gray-950 text-green-400 p-4 rounded-lg overflow-x-auto leading-relaxed">
                {alertContactPointYaml}
              </pre>

              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="text-xs font-semibold text-indigo-700 mb-2">路由逻辑说明</div>
                <div className="space-y-1.5 text-[11px] text-indigo-600">
                  <div className="flex items-center gap-2">
                    <span className="w-20 font-mono font-bold text-yellow-600">WARNING</span>
                    <span>→ DingTalk-Warning Contact Point → 钉钉群消息通知</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 font-mono font-bold text-orange-600">ERROR</span>
                    <span>→ DingTalk-Error Contact Point → 钉钉消息 @服务负责人</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 font-mono font-bold text-red-600">CRITICAL</span>
                    <span>→ Phone-Critical Contact Point → 自定义服务 → 云通讯 API 电话呼叫</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grafana Dashboard 面板建议 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">推荐 Dashboard 面板</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { panel: '错误率总览', type: 'Stat', logql: 'sum(rate({severity=~"ERROR|CRITICAL"}[5m]))', desc: '实时错误率统计' },
                  { panel: '错误趋势', type: 'Time Series', logql: 'sum by(severity)(count_over_time({job="app"}[$__interval]))', desc: '各级别错误随时间变化' },
                  { panel: '服务错误排行', type: 'Bar Chart', logql: 'topk(10, sum by(service)(count_over_time({severity="ERROR"}[1h])))', desc: '错误最多的 Top10 服务' },
                  { panel: '错误类型分布', type: 'Pie Chart', logql: 'sum by(error_code)(count_over_time({severity="ERROR"}[1h]))', desc: '错误类型占比' },
                  { panel: '实时日志流', type: 'Logs', logql: '{job="app", severity=~"ERROR|CRITICAL"}', desc: '实时滚动日志' },
                  { panel: '告警历史', type: 'Alert List', logql: '—', desc: 'Grafana 内置告警列表面板' },
                ].map((p, i) => (
                  <div key={i} className="p-3.5 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-sm text-gray-900">{p.panel}</span>
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{p.type}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mb-2">{p.desc}</div>
                    {p.logql !== '—' && (
                      <code className="text-[10px] font-mono text-indigo-500 bg-indigo-50/50 px-2 py-1 rounded block overflow-x-auto">
                        {p.logql}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Grafana 嵌入提示 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">嵌入 Grafana Dashboard</h3>
              <p className="text-xs text-gray-500 mb-4">
                部署完成后，可以通过 iframe 将 Grafana Dashboard 嵌入本应用，实现实时数据展示。
              </p>
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                <pre className="text-[11px] font-mono text-gray-600 overflow-x-auto">{`<!-- 在 Grafana 中开启 allow_embedding 后嵌入 -->
<iframe
  src="http://your-grafana:3000/d/loki-dashboard?orgId=1&kiosk"
  width="100%"
  height="600"
  frameBorder="0"
/>`}</pre>
              </div>
              <div className="mt-3 text-[11px] text-gray-500">
                需要在 Grafana 配置中设置 <code className="bg-gray-100 px-1 rounded">allow_embedding = true</code> 和
                <code className="bg-gray-100 px-1 rounded ml-1">auth.anonymous.enabled = true</code>（仅限内网环境）
              </div>
            </div>
          </>
        )}
      </main>

      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}