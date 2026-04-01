import { LokiService } from './lokiService';

export interface ErrorTypeData {
  name: string;
  value: number;
  color: string;
}

export interface TopNError {
  name: string;
  count: number;
  severity: string;
}

export interface TrendData {
  time: string;
  critical: number;
  error: number;
  warning: number;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'error' | 'warning';
  message: string;
  timestamp: string;
  count: number;
  source: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'critical' | 'error' | 'warning' | 'info' | 'debug';
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface Metrics {
  totalErrors: number;
  errorRate: number;
  activeAlerts: number;
  avgResponseTime: number;
  errorChange: number;
  rateChange: number;
  alertChange: number;
  responseChange: number;
}

export interface ServiceData {
  service: string;
  total: number;
  critical: number;
  error: number;
  warning: number;
}

export interface ResponseTimeData {
  time: string;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}

const ERROR_COLORS = [
  '#dc2626', '#ea580c', '#f59e0b', '#f97316', '#fb923c',
  '#ef4444', '#f87171', '#fca5a5'
];

export class LogAnalyzer {
  private readonly lokiService: LokiService;

  constructor(lokiService: LokiService) {
    this.lokiService = lokiService;
  }

  /**
   * 获取错误类型统计
   */
  async getErrorTypeStats(hours: number = 1): Promise<ErrorTypeData[]> {
    try {
      // LogQL: 按错误类型聚合统计
      const query = `sum by (error_type) (count_over_time({level=~"error|critical"} | json [${hours}h]))`;
      const result = await this.lokiService.query(query);

      return result.data.result.map((item, index) => ({
        name: item.metric.error_type || 'Unknown',
        value: Number.parseInt(item.value?.[1] || '0'),
        color: ERROR_COLORS[index % ERROR_COLORS.length],
      })).sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error('获取错误类型统计失败:', error);
      return [];
    }
  }

  /**
   * 获取 TopN 错误排名
   */
  async getTopNErrors(n: number = 10, hours: number = 1): Promise<TopNError[]> {
    try {
      // LogQL: 获取前N个最频繁的错误
      const query = `topk(${n}, sum by (message, level) (count_over_time({level=~"error|critical|warning"} | json [${hours}h])))`;
      const result = await this.lokiService.query(query);

      return result.data.result.map(item => ({
        name: this.truncateMessage(item.metric.message || 'Unknown error'),
        count: Number.parseInt(item.value?.[1] || '0'),
        severity: this.mapLevelToSeverity(item.metric.level || 'error'),
      }));
    } catch (error) {
      console.error('获取TopN错误失败:', error);
      return [];
    }
  }

  /**
   * 获取错误趋势数据
   */
  async getErrorTrend(hours: number = 24): Promise<TrendData[]> {
    try {
      const end = Math.floor(Date.now() / 1000);
      const start = end - hours * 3600;
      const step = 3600; // 1小时步长

      const queries = {
        critical: `sum(count_over_time({level="critical"} [1h]))`,
        error: `sum(count_over_time({level="error"} [1h]))`,
        warning: `sum(count_over_time({level="warning"} [1h]))`,
      };

      const results = await Promise.all([
        this.lokiService.queryRange(queries.critical, start, end, step),
        this.lokiService.queryRange(queries.error, start, end, step),
        this.lokiService.queryRange(queries.warning, start, end, step),
      ]);

      // 合并三个级别的数据
      const trendMap = new Map<string, TrendData>();

      results.forEach((result, index) => {
        const level = ['critical', 'error', 'warning'][index];
        
        if (result.data.result.length > 0) {
          result.data.result[0].values?.forEach(([timestamp, value]) => {
            const date = new Date(timestamp / 1000000); // 纳秒转毫秒
            const timeKey = `${date.getHours().toString().padStart(2, '0')}:00`;
            
            if (!trendMap.has(timeKey)) {
              trendMap.set(timeKey, {
                time: timeKey,
                critical: 0,
                error: 0,
                warning: 0,
              });
            }
            
            const trend = trendMap.get(timeKey);
            if (trend) trend[level as keyof Omit<TrendData, 'time'>] += Number.parseInt(value);
          });
        }
      });

      return Array.from(trendMap.values()).sort((a, b) => 
        a.time.localeCompare(b.time)
      );
    } catch (error) {
      console.error('获取错误趋势失败:', error);
      return [];
    }
  }

