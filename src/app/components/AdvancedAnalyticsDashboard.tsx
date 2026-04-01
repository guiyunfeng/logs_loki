import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Activity, TrendingUp, TrendingDown, AlertTriangle,
  RefreshCw, CheckCircle, AlertCircle, Zap, Target, Clock, Users,
  Brain, Search, BarChart3, LineChart as LineChartIcon,
  Lightbulb, Shield, Timer, Network, Cpu, Database
} from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, AreaChart, Area } from 'recharts';
import { generateMockLogs } from '../config/mockLogData';
import { queryLoki } from '../../services/lokiService';

interface AnalysisReport {
  timestamp: string;
  summary: {
    totalLogs: number;
    totalErrors: number;
    errorRate: number;
    affectedServices: number;
  };
  topErrors: Array<{ message: string; count: number; percentage: number }>;
  serviceHealth: Array<{ service: string; status: 'healthy' | 'degraded' | 'critical'; errorRate: number }>;
  recommendations: string[];
}

interface RootCauseAnalysis {
  errorPattern: string;
  confidence: number;
  relatedErrors: Array<{ message: string; correlation: number }>;
  affectedServices: string[];
  timeline: Array<{ timestamp: string; event: string; severity: string }>;
  recommendations: string[];
}

interface AnomalyDetection {
  timestamp: string;
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface PerformanceProfile {
  service: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  trend: 'improving' | 'stable' | 'degrading';
}

interface PredictiveInsights {
  type: 'error_spike' | 'service_degradation' | 'resource_exhaustion';
  confidence: number;
  predictedTime: string;
  description: string;
  preventiveActions: string[];
}

interface ServiceCorrelation {
  serviceA: string;
  serviceB: string;
  correlationStrength: number;
  errorCoincidence: number;
  description: string;
}

type AnalysisMode = 'overview' | 'root-cause' | 'anomaly' | 'performance' | 'predictive' | 'correlation';

type TimeRange = '1h' | '6h' | '24h' | '7d';

const timeRangeHours: Record<TimeRange, number> = {
  '1h': 1,
  '6h': 6,
  '24h': 24,
  '7d': 7 * 24,
};

export function AdvancedAnalyticsDashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('overview');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [servicesHealth, setServicesHealth] = useState<ServiceHealth[]>([]);
  const [sloMetrics, setSloMetrics] = useState<SLOMetrics[]>([]);
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState<RootCauseAnalysis | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [performanceProfiles, setPerformanceProfiles] = useState<PerformanceProfile[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsights[]>([]);
  const [serviceCorrelations, setServiceCorrelations] = useState<ServiceCorrelation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mockLogs, setMockLogs] = useState<any[]>([]);

