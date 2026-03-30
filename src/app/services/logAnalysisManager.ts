/**
 * ═══════════════════════════════════════════════════════════════
 * 日志分析管理器 - 整合所有服务的统一入口
 * ═══════════════════════════════════════════════════════════════
 */

import { LokiService } from './lokiService';
import { AdvancedLokiService } from './advancedLokiService';
import { EnhancedLogAnalyzer } from './enhancedLogAnalyzer';
import { GrafanaService, GrafanaConfig } from './grafanaService';

export interface LogAnalysisManagerConfig {
  lokiUrl: string;
  lokiDefaultLimit?: number;
  grafanaUrl?: string;
  grafanaApiKey?: string;
  grafanaOrgId?: number;
  defaultTimeRange?: number; // 小时
  enableCache?: boolean;
  cacheExpirationMs?: number;
}

export interface AnalysisReport {
  timestamp: string;
  period: string;
  summary: {
    totalLogs: number;
    totalErrors: number;
    errorRate: number;
    affectedServices: number;
  };
  topErrors: Array<{
    message: string;
    count: number;
    percentage: number;
  }>;
  serviceHealth: Array<{
    service: string;
    status: 'healthy' | 'degraded' | 'critical';
    errorRate: number;
  }>;
  recommendations: string[];
}

/**
 * 日志分析管理器 - 统一入口
 */
export class LogAnalysisManager {
  private lokiService: LokiService;
  private advancedLokiService: AdvancedLokiService;
  private analyzers: EnhancedLogAnalyzer;
  private grafanaService?: GrafanaService;
  private config: LogAnalysisManagerConfig;

  constructor(config: LogAnalysisManagerConfig) {
    this.config = config;

    // 初始化 Loki 服务
    this.lokiService = new LokiService({
      url: config.lokiUrl,
      defaultQueryLimit: config.lokiDefaultLimit || 1000,
    });

    // 初始化高级 Loki 服务
    this.advancedLokiService = new AdvancedLokiService(
      this.lokiService,
      config.cacheExpirationMs || 300000
    );

    // 初始化日志分析器
    this.analyzers = new EnhancedLogAnalyzer(this.advancedLokiService);

    // 如果配置了 Grafana，初始化 Grafana 服务
    if (config.grafanaUrl && config.grafanaApiKey) {
      this.grafanaService = new GrafanaService(
        {
          url: config.grafanaUrl,
          apiKey: config.grafanaApiKey,
          orgId: config.grafanaOrgId,
        },
        this.advancedLokiService
      );
    }
  }

  /**
   * 生成完整分析报告
   */
  async generateAnalysisReport(
    hours: number = this.config.defaultTimeRange || 24
  ): Promise<AnalysisReport> {
    try {
      const stats = await this.advancedLokiService.getCompleteStatistics(hours);
      const errorAnalysis = await this.analyzers.generateErrorAnalysis(hours);

      // 收集服务健康状态
      const services = Object.keys(stats.byService);
      const serviceHealthReports = await Promise.all(
        services.map((service) =>
          this.analyzers.generateServiceHealthReport(service)
        )
      );

      // 生成建议
      const recommendations: string[] = [];
      serviceHealthReports.forEach((report) => {
        if (report.status === 'critical') {
          recommendations.push(`⚠️ 【严重】${report.service} 服务状态异常`);
        }
      });

      if (stats.errorRate > 0.1) {
        recommendations.push('⚠️ 系统错误率过高，建议立即排查');
      }

      if (stats.avgProcessingTime > 5000) {
        recommendations.push('⏱️ 系统响应时间较长，考虑性能优化');
      }

      if (errorAnalysis.topErrors.length > 0) {
        recommendations.push(
          `📊 检测到 ${errorAnalysis.topErrors.length} 类高频错误`
        );
      }

      return {
        timestamp: new Date().toISOString(),
        period: `${hours}h`,
        summary: {
          totalLogs: stats.totalLogs,
          totalErrors: errorAnalysis.totalErrors,
          errorRate: stats.errorRate,
          affectedServices: services.length,
        },
        topErrors: errorAnalysis.topErrors.slice(0, 5),
        serviceHealth: serviceHealthReports
          .filter((r) => r.status !== 'healthy')
          .map((r) => ({
            service: r.service,
            status: r.status,
            errorRate: r.errorRate,
          })),
        recommendations,
      };
    } catch (error) {
      console.error('生成分析报告失败:', error);
      throw error;
    }
  }

  /**
   * 执行在线分析并推送到 Grafana
   */
  async analyzeAndPushToGrafana(
    dashboardTitle: string = '日志分析仪表盘'
  ): Promise<{ dashboardId: number; dashboardUid: string }> {
    if (!this.grafanaService) {
      throw new Error('Grafana 服务未配置');
    }

    // 创建仪表盘
    const dashboardResult = await this.grafanaService.generateLogAnalyticsDashboard(
      dashboardTitle
    );

    // 创建告警规则
    const alertRules = this.grafanaService.generateAlertRules();
    for (const rule of alertRules) {
      try {
        await this.grafanaService.createAlertRule(rule);
      } catch (error) {
        console.warn('创建告警规则失败:', error);
      }
    }

    return dashboardResult;
  }

