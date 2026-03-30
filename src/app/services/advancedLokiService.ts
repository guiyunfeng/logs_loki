/**
 * ═══════════════════════════════════════════════════════════════
 * 高级 Loki 服务 - 增强版查询和聚合能力
 * ═══════════════════════════════════════════════════════════════
 */

import { LokiService, LokiQueryResult, LokiStreamResult } from './lokiService';

export interface QueryMetrics {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  avgResponseTime: number;
}

export interface AggregationResult {
  buckets: Array<{
    key: string;
    count: number;
    percentage: number;
  }>;
  total: number;
}

export interface TimeSeriesAggregation {
  timestamp: number;
  value: number;
  aggregationType: 'sum' | 'avg' | 'max' | 'min' | 'count';
}

export interface LogStatistics {
  totalLogs: number;
  bySeverity: Record<string, number>;
  byService: Record<string, number>;
  byProject: Record<string, number>;
  errorRate: number;
  avgProcessingTime: number;
}

/**
 * 高级 Loki 服务
 * - 支持复杂 LogQL 查询
 * - 添加查询缓存
 * - 支持批量查询
 * - 提供高级聚合功能
 */
export class AdvancedLokiService {
  private lokiService: LokiService;
  private queryCache: Map<string, { result: any; timestamp: number }> = new Map();
  private cacheExpirationMs: number = 300000; // 5分钟缓存
  private metrics: QueryMetrics = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgResponseTime: 0,
  };

  constructor(lokiService: LokiService, cacheExpirationMs?: number) {
    this.lokiService = lokiService;
    if (cacheExpirationMs) this.cacheExpirationMs = cacheExpirationMs;
  }

  /**
   * 执行缓存查询
   */
  async cachedQuery(query: string, time?: number): Promise<LokiQueryResult> {
    const cacheKey = `${query}:${time}`;
    const cached = this.queryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpirationMs) {
      this.metrics.cacheHits++;
      return cached.result;
    }

    this.metrics.cacheMisses++;
    const startTime = performance.now();
    const result = await this.lokiService.query(query, time);
    const responseTime = performance.now() - startTime;

    // 更新平均响应时间
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * this.metrics.totalQueries + responseTime) /
      (this.metrics.totalQueries + 1);
    this.metrics.totalQueries++;

    this.queryCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  /**
   * 执行缓存范围查询
   */
  async cachedQueryRange(
    query: string,
    start: number,
    end: number,
    step?: number
  ): Promise<LokiQueryResult> {
    const cacheKey = `${query}:${start}:${end}:${step}`;
    const cached = this.queryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpirationMs) {
      this.metrics.cacheHits++;
      return cached.result;
    }

    this.metrics.cacheMisses++;
    const startTime = performance.now();
    const result = await this.lokiService.queryRange(query, start, end, step);
    const responseTime = performance.now() - startTime;

    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * this.metrics.totalQueries + responseTime) /
      (this.metrics.totalQueries + 1);
    this.metrics.totalQueries++;

    this.queryCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * 获取所有服务列表（从标签获取）
   */
  async getAllServices(): Promise<string[]> {
    try {
      return await this.lokiService.getLabelValues('service');
    } catch (error) {
      console.warn('无法从标签获取服务列表，回退到统计数据:', error);
      // 回退方案：从最近24小时的统计数据获取
      const stats = await this.getCompleteStatistics(24);
      return Object.keys(stats.byService);
    }
  }

  /**
   * 获取活跃服务列表（有日志数据的服务）
   */
  async getActiveServices(hours: number = 24): Promise<string[]> {
    const stats = await this.getCompleteStatistics(hours);
    return Object.keys(stats.byService);
  }

  /**
   * 按标签聚合统计
   * @param logSelector 日志选择器，如 {level="error"}
   * @param labelName 聚合标签名，如 "service"
   * @param hours 查询时间范围（小时）
   */
  async aggregateByLabel(
    logSelector: string,
    labelName: string,
    hours: number = 1
  ): Promise<AggregationResult> {
    const query = `sum by (${labelName}) (count_over_time(${logSelector} [${hours}h]))`;
    const result = await this.cachedQuery(query);

    if (!result.data.result.length) {
      return { buckets: [], total: 0 };
    }

    let total = 0;
    const buckets = result.data.result.map((item) => {
      const count = parseInt(item.value?.[1] || '0');
      total += count;
      return { key: item.metric[labelName] || 'unknown', count, percentage: 0 };
    });

    // 计算百分比
    buckets.forEach((b) => {
      b.percentage = total > 0 ? (b.count / total) * 100 : 0;
    });

    return {
      buckets: buckets.sort((a, b) => b.count - a.count),
      total,
    };
  }

  /**
   * 获取多维度统计
   */
  async getMultiDimensionStats(
    logSelector: string,
    dimensions: string[],
    hours: number = 1
  ): Promise<Record<string, AggregationResult>> {
    const results: Record<string, AggregationResult> = {};

    const promises = dimensions.map((dim) =>
      this.aggregateByLabel(logSelector, dim, hours).then((result) => {
        results[dim] = result;
      })
    );

    await Promise.all(promises);
    return results;
  }

  /**
   * 计算比率（如错误率）
   */
  async calculateRatio(
    numeratorSelector: string,
    denominatorSelector: string,
    hours: number = 1
  ): Promise<number> {
    const [numeratorResult, denominatorResult] = await Promise.all([
      this.cachedQuery(`sum(count_over_time(${numeratorSelector} [${hours}h]))`),
      this.cachedQuery(`sum(count_over_time(${denominatorSelector} [${hours}h]))`),
    ]);

    const numerator = parseInt(numeratorResult.data.result?.[0]?.value?.[1] || '0');
    const denominator = parseInt(denominatorResult.data.result?.[0]?.value?.[1] || '1');

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * 获取百分位数（用于性能分析）
   */
  async getPercentiles(
    query: string,
    percentiles: number[] = [50, 95, 99],
    hours: number = 1
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    const queryPromises = percentiles.map((p) => {
      const pQuery = `histogram_quantile(0.${p}, sum(rate(${query}[${hours}h])))`;
      return this.cachedQuery(pQuery).then((res) => {
        const value = parseFloat(res.data.result?.[0]?.value?.[1] || '0');
        result[`p${p}`] = value;
      });
    });

    await Promise.all(queryPromises);
    return result;
  }

  /**
   * 批量查询
   */
  async batchQuery(queries: string[]): Promise<LokiQueryResult[]> {
    const promises = queries.map((q) => this.cachedQuery(q));
    return Promise.all(promises);
  }

  /**
   * 获取完整统计数据
   */
  async getCompleteStatistics(hours: number = 24): Promise<LogStatistics> {
    const [severity, service, project, errorRate, avgTime] = await Promise.all([
      this.aggregateByLabel('{level!=""}', 'level', hours),
      this.aggregateByLabel('{service!=""}', 'service', hours),
      this.aggregateByLabel('{project!=""}', 'project', hours),
      this.calculateRatio('{level=~"error|critical"}', '{level!=""}', hours),
      this.cachedQuery(`avg(response_time_ms{level!=""} [${hours}h])`),
    ]);

    const severityMap: Record<string, number> = {};
    severity.buckets.forEach((b) => {
      severityMap[b.key] = b.count;
    });

    const serviceMap: Record<string, number> = {};
    service.buckets.forEach((b) => {
      serviceMap[b.key] = b.count;
    });

    const projectMap: Record<string, number> = {};
    project.buckets.forEach((b) => {
      projectMap[b.key] = b.count;
    });

    const avgTimeValue = parseFloat(avgTime.data.result?.[0]?.value?.[1] || '0');

    return {
      totalLogs: severity.total,
      bySeverity: severityMap,
      byService: serviceMap,
      byProject: projectMap,
      errorRate,
      avgProcessingTime: avgTimeValue,
    };
  }

  /**
   * 时间序列聚合
   */
  async timeSeriesAggregation(
    query: string,
    start: number,
    end: number,
    step: number = 300, // 5分钟
    aggregationType: 'sum' | 'avg' | 'max' | 'min' | 'count' = 'sum'
  ): Promise<TimeSeriesAggregation[]> {
    const result = await this.cachedQueryRange(query, start, end, step);

    if (!result.data.result.length) {
      return [];
    }

    const timeSeries: TimeSeriesAggregation[] = [];
    result.data.result[0].values?.forEach(([timestamp, value]) => {
      timeSeries.push({
        timestamp: parseInt(timestamp.toString()) / 1000000, // 纳秒转毫秒
        value: parseFloat(value),
        aggregationType,
      });
    });

    return timeSeries;
  }

  /**
   * 获取异常值检测（超过阈值的数据点）
   */
  async detectAnomalies(
    query: string,
    threshold: number,
    hours: number = 24,
    step: number = 300
  ): Promise<TimeSeriesAggregation[]> {
    const timeSeries = await this.timeSeriesAggregation(
      query,
      Math.floor(Date.now() / 1000) - hours * 3600,
      Math.floor(Date.now() / 1000),
      step
    );

    // 简单的异常点检测：超过阈值的数据点
    return timeSeries.filter((point) => point.value > threshold);
  }
}