  // 从 Loki 加载数据
  useEffect(() => {
    const loadLogsFromLoki = async () => {
      setIsLoading(true);
      try {
        const hours = timeRangeHours[timeRange];
        const end = Math.floor(Date.now() / 1000); // Unix 秒
        const start = end - hours * 60 * 60;

        console.log('Advanced Dashboard - 开始查询 Loki，时间范围:', { start, end, timeRange });
        // 尝试从 Loki 获取数据
        const response = await queryLoki('{job!=""}', start, end);
        console.log('Advanced Dashboard - Loki 查询响应:', response);

        if (response.data?.result?.length > 0) {
          // 转换 Loki 数据格式
          const lokiLogs: any[] = [];
          response.data.result.forEach((stream: any) => {
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
                  service: labels.job || labels.service_name || 'unknown',
                  project,
                  server: labels.job || labels.service_name || 'unknown',
                });
              });
            }
          });
          console.log('Advanced Dashboard - 转换后的日志数量:', lokiLogs.length);
          setMockLogs(lokiLogs);
        } else {
          // 如果 Loki 无数据，使用模拟数据
          console.log('Advanced Dashboard - Loki 无数据，使用模拟数据');
          setMockLogs(generateMockLogs(2000));
        }
      } catch (error) {
        console.error('Advanced Dashboard - 从 Loki 加载数据失败:', error);
        setMockLogs(generateMockLogs(2000));
      } finally {
        setIsLoading(false);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    };

    loadLogsFromLoki();
  }, [timeRange]);
  const generateAnalysisReport = (logs: any[], hours: number): AnalysisReport => {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    const filteredLogs = logs.filter(
      (log) => new Date(log.timestamp).getTime() >= cutoffTime
    );

    const totalLogs = filteredLogs.length;
    const errorLogs = filteredLogs.filter((log) =>
      ['CRITICAL', 'ERROR'].includes(log.severity)
    );
    const totalErrors = errorLogs.length;
    const errorRate = totalLogs > 0 ? totalErrors / totalLogs : 0;

    // 统计 Top 错误
    const errorMap = new Map<string, number>();
    errorLogs.forEach((log) => {
      const count = errorMap.get(log.message) || 0;
      errorMap.set(log.message, count + 1);
    });

    const topErrors = Array.from(errorMap.entries())
      .map(([message, count]) => ({
        message,
        count,
        percentage: (count / totalErrors) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 统计受影响的服务
    const affectedServices = new Set<string>();
    errorLogs.forEach((log) => {
      affectedServices.add(log.service);
    });

    // 服务健康状态
    const serviceHealth = Array.from(affectedServices).map((service) => {
      const serviceLogs = filteredLogs.filter((log) => log.service === service);
      const serviceErrors = serviceLogs.filter((log) =>
        ['CRITICAL', 'ERROR'].includes(log.severity)
      );
      const svcErrorRate = serviceLogs.length > 0 ? serviceErrors.length / serviceLogs.length : 0;

      let status: 'healthy' | 'degraded' | 'critical';
      if (svcErrorRate > 0.1) status = 'critical';
      else if (svcErrorRate > 0.05) status = 'degraded';
      else status = 'healthy';

      return { service, status, errorRate: svcErrorRate };
    });

    // 生成建议
    const recommendations: string[] = [];
    if (errorRate > 0.1) {
      recommendations.push('⚠️ 系统错误率过高（>10%），建议立即排查');
    }
    if (affectedServices.size > 5) {
      recommendations.push('🔴 多个服务同时出错，可能存在公共依赖问题');
    }
    if (totalErrors > 100) {
      recommendations.push('📊 错误数量较多，建议进行根因分析');
    }

    return {
      timestamp: new Date().toLocaleTimeString('zh-CN'),
      summary: {
        totalLogs,
        totalErrors,
        errorRate,
        affectedServices: affectedServices.size,
      },
      topErrors,
      serviceHealth: serviceHealth.slice(0, 3),
      recommendations,
    };
  };

  // 分析服务健康状态（模拟 EnhancedLogAnalyzer）
  const analyzeServiceHealth = (logs: any[], hours: number) => {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    const filteredLogs = logs.filter(
      (log) => new Date(log.timestamp).getTime() >= cutoffTime
    );

    const services = new Set(filteredLogs.map((log) => log.service));

    const health: ServiceHealth[] = Array.from(services).map((service) => {
      const serviceLogs = filteredLogs.filter((log) => log.service === service);
      const errors = serviceLogs.filter((log) =>
        ['CRITICAL', 'ERROR'].includes(log.severity)
      );
      const errorRate = serviceLogs.length > 0 ? errors.length / serviceLogs.length : 0;

      return {
        service,
        status:
          errorRate > 0.1 ? 'critical' : errorRate > 0.05 ? 'degraded' : 'healthy',
        errorRate,
        avgResponseTime: Math.floor(500 + Math.random() * 2000),
        totalLogs: serviceLogs.length,
      };
    });

    return health.sort((a, b) => b.errorRate - a.errorRate);
  };

  // 计算 SLO 指标（模拟 EnhancedLogAnalyzer）
  const calculateSLOMetrics = (logs: any[], hours: number) => {
    const services = Array.from(
      new Set(logs.map((log) => log.service))
    ).slice(0, 5);

    return services.map((service) => {
      const serviceLogs = logs.filter((log) => log.service === service);
      const healthyLogs = serviceLogs.filter(
        (log) => !['CRITICAL', 'ERROR'].includes(log.severity)
      );
      const availability =
        serviceLogs.length > 0 ? healthyLogs.length / serviceLogs.length : 1;

      const sloTarget = 0.999;
      let status: 'good' | 'warning' | 'violated' = 'good';
      if (availability < sloTarget * 0.9) status = 'violated';
      else if (availability < sloTarget * 0.95) status = 'warning';

      return {
        service,
        sloTarget,
        availability,
        status,
      };
    });
  };

  // 根因分析
  const performRootCauseAnalysis = (logs: any[], hours: number): RootCauseAnalysis => {
    const topError = report?.topErrors[0];
    if (!topError) return null;

    const relatedErrors = report.topErrors.slice(1, 4).map(err => ({
      message: err.message,
      correlation: Math.random() * 0.8 + 0.2
    }));

    const affectedServices = Array.from(new Set(
      logs.filter(log => log.message.includes(topError.message.split(' ')[0]))
        .map(log => log.service)
    ));

    const timeline = logs
      .filter(log => log.message.includes(topError.message.split(' ')[0]))
      .slice(0, 10)
      .map(log => ({
        timestamp: new Date(log.timestamp).toLocaleTimeString('zh-CN'),
        event: log.message.substring(0, 50) + '...',
        severity: log.severity
      }));

    return {
      errorPattern: topError.message,
      confidence: 0.85 + Math.random() * 0.1,
      relatedErrors,
      affectedServices,
      timeline,
      recommendations: [
        '检查相关服务的配置一致性',
        '分析上游服务的错误传播',
        '考虑实施熔断机制',
        '增加错误重试逻辑'
      ]
    };
  };

  // 异常检测
  const detectAnomalies = (logs: any[], hours: number): AnomalyDetection[] => {
    const anomalies: AnomalyDetection[] = [];
    const services = Array.from(new Set(logs.map(log => log.service)));

    services.forEach(service => {
      const serviceLogs = logs.filter(log => log.service === service);
      const errorRate = serviceLogs.filter(log => ['CRITICAL', 'ERROR'].includes(log.severity)).length / serviceLogs.length;

      if (errorRate > 0.15) {
        anomalies.push({
          timestamp: new Date().toISOString(),
          metric: 'error_rate',
          value: errorRate,
          expectedValue: 0.05,
          deviation: (errorRate - 0.05) / 0.05,
          severity: errorRate > 0.3 ? 'critical' : errorRate > 0.2 ? 'high' : 'medium',
          description: `${service} 错误率异常升高`
        });
      }
    });

    return anomalies;
  };

  // 性能分析
  const analyzePerformance = (logs: any[], hours: number): PerformanceProfile[] => {
    const services = Array.from(new Set(logs.map(log => log.service)));

    return services.map(service => {
      const serviceLogs = logs.filter(log => log.service === service);
      const responseTimes = serviceLogs.map(log => log.responseTime || (500 + Math.random() * 2000));

      return {
        service,
        avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        p95ResponseTime: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)],
        p99ResponseTime: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)],
        throughput: serviceLogs.length / hours,
        errorRate: serviceLogs.filter(log => ['CRITICAL', 'ERROR'].includes(log.severity)).length / serviceLogs.length,
        trend: Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'degrading'
      };
    });
  };

  // 预测洞察
  const generatePredictiveInsights = (logs: any[], hours: number): PredictiveInsights[] => {
    const insights: PredictiveInsights[] = [];

    // 基于趋势预测错误激增
    const recentErrors = logs.filter(log =>
      ['CRITICAL', 'ERROR'].includes(log.severity) &&
      new Date(log.timestamp).getTime() > Date.now() - hours * 60 * 60 * 1000 / 2
    ).length;

    const totalErrors = logs.filter(log => ['CRITICAL', 'ERROR'].includes(log.severity)).length;

    if (recentErrors > totalErrors * 0.6) {
      insights.push({
        type: 'error_spike',
        confidence: 0.75,
        predictedTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString('zh-CN'),
        description: '预计2小时内错误数量将激增',
        preventiveActions: [
          '增加服务实例数量',
          '启用流量限制',
          '准备回滚方案'
        ]
      });
    }

    return insights;
  };

  // 服务关联分析
  const analyzeServiceCorrelations = (logs: any[], hours: number): ServiceCorrelation[] => {
    const services = Array.from(new Set(logs.map(log => log.service)));
    const correlations: ServiceCorrelation[] = [];

    for (let i = 0; i < services.length - 1; i++) {
      for (let j = i + 1; j < services.length; j++) {
        const serviceA = services[i];
        const serviceB = services[j];

        const logsA = logs.filter(log => log.service === serviceA);
        const logsB = logs.filter(log => log.service === serviceB);

        const errorsA = logsA.filter(log => ['CRITICAL', 'ERROR'].includes(log.severity));
        const errorsB = logsB.filter(log => ['CRITICAL', 'ERROR'].includes(log.severity));

        // 计算同时出错的概率
        const coincidentErrors = Math.min(errorsA.length, errorsB.length) * (0.3 + Math.random() * 0.4);

        if (coincidentErrors > 2) {
          correlations.push({
            serviceA,
            serviceB,
            correlationStrength: 0.4 + Math.random() * 0.5,
            errorCoincidence: coincidentErrors,
            description: `${serviceA} 和 ${serviceB} 经常同时出现错误`
          });
        }
      }
    }

    return correlations.sort((a, b) => b.correlationStrength - a.correlationStrength);
  };

  // 生成趋势数据
  const generateTrendData = (logs: any[], hours: number) => {
    const data = [];
    const now = new Date();
    const interval = hours <= 24 ? 1 : Math.ceil(hours / 24); // 小时或天间隔

    for (let i = hours - 1; i >= 0; i -= interval) {
      const timePoint = new Date(now.getTime() - i * 60 * 60 * 1000);
      const cutoffTime = timePoint.getTime();
      const nextCutoffTime = cutoffTime + interval * 60 * 60 * 1000;

      const periodLogs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= cutoffTime && logTime < nextCutoffTime;
      });

      const critical = periodLogs.filter(log => log.severity === 'CRITICAL').length;
      const error = periodLogs.filter(log => log.severity === 'ERROR').length;
      const warning = periodLogs.filter(log => log.severity === 'WARNING').length;

      const timeLabel = hours <= 24
        ? `${timePoint.getHours().toString().padStart(2, '0')}:00`
        : timePoint.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

      data.push({
        time: timeLabel,
        critical,
        error,
        warning,
      });
    }

    return data.reverse(); // 确保时间顺序正确
  };

  // 初始化加载
  useEffect(() => {
    const performAnalysis = () => {
      setIsLoading(true);
      setTimeout(() => {
        const hours = timeRangeHours[timeRange];
        setReport(generateAnalysisReport(mockLogs, hours));
        setServicesHealth(analyzeServiceHealth(mockLogs, hours));
        setSloMetrics(calculateSLOMetrics(mockLogs, hours));

        // 高级分析
        setRootCauseAnalysis(performRootCauseAnalysis(mockLogs, hours));
        setAnomalies(detectAnomalies(mockLogs, hours));
        setPerformanceProfiles(analyzePerformance(mockLogs, hours));
        setPredictiveInsights(generatePredictiveInsights(mockLogs, hours));
        setServiceCorrelations(analyzeServiceCorrelations(mockLogs, hours));

        setLastUpdate(new Date().toLocaleTimeString('zh-CN'));
        setIsLoading(false);
      }, 300);
    };

    performAnalysis();

    if (autoRefresh) {
      const interval = setInterval(performAnalysis, 30000); // 30秒刷新一次
      return () => clearInterval(interval);
    }
  }, [timeRange, autoRefresh, mockLogs]);

  if (!report) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  const trendData = generateTrendData(mockLogs, timeRangeHours[timeRange]);

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50';
      case 'degraded':
        return 'bg-yellow-50';
      case 'critical':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-800 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">🧠 高级分析仪表盘</h1>
              <p className="text-gray-400 text-sm">
                AI驱动的智能分析：根因分析、异常检测、性能洞察、预测预警、服务关联
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                autoRefresh
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? '自动刷新中' : '手动模式'}
            </button>
            <button
              onClick={() => {
                const hours = timeRangeHours[timeRange];
                setReport(generateAnalysisReport(mockLogs, hours));
                setLastUpdate(new Date().toLocaleTimeString('zh-CN'));
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              刷新
            </button>
          </div>
        </div>

        {/* 时间范围选择和分析模式 */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(timeRangeHours) as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg transition ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* 分析模式选择 */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'overview', label: '总览', icon: BarChart3 },
            { key: 'root-cause', label: '根因分析', icon: Search },
            { key: 'anomaly', label: '异常检测', icon: AlertTriangle },
            { key: 'performance', label: '性能分析', icon: Cpu },
            { key: 'predictive', label: '预测洞察', icon: Brain },
            { key: 'correlation', label: '服务关联', icon: Network }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setAnalysisMode(key as AnalysisMode)}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                analysisMode === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* 摘要卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">总日志数</p>
                <p className="text-3xl font-bold mt-1">
                  {report.summary.totalLogs.toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-900 to-red-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-200 text-sm">错误日志</p>
                <p className="text-3xl font-bold mt-1">
                  {report.summary.totalErrors}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-200 text-sm">错误率</p>
                <p className="text-3xl font-bold mt-1">
                  {(report.summary.errorRate * 100).toFixed(2)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm">异常服务</p>
                <p className="text-3xl font-bold mt-1">
                  {report.summary.affectedServices}
                </p>
              </div>
              <Zap className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </motion.div>

        {/* 建议 */}
        {report.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-900/30 border border-blue-700 rounded-lg p-4"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              💡 系统建议
            </h3>
            <ul className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-blue-200 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  {rec}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左列：主要图表 */}
          <div className="lg:col-span-2 space-y-6">
            {analysisMode === 'overview' && (
              <>
                {/* 错误趋势 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-800 rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <LineChartIcon className="w-5 h-5 text-blue-400" />
                    📈 错误趋势分析
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={generateTrendData(mockLogs, timeRangeHours[timeRange])}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="time" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #444' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="critical"
                        stackId="1"
                        stroke="#ef4444"
                        fill="#ef4444"
                        name="关键"
                      />
                      <Area
                        type="monotone"
                        dataKey="error"
                        stackId="1"
                        stroke="#f97316"
                        fill="#f97316"
                        name="错误"
                      />
                      <Area
                        type="monotone"
                        dataKey="warning"
                        stackId="1"
                        stroke="#eab308"
                        fill="#eab308"
                        name="警告"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Top 错误 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-800 rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-red-400" />
                    🔴 Top 5 错误模式
                  </h2>
                  <div className="space-y-3">
                    {report.topErrors.map((error, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-gray-700/50 p-3 rounded hover:bg-gray-700 transition"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{i + 1}. {error.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            数量: {error.count} | 占比: {error.percentage.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-400">
                            {error.count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}

            {analysisMode === 'root-cause' && rootCauseAnalysis && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800 rounded-lg p-6"
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-purple-400" />
                  🔍 根因分析报告
                </h2>

                <div className="space-y-6">
                  <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-300 mb-2">主要错误模式</h3>
                    <p className="text-sm text-gray-300">{rootCauseAnalysis.errorPattern}</p>
                    <p className="text-xs text-purple-400 mt-1">
                      置信度: {(rootCauseAnalysis.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Network className="w-4 h-4 text-blue-400" />
                        相关错误
                      </h4>
                      <div className="space-y-2">
                        {rootCauseAnalysis.relatedErrors.map((err, i) => (
                          <div key={i} className="bg-gray-700/50 p-2 rounded text-sm">
                            <p className="text-gray-300">{err.message}</p>
                            <p className="text-xs text-blue-400">
                              相关性: {(err.correlation * 100).toFixed(1)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-400" />
                        受影响服务
                      </h4>
                      <div className="space-y-2">
                        {rootCauseAnalysis.affectedServices.map((service, i) => (
                          <div key={i} className="bg-gray-700/50 p-2 rounded text-sm flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            {service}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      错误时间线
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {rootCauseAnalysis.timeline.map((event, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="text-xs text-gray-500 w-16">{event.timestamp}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            event.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                            event.severity === 'ERROR' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {event.severity}
                          </span>
                          <span className="text-gray-300 flex-1">{event.event}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      修复建议
                    </h4>
                    <ul className="space-y-2">
                      {rootCauseAnalysis.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-blue-200 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {analysisMode === 'anomaly' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800 rounded-lg p-6"
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  🚨 异常检测结果
                </h2>

                {anomalies.length > 0 ? (
                  <div className="space-y-4">
                    {anomalies.map((anomaly, i) => (
                      <div key={i} className={`p-4 rounded-lg border ${
                        anomaly.severity === 'critical' ? 'bg-red-900/20 border-red-700' :
                        anomaly.severity === 'high' ? 'bg-orange-900/20 border-orange-700' :
                        anomaly.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-700' :
                        'bg-blue-900/20 border-blue-700'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{anomaly.description}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            anomaly.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                            anomaly.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            anomaly.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {anomaly.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">实际值:</span>
                            <span className="ml-2 font-mono">{(anomaly.value * 100).toFixed(2)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-400">期望值:</span>
                            <span className="ml-2 font-mono">{(anomaly.expectedValue * 100).toFixed(2)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-400">偏差:</span>
                            <span className="ml-2 font-mono text-red-400">
                              {(anomaly.deviation * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">时间:</span>
                            <span className="ml-2 text-xs">
                              {new Date(anomaly.timestamp).toLocaleTimeString('zh-CN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                    <p>未检测到异常情况</p>
                    <p className="text-sm mt-1">所有指标都在正常范围内</p>
                  </div>
                )}
              </motion.div>
            )}

            {analysisMode === 'performance' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-green-400" />
                    ⚡ 性能分析概览
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={performanceProfiles}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="avgResponseTime" name="平均响应时间(ms)" stroke="#888" />
                      <YAxis dataKey="throughput" name="吞吐量(req/h)" stroke="#888" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #444' }}
                        formatter={(value, name) => [
                          typeof value === 'number' ? value.toFixed(2) : value,
                          name === 'avgResponseTime' ? '响应时间(ms)' : '吞吐量(req/h)'
                        ]}
                      />
                      <Scatter name="服务性能" dataKey="throughput" fill="#10b981" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {performanceProfiles.slice(0, 6).map((profile, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-400" />
                        {profile.service}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">平均响应:</span>
                          <span className="font-mono">{profile.avgResponseTime.toFixed(0)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">P95响应:</span>
                          <span className="font-mono">{profile.p95ResponseTime.toFixed(0)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">吞吐量:</span>
                          <span className="font-mono">{profile.throughput.toFixed(1)} req/h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">错误率:</span>
                          <span className="font-mono text-red-400">{(profile.errorRate * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">趋势:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            profile.trend === 'improving' ? 'bg-green-500/20 text-green-400' :
                            profile.trend === 'stable' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {profile.trend === 'improving' ? '改善中' :
                             profile.trend === 'stable' ? '稳定' : '恶化中'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {analysisMode === 'predictive' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800 rounded-lg p-6"
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  🧠 预测洞察分析
                </h2>

                {predictiveInsights.length > 0 ? (
                  <div className="space-y-4">
                    {predictiveInsights.map((insight, i) => (
                      <div key={i} className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-purple-300">
                            {insight.type === 'error_spike' ? '错误激增预测' :
                             insight.type === 'service_degradation' ? '服务性能下降预测' :
                             '资源耗尽预测'}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-purple-400">
                              置信度: {(insight.confidence * 100).toFixed(1)}%
                            </span>
                            <div className="w-16 h-2 bg-gray-700 rounded">
                              <div
                                className="h-full bg-purple-400 rounded"
                                style={{ width: `${insight.confidence * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <p className="text-gray-300 mb-3">{insight.description}</p>

                        <div className="mb-3">
                          <span className="text-sm text-yellow-400">预计时间:</span>
                          <span className="ml-2 text-sm text-gray-300">{insight.predictedTime}</span>
                        </div>

                        <div>
                          <h5 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            预防措施
                          </h5>
                          <ul className="space-y-1">
                            {insight.preventiveActions.map((action, j) => (
                              <li key={j} className="text-sm text-green-200 flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Brain className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                    <p>当前没有显著的预测洞察</p>
                    <p className="text-sm mt-1">系统运行状态良好</p>
                  </div>
                )}
              </motion.div>
            )}

            {analysisMode === 'correlation' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800 rounded-lg p-6"
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Network className="w-5 h-5 text-cyan-400" />
                  🔗 服务关联分析
                </h2>

                {serviceCorrelations.length > 0 ? (
                  <div className="space-y-4">
                    {serviceCorrelations.slice(0, 8).map((correlation, i) => (
                      <div key={i} className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-cyan-300">
                            {correlation.serviceA} ↔ {correlation.serviceB}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-cyan-400">
                              关联强度: {(correlation.correlationStrength * 100).toFixed(1)}%
                            </span>
                            <div className="w-16 h-2 bg-gray-700 rounded">
                              <div
                                className="h-full bg-cyan-400 rounded"
                                style={{ width: `${correlation.correlationStrength * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <p className="text-gray-300 mb-2">{correlation.description}</p>

                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">共同错误次数:</span>
                            <span className="ml-2 font-mono text-red-400">
                              {correlation.errorCoincidence.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Network className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
                    <p>未发现显著的服务关联</p>
                    <p className="text-sm mt-1">服务间相对独立运行</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* 右列：服务数据 */}
          <div className="space-y-6">
            {/* 服务健康状态 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-800 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                🏥 服务健康
              </h2>
              <div className="space-y-2">
                {servicesHealth.slice(0, 5).map((svc, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border border-gray-700 ${getStatusColor(svc.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getHealthIcon(svc.status)}
                        <span className="text-sm font-medium">{svc.service}</span>
                      </div>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                        {(svc.errorRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* SLO 指标 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-800 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                📊 SLO 指标
              </h2>
              <div className="space-y-2">
                {sloMetrics.slice(0, 5).map((slo, i) => {
                  const statusColor =
                    slo.status === 'good'
                      ? 'text-green-400'
                      : slo.status === 'warning'
                        ? 'text-yellow-400'
                        : 'text-red-400';
                  return (
                    <div key={i} className="bg-gray-700/50 p-3 rounded text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{slo.service}</span>
                        <span className={`font-bold ${statusColor}`}>
                          {(slo.availability * 100).toFixed(3)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        目标: {(slo.sloTarget * 100).toFixed(2)}% | 状态:{' '}
                        <span className={statusColor}>{slo.status}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* 更新时间 */}
            <div className="bg-gray-700/30 rounded-lg p-4 text-center text-sm text-gray-400">
              <p>最后更新: {lastUpdate}</p>
              {autoRefresh && <p className="text-xs mt-1">📡 自动更新: 每 30 秒</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