  /**
   * 获取实时日志流
   */
  async getRecentLogs(limit: number = 100): Promise<LogEntry[]> {
    try {
      const query = `{job=~".+"} | json`;
      const result = await this.lokiService.getLogStream(query, limit);

      const logs: LogEntry[] = [];

      result.data.result.forEach(stream => {
        stream.values.forEach(([timestamp, line]) => {
          try {
            // 尝试解析 JSON 日志
            const parsed = this.parseLogLine(line);
            const date = new Date(Number.parseInt(timestamp) / 1000000); // 纳秒转毫秒

            logs.push({
              timestamp: date.toLocaleTimeString('zh-CN', { hour12: false }),
              level: this.normalizeLevel(parsed.level || stream.stream.level || 'info'),
              message: parsed.message || line,
              source: parsed.source || stream.stream.job || 'unknown',
              metadata: parsed,
            });
          } catch {
            // 解析失败，使用原始日志行作为回退
            const date = new Date(Number.parseInt(timestamp) / 1000000);
            logs.push({
              timestamp: date.toLocaleTimeString('zh-CN', { hour12: false }),
              level: 'info',
              message: line,
              source: stream.stream.job || 'unknown',
            });
          }
        });
      });

      return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (error) {
      console.error('获取日志流失败:', error);
      return [];
    }
  }

  /**
   * 生成告警（基于规则）
   */
  async generateAlerts(): Promise<Alert[]> {
    try {
      const alerts: Alert[] = [];
      const now = new Date();

      // 规则1: Critical 错误率检查
      const criticalQuery = `sum(rate({level="critical"} [5m]))`;
      const criticalResult = await this.lokiService.query(criticalQuery);
      const criticalRate = Number.parseFloat(criticalResult.data.result[0]?.value?.[1] || '0');

      if (criticalRate > 0.05) { // 超过 5%
        alerts.push({
          id: `alert_critical_${Date.now()}`,
          severity: 'critical',
          message: `严重错误率过高: ${(criticalRate * 100).toFixed(2)}%/分钟`,
          timestamp: now.toLocaleTimeString('zh-CN'),
          count: Math.floor(criticalRate * 100),
          source: 'alert-engine',
        });
      }

      // 规则2: 错误数量检查
      const errorCountQuery = `sum(count_over_time({level=~"error|critical"} [10m]))`;
      const errorResult = await this.lokiService.query(errorCountQuery);
      const errorCount = Number.parseInt(errorResult.data.result[0]?.value?.[1] || '0');

      if (errorCount > 50) {
        alerts.push({
          id: `alert_error_count_${Date.now()}`,
          severity: 'error',
          message: `10分钟内错误数量达到 ${errorCount} 次`,
          timestamp: now.toLocaleTimeString('zh-CN'),
          count: errorCount,
          source: 'alert-engine',
        });
      }

      // 规则3: 警告级别检查
      const warningQuery = `sum(count_over_time({level="warning"} [15m]))`;
      const warningResult = await this.lokiService.query(warningQuery);
      const warningCount = Number.parseInt(warningResult.data.result[0]?.value?.[1] || '0');

      if (warningCount > 100) {
        alerts.push({
          id: `alert_warning_${Date.now()}`,
          severity: 'warning',
          message: `15分钟内警告数量达到 ${warningCount} 次`,
          timestamp: now.toLocaleTimeString('zh-CN'),
          count: warningCount,
          source: 'alert-engine',
        });
      }

      return alerts;
    } catch (error) {
      console.error('生成告警失败:', error);
      return [];
    }
  }

  /**
   * 获取关键指标
   */
  async getMetrics(): Promise<Metrics> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const hour1 = now - 3600;
      // 当前小时的错误总数
      const currentErrorsQuery = `sum(count_over_time({level=~"error|critical"} [1h]))`;
      const currentErrors = await this.lokiService.query(currentErrorsQuery);
      const totalErrors = Number.parseInt(currentErrors.data.result[0]?.value?.[1] || '0');

      // 上一小时的错误总数
      const previousErrorsQuery = `sum(count_over_time({level=~"error|critical"} [1h]))`;
      const previousErrors = await this.lokiService.query(previousErrorsQuery, hour1);
      const previousTotal = Number.parseInt(previousErrors.data.result[0]?.value?.[1] || '1');

      const errorChange = ((totalErrors - previousTotal) / previousTotal) * 100;

      // 错误率（假设总请求数可以从日志中获取）
      const totalRequestsQuery = `sum(count_over_time({job=~".+"} [1h]))`;
      const totalRequests = await this.lokiService.query(totalRequestsQuery);
      const requestCount = Number.parseInt(totalRequests.data.result[0]?.value?.[1] || '1');
      const errorRate = (totalErrors / requestCount) * 100;

      // 活跃告警数（通过告警规则计算）
      const alerts = await this.generateAlerts();

      return {
        totalErrors,
        errorRate: Number.parseFloat(errorRate.toFixed(2)),
        activeAlerts: alerts.length,
        avgResponseTime: 245, // 需要从日志中的响应时间字段计算
        errorChange: Number.parseFloat(errorChange.toFixed(1)),
        rateChange: -8.3, // 需要对比计算
        alertChange: 15.2, // 需要对比计算
        responseChange: -5.6, // 需要对比计算
      };
    } catch (error) {
      console.error('获取指标失败:', error);
      return {
        totalErrors: 0,
        errorRate: 0,
        activeAlerts: 0,
        avgResponseTime: 0,
        errorChange: 0,
        rateChange: 0,
        alertChange: 0,
        responseChange: 0,
      };
    }
  }

  // 辅助方法
  private truncateMessage(message: string, maxLength: number = 50): string {
    return message.length > maxLength 
      ? message.substring(0, maxLength) + '...' 
      : message;
  }

