import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, TrendingUp, AlertTriangle,
  Activity, Search, RefreshCw, Calendar,
  Layers, Server,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  generateMockLogs,
  getProjectServiceErrorBreakdown,
  getTopErrors,
} from '../config/mockLogData';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { queryLoki, queryLokiInstant } from '../../services/lokiService';
import { classifyErrorSeverity, getSeverityStats, SEVERITY_CONFIG, type ErrorSeverity } from '../utils/errorSeverityClassifier';

type TimeRange = '15m' | '30m' | '1h' | '6h' | '12h' | '24h' | '3d' | '7d';

const TIME_RANGE_MINUTES: Record<TimeRange, number> = {
  '15m': 15, '30m': 30, '1h': 60, '6h': 360, '12h': 720, '24h': 1440, '3d': 4320, '7d': 10080,
};

const SERVICE_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e',
  '#10b981', '#a855f7', '#64748b',
];

const SEVERITY_RULE_TEXT: Record<ErrorSeverity, string> = {
  CRITICAL: '命中致命关键词',
  HIGH: '同类错误 >= 100 次',
  MEDIUM: '同类错误 >= 20 次',
  LOW: '其余错误',
};

export function LogAnalyticsPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<ErrorSeverity[]>(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [realTotalLogs, setRealTotalLogs] = useState<number>(0);
  const [realServiceCounts, setRealServiceCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        // 尝试从 Loki 获取数据
        const end = Math.floor(Date.now() / 1000); // Unix 秒
        const start = end - TIME_RANGE_MINUTES[timeRange] * 60;
        
        console.log('开始查询 Loki，时间范围:', { start, end, timeRange });

        // 并行：1) 获取日志详情 2) 按服务统计真实数量
        const minutes = TIME_RANGE_MINUTES[timeRange];
        const duration = minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`;
        const [response, countResponse] = await Promise.allSettled([
          queryLoki('{job!=""}', start, end),
          queryLokiInstant(`sum by (job) (count_over_time({job!=""} [${duration}]))`),
        ]);

        // 处理按服务统计的真实数量
        let totalCount = 0;
        const serviceCounts: Record<string, number> = {};
        if (countResponse.status === 'fulfilled') {
          const results = countResponse.value?.data?.result || [];
          for (const item of results) {
            const job = item.metric?.job || 'unknown';
            const count = Number(item.value?.[1]) || 0;
            serviceCounts[job] = count;
            totalCount += count;
          }
        }
        setRealServiceCounts(serviceCounts);
        
        if (response.status === 'fulfilled' && response.value.data?.result?.length > 0) {
          console.log('Loki 查询响应:', response.value);
          const lokiLogs: any[] = [];
          response.value.data.result.forEach((stream: any) => {
            const labels = stream.stream || {};
            // 从 filename 提取 project/app
            const fileMatch = /\/logs\/([^/]+)\/([^/]+)\/error\.log/.exec(labels.filename || '');
            const fileMatch2 = /\/logs\/([^/]+)\/error\.log/.exec(labels.filename || '');
            const project = labels.project || (fileMatch ? fileMatch[1] : fileMatch2 ? fileMatch2[1] : 'unknown');
            const app = labels.app || (fileMatch ? fileMatch[2] : 'unknown');

            if (stream.values && Array.isArray(stream.values)) {
              stream.values.forEach((value: [string, string]) => {
                const [timestamp, rawMsg] = value;
                // 解析 JSON 日志体
                let message = rawMsg;
                try {
                  const parsed = JSON.parse(rawMsg);
                  message = parsed.content || parsed.message || parsed.msg || rawMsg;
                } catch { /* 非 JSON 直接使用 */ }

                lokiLogs.push({
                  timestamp: new Date(Number(timestamp) / 1000000).toISOString(),
                  severity: (labels.level || 'error').toUpperCase(),
                  message,
                  service: `${project}/${app}`,
                  project,
                  server: labels.job || labels.service_name || 'unknown',
                });
              });
            }
          });
          console.log('转换后的日志数量:', lokiLogs.length, '真实总数:', totalCount);
          setAllLogs(lokiLogs);
          setRealTotalLogs(totalCount > 0 ? totalCount : lokiLogs.length);
        } else {
          console.log('Loki 无数据，使用模拟数据');
          const mock = generateMockLogs(2000);
          setAllLogs(mock);
          setRealTotalLogs(mock.length);
        }
      } catch (error) {
        console.error('从 Loki 加载数据失败:', error);
        const mock = generateMockLogs(2000);
        setAllLogs(mock);
        setRealTotalLogs(mock.length);
      }
    };

    loadData();
  }, [timeRange]);

  const allServers = useMemo(() => [...new Set(allLogs.map(l => l.server))].sort(), [allLogs]);
  const allProjects = useMemo(() => [...new Set(allLogs.map(l => l.project))].sort(), [allLogs]);
  const allServices = useMemo(() => [...new Set(allLogs.map(l => l.service))].sort(), [allLogs]);

  const availableProjects = useMemo(() => {
    if (selectedServers.length === 0) return allProjects;
    return [...new Set(allLogs.filter(l => selectedServers.includes(l.server)).map(l => l.project))].sort();
  }, [allLogs, allProjects, selectedServers]);

  const availableServices = useMemo(() => {
    let filtered = allLogs;
    if (selectedServers.length > 0) filtered = filtered.filter(l => selectedServers.includes(l.server));
    if (selectedProjects.length > 0) filtered = filtered.filter(l => selectedProjects.includes(l.project));
    if (filtered.length === allLogs.length) return allServices;
    return [...new Set(filtered.map(l => l.service))].sort();
  }, [allLogs, allServices, selectedServers, selectedProjects]);
  
  // 对日志进行错误等级分类
  const classifiedLogs = useMemo(() => classifyErrorSeverity(allLogs), [allLogs]);

  const filteredLogs = useMemo(() => {
    return classifiedLogs.filter(log => {
      return selectedSeverity.includes(log.severity)
        && (selectedServers.length === 0 || selectedServers.includes(log.server))
        && (selectedProjects.length === 0 || selectedProjects.includes(log.project))
        && (selectedServices.length === 0 || selectedServices.includes(log.service))
        && (searchQuery === '' ||
          log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.service.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [classifiedLogs, selectedSeverity, selectedServers, selectedProjects, selectedServices, searchQuery]);
  
  // 计算统计数据（侧重项目/服务维度和错误分布特征）
  const realStats = useMemo(() => {
    const totalLogs = realTotalLogs > 0 ? realTotalLogs : filteredLogs.length;
    const projectCount = new Set(filteredLogs.map(l => l.project)).size;
    const serviceCount = Object.keys(realServiceCounts).length || new Set(filteredLogs.map(l => l.service)).size;

    // 高频错误集中度：最常见错误占比
    const msgCounts: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const msg = (l.message || 'unknown').substring(0, 120);
      msgCounts[msg] = (msgCounts[msg] || 0) + 1;
    });
    const topEntry = Object.entries(msgCounts).sort((a, b) => b[1] - a[1])[0];
    const topErrorCount = topEntry ? topEntry[1] : 0;
    const topErrorPct = filteredLogs.length > 0 ? Math.round(topErrorCount / filteredLogs.length * 100) : 0;

    return { totalLogs, projectCount, serviceCount, topErrorCount, topErrorPct };
  }, [filteredLogs, realTotalLogs, realServiceCounts]);

  // 等级统计
  const severityStats = useMemo(() => getSeverityStats(filteredLogs), [filteredLogs]);

  // 按服务器分组统计
  const serverStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach(l => { counts[l.server] = (counts[l.server] || 0) + 1; });
    return counts;
  }, [filteredLogs]);

  const projectServiceBreakdown = useMemo(() => getProjectServiceErrorBreakdown(filteredLogs), [filteredLogs]);
  const topErrors = useMemo(() => getTopErrors(filteredLogs, 10), [filteredLogs]);

  // 趋势图：按等级分组的时序数据
  const trendData = useMemo(() => {
    const nowMs = Date.now();
    const minutes = TIME_RANGE_MINUTES[timeRange];
    let bucketCount: number, bucketSizeMs: number;
    if (minutes <= 30) { bucketCount = minutes; bucketSizeMs = 60_000; }
    else if (minutes <= 60) { bucketCount = 12; bucketSizeMs = 5 * 60_000; }
    else if (minutes <= 720) { bucketCount = Math.ceil(minutes / 15); bucketSizeMs = 15 * 60_000; }
    else if (minutes <= 1440) { bucketCount = 24; bucketSizeMs = 60 * 60_000; }
    else if (minutes <= 4320) { bucketCount = Math.ceil(minutes / 240); bucketSizeMs = 4 * 60 * 60_000; }
    else { bucketCount = 14; bucketSizeMs = 12 * 60 * 60_000; }

    const buckets = Array.from({ length: bucketCount }, (_, idx) => {
      const offsetFromNow = (bucketCount - 1 - idx) * bucketSizeMs;
      const start = nowMs - offsetFromNow;
      const t = new Date(start);
      const hh = t.getHours().toString().padStart(2, '0');
      const mi = t.getMinutes().toString().padStart(2, '0');
      const mm = (t.getMonth() + 1).toString().padStart(2, '0');
      const dd = t.getDate().toString().padStart(2, '0');
      return {
        start, end: start + bucketSizeMs,
        time: minutes <= 1440 ? `${hh}:${mi}` : `${mm}/${dd} ${hh}:${mi}`,
        CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0,
      };
    });

    const rangeStart = buckets[0]?.start || 0;
    filteredLogs.forEach(log => {
      const logMs = new Date(log.timestamp).getTime();
      const idx = Math.floor((logMs - rangeStart) / bucketSizeMs);
      if (idx >= 0 && idx < buckets.length) {
        buckets[idx][log.severity as ErrorSeverity]++;
      }
    });
    return buckets;
  }, [filteredLogs, timeRange]);

  // 等级分布（饼图）
  const severityDistribution = useMemo(() => {
    return (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ErrorSeverity[]).map(s => ({
      name: `${SEVERITY_CONFIG[s].label}(${s})`,
      value: severityStats[s],
      color: SEVERITY_CONFIG[s].color,
    })).filter(d => d.value > 0);
  }, [severityStats]);

  // 按服务器错误分布
  const serverDistribution = useMemo(() => {
    return Object.entries(serverStats)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name, value,
        color: SERVICE_COLORS[i % SERVICE_COLORS.length],
      }));
  }, [serverStats]);

  const compactServerDistribution = useMemo(() => serverDistribution.slice(0, 6), [serverDistribution]);

  // 当前筛选条件描述
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedServers.length > 0) parts.push(`${selectedServers.length} 台服务器`);
    if (selectedProjects.length > 0) parts.push(`${selectedProjects.length} 个项目`);
    if (selectedServices.length > 0) parts.push(`${selectedServices.length} 个服务`);
    return parts.length > 0 ? `已筛选: ${parts.join(' · ')}` : '';
  }, [selectedServers, selectedProjects, selectedServices]);

  const dominantSeverity = useMemo(() => {
    const pairs = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ErrorSeverity[])
      .map(sev => [sev, severityStats[sev]] as const)
      .sort((a, b) => b[1] - a[1]);
    return pairs[0]?.[1] ? pairs[0][0] : null;
  }, [severityStats]);

  const alertHint = useMemo(() => {
    if (severityStats.CRITICAL > 0) {
      return {
        title: '建议触发 P1 告警',
        detail: `当前有 ${severityStats.CRITICAL} 条致命错误，建议立即通知值班并升级处理。`,
        color: 'text-red-300',
        border: 'border-red-500/30',
        bg: 'bg-red-500/10',
      };
    }
    if (severityStats.HIGH >= 50) {
      return {
        title: '建议触发 P2 告警',
        detail: `高等级错误达到 ${severityStats.HIGH} 条，建议 10 分钟内跟进。`,
        color: 'text-orange-300',
        border: 'border-orange-500/30',
        bg: 'bg-orange-500/10',
      };
    }
    return {
      title: '当前可维持观察',
      detail: '暂未出现集中爆发，可继续观察趋势与 Top 错误变化。',
      color: 'text-emerald-300',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
    };
  }, [severityStats]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/60">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">日志统计分析</h1>
                <p className="text-xs text-gray-500">实时监控 · 趋势分析 · 异常检测</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors border border-gray-700">
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">刷新</span>
              </button>
              <button
                onClick={() => navigate('/system')}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Grafana 面板
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 过滤栏 */}
      <div className="sticky top-[73px] z-10 bg-gray-900/90 backdrop-blur-lg border-b border-gray-800/60">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* 时间范围 */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer pr-7"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
              >
                <option value="15m">最近 15 分钟</option>
                <option value="30m">最近 30 分钟</option>
                <option value="1h">最近 1 小时</option>
                <option value="6h">最近 6 小时</option>
                <option value="12h">最近 12 小时</option>
                <option value="24h">最近 24 小时</option>
                <option value="3d">最近 3 天</option>
                <option value="7d">最近 7 天</option>
              </select>
            </div>
            
            <div className="h-5 w-px bg-gray-700" />
            
            {/* 多选筛选器：服务器 → 项目 → 服务 */}
            <MultiSelectDropdown
              label="服务器"
              options={allServers}
              selected={selectedServers}
              onChange={(v) => {
                setSelectedServers(v);
                setSelectedProjects([]);
                setSelectedServices([]);
              }}
            />
            <MultiSelectDropdown
              label="项目"
              options={availableProjects}
              selected={selectedProjects}
              onChange={(v) => {
                setSelectedProjects(v);
                setSelectedServices([]);
              }}
            />
            <MultiSelectDropdown
              label="服务"
              options={availableServices}
              selected={selectedServices}
              onChange={setSelectedServices}
            />

            <div className="h-5 w-px bg-gray-700" />

            {/* 错误等级筛选 */}
            <div className="flex gap-1">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ErrorSeverity[]).map(sev => {
                const cfg = SEVERITY_CONFIG[sev];
                const active = selectedSeverity.includes(sev);
                return (
                  <button
                    key={sev}
                    onClick={() => {
                      if (active) {
                        setSelectedSeverity(selectedSeverity.filter(s => s !== sev));
                      } else {
                        setSelectedSeverity([...selectedSeverity, sev]);
                      }
                    }}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all border ${
                      active ? `${cfg.bg} ${cfg.border}` : 'bg-gray-800 border-gray-700 text-gray-500'
                    }`}
                    style={active ? { color: cfg.color } : undefined}
                  >
                    {cfg.label}
                    <span className="ml-1 opacity-70">{severityStats[sev]}</span>
                  </button>
                );
              })}
            </div>
            
            {/* 搜索框 */}
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="搜索日志..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-gray-300 placeholder-gray-500 w-32 sm:w-48"
              />
            </div>
          </div>
          {filterSummary && (
            <div className="mt-2 text-xs text-indigo-400">
              {filterSummary} · {filteredLogs.length} 条日志
            </div>
          )}
        </div>
      </div>

      {/* 主内容 */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-gray-900/50 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">日志总量</div>
              <Activity className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold text-gray-200">{realStats.totalLogs.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">最近 {timeRange}</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-cyan-400">涉及项目</div>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-400">{realStats.projectCount}</div>
            <div className="text-xs text-gray-500 mt-1">有错误的项目数</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-violet-400">涉及服务</div>
              <Server className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-2xl font-bold text-violet-400">{realStats.serviceCount}</div>
            <div className="text-xs text-gray-500 mt-1">有错误的服务数</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-amber-400">高频错误占比</div>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{realStats.topErrorPct}%</div>
            <div className="text-xs text-gray-500 mt-1">最常见错误 {realStats.topErrorCount} 次</div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 p-4 rounded-xl border border-gray-700 bg-gradient-to-r from-gray-900/70 via-gray-900/40 to-gray-900/70">
            <div className="text-sm font-semibold text-gray-200 mb-3">自动分级策略说明</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ErrorSeverity[]).map(sev => (
                <div key={sev} className={`rounded-lg border p-3 ${SEVERITY_CONFIG[sev].border} ${SEVERITY_CONFIG[sev].bg}`}>
                  <div className="font-semibold" style={{ color: SEVERITY_CONFIG[sev].color }}>
                    {SEVERITY_CONFIG[sev].label} ({sev})
                  </div>
                  <div className="text-gray-400 mt-1">
                    {SEVERITY_RULE_TEXT[sev]}
                  </div>
                  <div className="mt-2 text-gray-200 font-medium">当前 {severityStats[sev]} 条</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${alertHint.border} ${alertHint.bg}`}>
            <div className="text-sm font-semibold mb-2 text-gray-200">告警建议</div>
            <div className={`text-base font-bold ${alertHint.color}`}>{alertHint.title}</div>
            <div className="text-xs text-gray-300 mt-2 leading-5">{alertHint.detail}</div>
            <div className="mt-3 text-xs text-gray-400">
              主导等级：{dominantSeverity ? `${SEVERITY_CONFIG[dominantSeverity].label} (${dominantSeverity})` : '暂无'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 时序趋势图 */}
            <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">错误趋势（最近 {timeRange}）</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <defs>
                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ErrorSeverity[]).map(sev => (
                      <linearGradient key={sev} id={`grad-${sev}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SEVERITY_CONFIG[sev].color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={SEVERITY_CONFIG[sev].color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ErrorSeverity[]).map(sev => (
                    <Area
                      key={sev}
                      type="monotone"
                      dataKey={sev}
                      name={SEVERITY_CONFIG[sev].label}
                      stroke={SEVERITY_CONFIG[sev].color}
                      strokeWidth={2}
                      fill={`url(#grad-${sev})`}
                      stackId="1"
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 项目×服务 错误分布 */}
            <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200 mb-1">项目错误分布（按服务拆分）</h3>
              <p className="text-xs text-gray-500 mb-4">X 轴为项目目录，各颜色代表不同子服务</p>
              {projectServiceBreakdown.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={projectServiceBreakdown.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="project"
                      stroke="#6b7280"
                      style={{ fontSize: '11px' }}
                      angle={-15}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {projectServiceBreakdown.services.map((svc, i) => (
                      <Bar
                        key={svc}
                        dataKey={svc}
                        stackId="a"
                        fill={SERVICE_COLORS[i % SERVICE_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-sm text-gray-500">
                  当前筛选条件下无错误数据
                </div>
              )}
            </div>
          </div>

          {/* 右侧：紧凑双卡 + Top 错误 */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 错误等级分布饼图 */}
              <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-200 mb-3">错误等级分布</h3>
                {severityDistribution.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={severityDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={34}
                          outerRadius={58}
                          dataKey="value"
                        >
                          {severityDistribution.map(entry => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number) => [`${value} 条`, '错误数']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1.5">
                      {severityDistribution.map(item => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-400 truncate">{item.name}</span>
                          </div>
                          <span className="font-medium text-gray-300">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-sm text-gray-500">无数据</div>
                )}
              </div>

              {/* 按服务器错误分布饼图 */}
              <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-200 mb-3">按服务器分布</h3>
                {compactServerDistribution.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={compactServerDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={34}
                          outerRadius={58}
                          dataKey="value"
                        >
                          {compactServerDistribution.map(entry => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number) => [`${value} 条`, '错误数']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1.5">
                      {compactServerDistribution.map(item => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-400 truncate">{item.name}</span>
                          </div>
                          <span className="font-medium text-gray-300">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-sm text-gray-500">无数据</div>
                )}
              </div>
            </div>

            {/* Top N 错误 */}
            <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">Top 10 错误</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {topErrors.map((error, index) => (
                  <div
                    key={`${error.message}-${index}`}
                    className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-300 break-words">{error.message}</div>
                        {error.category && (
                          <div className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                            {error.category}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className="font-medium"
                        style={{ color: SEVERITY_CONFIG[error.severity as ErrorSeverity]?.color || '#f97316' }}
                      >
                        {SEVERITY_CONFIG[error.severity as ErrorSeverity]?.label || error.severity}
                      </span>
                      <span className="text-gray-500">{error.count} 次</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 最近日志列表 */}
        <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-200">最近日志 (前 50 条)</h3>
            <div className="text-xs text-gray-500">{filteredLogs.length} 条结果</div>
          </div>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredLogs.slice(0, 50).map((log, i) => (
              <motion.div
                key={`${log.timestamp}-${log.service}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-lg bg-gray-800/30 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_CONFIG[log.severity as ErrorSeverity]?.color || '#6b7280' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">
                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                      </span>
                      {(() => {
                        const cfg = SEVERITY_CONFIG[log.severity as ErrorSeverity];
                        return cfg ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cfg.bg} ${cfg.border}`} style={{ color: cfg.color }}>
                            {cfg.label}
                          </span>
                        ) : null;
                      })()}
                      <span className="text-xs text-gray-500">{log.server}</span>
                      <span className="text-xs text-indigo-400">{log.project}/{log.service}</span>
                    </div>
                    <div className="text-xs text-gray-300">{log.message}</div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-gray-600">{log.server}:/data/{log.project}/{log.service}/logs/</span>
                      {log.errorCategory && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-purple-500/10 border border-purple-500/30 text-purple-400">
                          {log.errorCategory}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}