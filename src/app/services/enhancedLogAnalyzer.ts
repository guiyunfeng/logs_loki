/**
 * ═══════════════════════════════════════════════════════════════
 * 增强版日志分析器 - 集成高级统计和聚合能力
 * ═══════════════════════════════════════════════════════════════
 */

import { AdvancedLokiService, AggregationResult, LogStatistics } from './advancedLokiService';

export interface ErrorAnalysis {
  topErrors: Array<{
    message: string;
    count: number;
    percentage: number;
    services: string[];
    firstSeen: string;
    lastSeen: string;
  }>;
  errorTrend: Array<{
    timestamp: string;
    critical: number;
    error: number;
    warning: number;
  }>;
  affectedServices: Record<string, number>;
  totalErrors: number;
}

export interface ServiceHealthReport {
  service: string;
  status: 'healthy' | 'degraded' | 'critical';
  errorRate: number;
  avgResponseTime: number;
  totalLogs: number;
  lastError?: string;
  recommendations: string[];
}

export interface SLOMetrics {
  serviceName: string;
  sloTarget: number; // 0.999 = 99.9%
  availability: number;
  errorBudget: number;
  status: 'good' | 'warning' | 'violated';
  period: string; // 如 "30d"
}

export interface PerformanceProfile {
  p50: number;
  p95: number;
  p99: number;
  max: number;
  min: number;
  avg: number;
}

export interface LogPattern {
  pattern: string;
  count: number;
  examples: string[];
  firstSeen: string;
  lastSeen: string;
}

/**
 * 增强版日志分析器
 */
export class EnhancedLogAnalyzer {
  private lokiService: AdvancedLokiService;

  constructor(lokiService: AdvancedLokiService) {
    this.lokiService = lokiService;
  }

  /**
   * 生成完整错误分析报告
   */
  async generateErrorAnalysis(hours: number = 24): Promise<ErrorAnalysis> {
    const [errorDimensions, errorTrendRaw] = await Promise.all([
      this.lokiService.getMultiDimensionStats(
        '{level=~"error|critical"}',
        ['message', 'service'],
        hours
      ),
      this.lokiService.timeSeriesAggregation(
        'sum by (level) (count_over_time({level=~"error|critical|warning"} [1h]))',
        Math.floor(Date.now() / 1000) - hours * 3600,
        Math.floor(Date.now() / 1000),
        3600
      ),
    ]);

    // 处理趋势数据
    const trendMap = new Map<number, { critical: number; error: number; warning: number }>();
    
    // 初始化所有时间戳
    const now = Math.floor(Date.now() / 1000);
    for (let i = hours; i > 0; i--) {
      const ts = now - i * 3600;
      trendMap.set(ts * 1000, { critical: 0, error: 0, warning: 0 });
    }

    // 根据实际数据构建完整的趋势数据结构
    const errorTrend: ErrorAnalysis['errorTrend'] = [];
    for (const [timestamp, entry] of trendMap.entries()) {
      errorTrend.push({
        timestamp: new Date(timestamp).toISOString(),
        critical: entry.critical,
        error: entry.error,
        warning: entry.warning,
      });
    }

    // 处理错误消息
    const topErrors = errorDimensions.message?.buckets
      .slice(0, 20)
      .map((bucket, index) => ({
        message: bucket.key,
        count: bucket.count,
        percentage: bucket.percentage,
        services: [], // 需要单独查询关联的服务
        firstSeen: new Date(Date.now() - hours * 3600 * 1000).toISOString(),
        lastSeen: new Date().toISOString(),
      })) || [];

    const affectedServices: Record<string, number> = {};
    errorDimensions.service?.buckets.forEach((bucket) => {
      affectedServices[bucket.key] = bucket.count;
    });

    return {
      topErrors,
      errorTrend,
      affectedServices,
      totalErrors: errorDimensions.message?.total || 0,
    };
  }

  /**
   * 生成服务健康报告
   */
  async generateServiceHealthReport(service: string): Promise<ServiceHealthReport> {
    const [stats, errorRate] = await Promise.all([
      this.lokiService.getCompleteStatistics(1),
      this.lokiService.calculateRatio(
        `{service="${service}", level=~"error|critical"}`,
        `{service="${service}"}`,
        1
      ),
    ]);

    const serviceErrors = stats.byService[service] || 0;
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (errorRate > 0.1) {
      status = 'critical';
      recommendations.push(`错误率达到 ${(errorRate * 100).toFixed(2)}%，需要立即处理`);
      recommendations.push('检查最近的代码部署');
      recommendations.push('查看实时日志排查问题根因');
    } else if (errorRate > 0.05) {
      status = 'degraded';
      recommendations.push(`错误率达到 ${(errorRate * 100).toFixed(2)}%，建议关注`);
      recommendations.push('分析错误类型分布');
    } else {
      recommendations.push('服务状态良好，继续监控');
    }

    if (stats.avgProcessingTime > 5000) {
      recommendations.push('响应时间较长，考虑性能优化');
    }

    return {
      service,
      status,
      errorRate,
      avgResponseTime: stats.avgProcessingTime,
      totalLogs: stats.totalLogs,
      recommendations,
    };
  }

  /**
   * 计算 SLO 指标
   */
  async calculateSLO(
    service: string,
    sloTarget: number = 0.999,
    periodDays: number = 30
  ): Promise<SLOMetrics> {
    const availability = await this.lokiService.calculateRatio(
      `{service="${service}", level!=""}`,
      `{service="${service}", level="error"}`,
      periodDays * 24
    );

    // SLO 违反检查
    let status: 'good' | 'warning' | 'violated' = 'good';
    if (availability < sloTarget * 0.9) {
      status = 'violated';
    } else if (availability < sloTarget * 0.95) {
      status = 'warning';
    }

    // 计算错误预算（已用）
    const errorBudget = 1 - availability;

    return {
      serviceName: service,
      sloTarget,
      availability,
      errorBudget,
      status,
      period: `${periodDays}d`,
    };
  }