  /**
   * 离线分析 - 生成完整报告文件
   */
  async offlineAnalysis(hours: number = 24, format: 'json' | 'csv' = 'json'): Promise<string> {
    const report = await this.generateAnalysisReport(hours);
    const errorAnalysis = await this.analyzers.generateErrorAnalysis(hours);
    const exportData = await this.analyzers.exportAnalysis(errorAnalysis, format);

    if (format === 'json') {
      return JSON.stringify({ report, errors: JSON.parse(exportData) }, null, 2);
    }

    return exportData;
  }

  /**
   * 实时监控循环
   */
  startRealTimeMonitoring(
    intervalSeconds: number = 60,
    onUpdate?: (report: AnalysisReport) => void
  ): () => void {
    const intervalId = setInterval(async () => {
      try {
        const report = await this.generateAnalysisReport();
        onUpdate?.(report);
      } catch (error) {
        console.error('实时监控失败:', error);
      }
    }, intervalSeconds * 1000);

    // 返回停止函数
    return () => clearInterval(intervalId);
  }

  /**
   * 获取查询性能指标
   */
  getPerformanceMetrics() {
    return this.advancedLokiService.getMetrics();
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.advancedLokiService.clearCache();
  }

  /**
   * 检测异常
   */
  async detectAnomalies(
    query: string,
    threshold: number,
    hours: number = 24
  ): Promise<any[]> {
    return this.advancedLokiService.detectAnomalies(query, threshold, hours);
  }

  /**
   * 根因分析
   */
  async rootCauseAnalysis(errorMessage: string, minutes: number = 10): Promise<any> {
    return this.analyzers.rootCauseAnalysis(errorMessage, minutes);
  }

  /**
   * 生成 SLO 报告
   */
  async generateSLOReport(options: {
    topN?: number;
    includeInactive?: boolean;
    sloTarget?: number;
    periodDays?: number;
  } = {}): Promise<{
    timestamp: string;
    period: string;
    totalServices: number;
    activeServices: number;
    sloResults: Array<{
      serviceName: string;
      sloTarget: number;
      availability: number;
      errorBudget: number;
      status: 'good' | 'warning' | 'violated';
      hasRecentLogs: boolean;
    }>;
    summary: {
      good: number;
      warning: number;
      violated: number;
      avgAvailability: number;
    };
  }> {
    const {
      topN,
      includeInactive = false,
      sloTarget = 0.999,
      periodDays = 30
    } = options;

    // 获取服务列表
    const allServices = await this.advancedLokiService.getAllServices();
    const activeServices = await this.advancedLokiService.getActiveServices(periodDays * 24);

    // 确定要分析的服务列表
    let targetServices: string[];
    if (includeInactive) {
      targetServices = allServices;
    } else {
      targetServices = activeServices;
    }

    // 如果指定了 topN，先按错误率排序
    if (topN && topN < targetServices.length) {
      const stats = await this.advancedLokiService.getCompleteStatistics(periodDays * 24);
      const serviceErrorRates = targetServices.map(service => ({
        service,
        errorRate: stats.byService[service] ? 
          (stats.byService[service] / stats.totalLogs) : 0,
        hasRecentLogs: activeServices.includes(service)
      }));

      // 按错误率降序排序，取前 topN
      serviceErrorRates.sort((a, b) => b.errorRate - a.errorRate);
      targetServices = serviceErrorRates.slice(0, topN).map(s => s.service);
    }

    // 计算 SLO
    const sloPromises = targetServices.map(async (service) => {
      try {
        const sloMetrics = await this.analyzers.calculateSLO(service, sloTarget, periodDays);
        return {
          ...sloMetrics,
          hasRecentLogs: activeServices.includes(service)
        };
      } catch (error) {
        console.warn(`计算 ${service} SLO 失败:`, error);
        return {
          serviceName: service,
          sloTarget,
          availability: 0,
          errorBudget: 1,
          status: 'violated' as const,
          hasRecentLogs: activeServices.includes(service)
        };
      }
    });

    const sloResults = await Promise.all(sloPromises);

    // 计算汇总统计
    const summary = {
      good: sloResults.filter(r => r.status === 'good').length,
      warning: sloResults.filter(r => r.status === 'warning').length,
      violated: sloResults.filter(r => r.status === 'violated').length,
      avgAvailability: sloResults.reduce((sum, r) => sum + r.availability, 0) / sloResults.length
    };

    return {
      timestamp: new Date().toISOString(),
      period: `${periodDays}d`,
      totalServices: allServices.length,
      activeServices: activeServices.length,
      sloResults,
      summary
    };
  }
  }

  /**
   * 获取高级 Loki 服务（高级用户）
   */
  getAdvancedLokiService(): AdvancedLokiService {
    return this.advancedLokiService;
  }

  /**
   * 获取日志分析器（高级用户）
   */
  getAnalyzer(): EnhancedLogAnalyzer {
    return this.analyzers;
  }

  /**
   * 获取 Grafana 服务（高级用户）
   */
  getGrafanaService(): GrafanaService | undefined {
    return this.grafanaService;
  }
}

/**
 * 创建单例管理器
 */
let instance: LogAnalysisManager;

export function initializeLogAnalysisManager(
  config: LogAnalysisManagerConfig
): LogAnalysisManager {
  instance = new LogAnalysisManager(config);
  return instance;
}

export function getLogAnalysisManager(): LogAnalysisManager {
  if (!instance) {
    throw new Error('LogAnalysisManager 未初始化，请先调用 initializeLogAnalysisManager');
  }
  return instance;
}