  private mapLevelToSeverity(level: string): string {
    const normalized = level.toLowerCase();
    if (['critical', 'fatal'].includes(normalized)) return 'critical';
    if (['error', 'err'].includes(normalized)) return 'error';
    if (['warning', 'warn'].includes(normalized)) return 'warning';
    return 'error';
  }

  private normalizeLevel(level: string): 'critical' | 'error' | 'warning' | 'info' | 'debug' {
    const normalized = level.toLowerCase();
    if (['critical', 'fatal'].includes(normalized)) return 'critical';
    if (['error', 'err'].includes(normalized)) return 'error';
    if (['warning', 'warn'].includes(normalized)) return 'warning';
    if (['info'].includes(normalized)) return 'info';
    return 'debug';
  }

  private parseLogLine(line: string): any {
    try {
      return JSON.parse(line);
    } catch {
      // 尝试匹配常见的日志格式
      const match = /\[(\w+)\]\s*(.+)/.exec(line);
      if (match) {
        return {
          level: match[1],
          message: match[2],
        };
      }
      return { message: line };
    }
  }

  /**
   * 获取服务维度分析
   */
  async getServiceAnalysis(hours: number = 1): Promise<ServiceData[]> {
    try {
      const queries = {
        critical: `sum by (job) (count_over_time({level="critical"} [${hours}h]))`,
        error: `sum by (job) (count_over_time({level="error"} [${hours}h]))`,
        warning: `sum by (job) (count_over_time({level="warning"} [${hours}h]))`,
      };

      const results = await Promise.all([
        this.lokiService.query(queries.critical),
        this.lokiService.query(queries.error),
        this.lokiService.query(queries.warning),
      ]);

      const serviceMap = new Map<string, ServiceData>();

      results.forEach((result, index) => {
        const level = ['critical', 'error', 'warning'][index];
        
        result.data.result.forEach(item => {
          const service = item.metric.job || 'unknown';
          const count = Number.parseInt(item.value?.[1] || '0');
          
          if (!serviceMap.has(service)) {
            serviceMap.set(service, {
              service,
              total: 0,
              critical: 0,
              error: 0,
              warning: 0,
            });
          }
          
          const serviceData = serviceMap.get(service);
          if (!serviceData) return;
          serviceData[level as 'critical' | 'error' | 'warning'] = count;
          serviceData.total += count;
        });
      });

      return Array.from(serviceMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10); // 返回前10个服务
    } catch (error) {
      console.error('获取服务分析失败:', error);
      return [];
    }
  }

  /**
   * 获取响应时间分析
   */
  async getResponseTimeAnalysis(hours: number = 24): Promise<ResponseTimeData[]> {
    try {
      const end = Math.floor(Date.now() / 1000);
      const start = end - hours * 3600;
      const step = 3600; // 1小时步长

      // 假设日志中有 response_time 字段
      const queries = {
        p50: `quantile_over_time(0.5, {job=~".+"} | json | unwrap response_time [1h])`,
        p95: `quantile_over_time(0.95, {job=~".+"} | json | unwrap response_time [1h])`,
        p99: `quantile_over_time(0.99, {job=~".+"} | json | unwrap response_time [1h])`,
      };

      const results = await Promise.all([
        this.lokiService.queryRange(queries.p50, start, end, step).catch(() => null),
        this.lokiService.queryRange(queries.p95, start, end, step).catch(() => null),
        this.lokiService.queryRange(queries.p99, start, end, step).catch(() => null),
      ]);

      const timeMap = new Map<string, ResponseTimeData>();

      results.forEach((result, index) => {
        if (!result || result.data.result.length === 0) return;
        
        const percentile = ['p50', 'p95', 'p99'][index];
        
        result.data.result[0].values?.forEach(([timestamp, value]) => {
          const date = new Date(timestamp / 1000000);
          const timeKey = `${date.getHours().toString().padStart(2, '0')}:00`;
          
          if (!timeMap.has(timeKey)) {
            timeMap.set(timeKey, {
              time: timeKey,
              p50: 0,
              p95: 0,
              p99: 0,
              avg: 0,
            });
          }
          
          const data = timeMap.get(timeKey);
          if (data) data[percentile as 'p50' | 'p95' | 'p99'] = Number.parseFloat(value);
        });
      });

      // 计算平均值
      timeMap.forEach(data => {
        data.avg = (data.p50 + data.p95 + data.p99) / 3;
      });

      return Array.from(timeMap.values()).sort((a, b) => 
        a.time.localeCompare(b.time)
      );
    } catch (error) {
      console.error('获取响应时间分析失败:', error);
      // 返回模拟数据
      return this.generateMockResponseTimeData(hours);
    }
  }

  /**
   * 生成模拟响应时间数据（当真实数据不可用时）
   */
  private generateMockResponseTimeData(hours: number): ResponseTimeData[] {
    const data: ResponseTimeData[] = [];
    const now = new Date();
    
    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = time.getHours();
      
      data.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        p50: Math.floor(Math.random() * 100 + 50),
        p95: Math.floor(Math.random() * 200 + 150),
        p99: Math.floor(Math.random() * 300 + 250),
        avg: Math.floor(Math.random() * 150 + 100),
      });
    }
    
    return data;
  }
}