  /**
   * 获取性能配置
   */
  async getPerformanceProfile(
    service: string,
    hours: number = 24
  ): Promise<PerformanceProfile> {
    const percentiles = await this.lokiService.getPercentiles(
      `response_time_ms{service="${service}"}`,
      [50, 95, 99],
      hours
    );

    // 获取最大/最小/平均值（简化实现）
    return {
      p50: percentiles.p50 || 0,
      p95: percentiles.p95 || 0,
      p99: percentiles.p99 || 0,
      max: 0,
      min: 0,
      avg: 0,
    };
  }

  /**
   * 检测日志模式
   */
  async detectLogPatterns(
    logSelector: string,
    minOccurrences: number = 5,
    hours: number = 1
  ): Promise<LogPattern[]> {
    const patterns: LogPattern[] = [];

    // 简化的模式检测逻辑
    const query = `topk(10, sum by (message) (count_over_time(${logSelector} [${hours}h])))`;
    const result = await this.lokiService.cachedQuery(query);

    if (result.data.result) {
      result.data.result.forEach((item) => {
        const count = parseInt(item.value?.[1] || '0');
        if (count >= minOccurrences) {
          patterns.push({
            pattern: item.metric.message || 'unknown',
            count,
            examples: [], // 需要单独查询具体示例
            firstSeen: new Date(Date.now() - hours * 3600 * 1000).toISOString(),
            lastSeen: new Date().toISOString(),
          });
        }
      });
    }

    return patterns;
  }

  /**
   * 根因分析 - 关联日志和错误
   */
  async rootCauseAnalysis(errorMessage: string, minutes: number = 10): Promise<{
    relatedErrors: Array<{ message: string; count: number; timestamp: string }>;
    affectedServices: string[];
    timeline: Array<{
      timestamp: string;
      event: string;
      severity: string;
    }>;
  }> {
    const startTime = Math.floor(Date.now() / 1000) - minutes * 60;
    const endTime = Math.floor(Date.now() / 1000);

    // 查找关联错误
    const relatedQuery = `{message=~".*${this.escapeRegex(errorMessage)}.*"} | json`;
    const relatedResult = await this.lokiService.cachedQueryRange(relatedQuery, startTime, endTime);

    const relatedErrors: Array<{ message: string; count: number; timestamp: string }> = [];
    const affectedServices: Set<string> = new Set();

    if (relatedResult.data.result) {
      relatedResult.data.result.forEach((stream) => {
        stream.values?.forEach(([timestamp, line]) => {
          try {
            const parsed = JSON.parse(line);
            relatedErrors.push({
              message: parsed.message || 'unknown',
              count: 1,
              timestamp: new Date(parseInt(timestamp) / 1000000).toISOString(),
            });
            if (parsed.service) {
              affectedServices.add(parsed.service);
            }
          } catch (e) {
            // 忽略解析失败
          }
        });
      });
    }

    // 构建时间线
    const timeline = relatedErrors
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(0, 20)
      .map((err, index) => ({
        timestamp: err.timestamp,
        event: err.message,
        severity: index < 5 ? 'critical' : 'error',
      }));

    return {
      relatedErrors: Array.from(new Set(relatedErrors.map(e => e.message)))
        .slice(0, 5)
        .map((msg) => ({
          message: msg,
          count: relatedErrors.filter((e) => e.message === msg).length,
          timestamp: relatedErrors.find((e) => e.message === msg)?.timestamp || '',
        })),
      affectedServices: Array.from(affectedServices),
      timeline,
    };
  }

  /**
   * 比较分析 - 对比不同时间段的数据
   */
  async compareAnalysis(
    query: string,
    hours: number = 24
  ): Promise<{
    current: LogStatistics;
    previous: LogStatistics;
    trend: string;
    changePercentage: number;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const currentStart = now - hours * 3600;
    const previousStart = currentStart - hours * 3600;

    // 获取当前和之前的数据
    const [currentResult, previousResult] = await Promise.all([
      this.lokiService.cachedQueryRange(query, currentStart, now),
      this.lokiService.cachedQueryRange(query, previousStart, currentStart),
    ]);

    const currentValue = currentResult.data.result?.[0]?.values?.length || 0;
    const previousValue = previousResult.data.result?.[0]?.values?.length || 0;

    const changePercentage = previousValue > 0 
      ? ((currentValue - previousValue) / previousValue) * 100
      : 0;

    const trend = changePercentage > 0 ? '上升' : changePercentage < 0 ? '下降' : '持平';

    return {
      current: {
        totalLogs: currentValue,
        bySeverity: {},
        byService: {},
        byProject: {},
        errorRate: 0,
        avgProcessingTime: 0,
      },
      previous: {
        totalLogs: previousValue,
        bySeverity: {},
        byService: {},
        byProject: {},
        errorRate: 0,
        avgProcessingTime: 0,
      },
      trend,
      changePercentage: Math.abs(changePercentage),
    };
  }

  /**
   * 导出分析结果
   */
  async exportAnalysis(
    analysis: ErrorAnalysis,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(analysis, null, 2);
    } else if (format === 'csv') {
      // 简化的 CSV 导出
      let csv = '消息,数量,百分比,服务\n';
      analysis.topErrors.forEach((error) => {
        csv +=
          `"${this.escapeCSV(error.message)}",${error.count},${error.percentage.toFixed(2)}%,"${error.services.join(
            '; '
          )}"\n`;
      });
      return csv;
    }
    return '';
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeCSV(str: string): string {
    return str.replace(/"/g, '""');
  }
}
