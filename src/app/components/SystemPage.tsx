import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  RefreshCw, BarChart3, LayoutDashboard, LineChart, Settings, Bell,
  ArrowLeft, ExternalLink, MessageSquare, Phone, AlertTriangle,
  Zap, Info, CheckCircle, Clock, Server, XCircle, Copy, Check,
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
import type { LogEntry } from '../services/logAnalyzer';

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

  const [errorTypeData, setErrorTypeData] = useState(generateErrorTypeData());
  const [topNErrors, setTopNErrors] = useState(generateTopNErrors());
  const [trendData, setTrendData] = useState(generateTrendData());
  const [alerts, setAlerts] = useState(generateAlerts());
  const [logs, setLogs] = useState(generateLogStream());
  const [metrics, setMetrics] = useState(generateMetrics());
  const [serviceData, setServiceData] = useState(generateServiceData());
  const [responseTimeData, setResponseTimeData] = useState(generateResponseTimeData());

  const refreshData = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setErrorTypeData(generateErrorTypeData());
      setTopNErrors(generateTopNErrors());
      setTrendData(generateTrendData());
      setAlerts(generateAlerts());
      setLogs(generateLogStream());
      setMetrics(generateMetrics());
      setServiceData(generateServiceData());
      setResponseTimeData(generateResponseTimeData());
      setLastUpdate(new Date());
      setLoading(false);
    }, 500);
  }, []);

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

          {/* 模拟数据提示 */}
          <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>
              当前展示模拟数据，用于预览 Grafana Dashboard 面板效果。实际部署后这些面板由 Grafana 通过 LogQL 查询 Loki 实时生成。
            </span>
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