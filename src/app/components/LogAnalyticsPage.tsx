import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, TrendingUp, TrendingDown, AlertTriangle,
  Activity, Search, RefreshCw, Calendar,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  generateMockLogs,
  generateTimeSeriesData,
  getProjectServiceErrorBreakdown,
  getTopErrors,
  getLogStatistics,
} from '../config/mockLogData';
import { MultiSelectDropdown } from './MultiSelectDropdown';

type TimeRange = '15m' | '30m' | '1h' | '6h' | '12h' | '24h' | '3d' | '7d';

const TIME_RANGE_MINUTES: Record<TimeRange, number> = {
  '15m': 15, '30m': 30, '1h': 60, '6h': 360, '12h': 720, '24h': 1440, '3d': 4320, '7d': 10080,
};

const SERVICE_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e',
  '#10b981', '#a855f7', '#64748b',
];

export function LogAnalyticsPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>(['CRITICAL', 'ERROR', 'WARNING', 'INFO']);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const allLogs = useMemo(() => generateMockLogs(2000), []);

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
  
  const filteredLogs = useMemo(() => {
    const cutoffTime = Date.now() - TIME_RANGE_MINUTES[timeRange] * 60 * 1000;
    
    return allLogs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= cutoffTime
        && selectedSeverity.includes(log.severity)
        && (selectedServers.length === 0 || selectedServers.includes(log.server))
        && (selectedProjects.length === 0 || selectedProjects.includes(log.project))
        && (selectedServices.length === 0 || selectedServices.includes(log.service))
        && (searchQuery === '' ||
          log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.service.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [allLogs, timeRange, selectedSeverity, selectedServers, selectedProjects, selectedServices, searchQuery]);
  
  const stats = useMemo(() => getLogStatistics(filteredLogs), [filteredLogs]);
  const timeSeriesData = useMemo(() => generateTimeSeriesData(filteredLogs, TIME_RANGE_MINUTES[timeRange]), [filteredLogs, timeRange]);
  const projectServiceBreakdown = useMemo(() => getProjectServiceErrorBreakdown(filteredLogs), [filteredLogs]);
  const topErrors = useMemo(() => getTopErrors(filteredLogs, 10), [filteredLogs]);
  
  const severityDistribution = [
    { name: 'CRITICAL', value: stats.critical, color: '#ef4444' },
    { name: 'ERROR', value: stats.error, color: '#f97316' },
    { name: 'WARNING', value: stats.warning, color: '#eab308' },
    { name: 'INFO', value: stats.info, color: '#22c55e' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#ef4444';
      case 'ERROR': return '#f97316';
      case 'WARNING': return '#eab308';
      case 'INFO': return '#22c55e';
      default: return '#6b7280';
    }
  };

  // 当前筛选条件描述
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedServers.length > 0) parts.push(`${selectedServers.length} 台服务器`);
    if (selectedProjects.length > 0) parts.push(`${selectedProjects.length} 个项目`);
    if (selectedServices.length > 0) parts.push(`${selectedServices.length} 个服务`);
    return parts.length > 0 ? `已筛选: ${parts.join(' · ')}` : '';
  }, [selectedServers, selectedProjects, selectedServices]);

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
                onClick={() => navigate('/flow')}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-700"
              >
                <Activity className="w-4 h-4" />
                日志处理
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

            {/* 严重程度筛选 */}
            <div className="flex gap-1">
              {(['CRITICAL', 'ERROR', 'WARNING', 'INFO'] as const).map(severity => (
                <button
                  key={severity}
                  onClick={() => {
                    if (selectedSeverity.includes(severity)) {
                      setSelectedSeverity(selectedSeverity.filter(s => s !== severity));
                    } else {
                      setSelectedSeverity([...selectedSeverity, severity]);
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    selectedSeverity.includes(severity)
                      ? severity === 'CRITICAL' ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                      : severity === 'ERROR' ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400'
                      : severity === 'WARNING' ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400'
                      : 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                      : 'bg-gray-800 border border-gray-700 text-gray-500'
                  }`}
                >
                  {severity}
                </button>
              ))}
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
              <div className="text-xs text-gray-500">总日志数</div>
              <Activity className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold text-gray-200">{stats.total.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">最近 {timeRange}</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-red-500/5 border border-red-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-red-400">严重错误</div>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
            <div className="text-xs text-gray-500 mt-1">CRITICAL</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-orange-400">错误数</div>
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-orange-400">{stats.error}</div>
            <div className="text-xs text-gray-500 mt-1">ERROR</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-gray-900/50 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">错误率</div>
              {stats.errorGrowthRate > 0 ? (
                <TrendingUp className="w-4 h-4 text-red-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div className={`text-2xl font-bold ${stats.errorRate > 20 ? 'text-red-400' : stats.errorRate > 10 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {stats.errorRate.toFixed(1)}%
            </div>
            <div className={`text-xs mt-1 ${stats.errorGrowthRate > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {stats.errorGrowthRate > 0 ? '+' : ''}{stats.errorGrowthRate}% vs 前12h
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 时序趋势图 */}
            <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">日志趋势（最近 {timeRange}）</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
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
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="CRITICAL" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ERROR" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="WARNING" stroke="#eab308" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="INFO" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 项目×服务 错误分布 */}
            <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200 mb-1">项目错误分布（按服务拆分）</h3>
              <p className="text-xs text-gray-500 mb-4">仅统计 ERROR + CRITICAL 级别，X 轴为项目目录，各颜色代表不同子服务</p>
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

          {/* 右侧：饼图和 Top 错误 */}
          <div className="space-y-6">
            {/* 严重程度分布饼图 */}
            <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">严重程度分布</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={severityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {severityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="mt-4 space-y-2">
                {severityDistribution.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-400">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-300">{item.value}</span>
                  </div>
                ))}
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
                      <span className={`font-medium ${error.severity === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'}`}>
                        {error.severity}
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
            {filteredLogs.slice(0, 50).map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-lg bg-gray-800/30 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getSeverityColor(log.severity) }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">
                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        log.severity === 'CRITICAL' ? 'bg-red-500/20 border border-red-500/50 text-red-400' :
                        log.severity === 'ERROR' ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400' :
                        log.severity === 'WARNING' ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400' :
                        'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                      }`}>
                        {log.severity}
                      </span>
                      <span className="text-xs text-gray-500">{log.hostname}</span>
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