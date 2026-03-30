// Loki 配置文件
export const LOKI_CONFIG = {
  // Loki 服务器地址
  url: 'http://47.242.170.56:3100',
  
  // 默认查询参数
  defaultQueryLimit: 1000,
  
  // 刷新间隔（毫秒）
  refreshInterval: 30000, // 30秒
  
  // 查询时间范围
  queryRanges: {
    errorType: 1, // 小时
    topN: 1, // 小时
    trend: 24, // 小时
    logs: 100, // 条数
  },
  
  // 告警阈值配置
  alertThresholds: {
    critical: {
      errorRate: 0.05, // 5% 错误率
      duration: 5, // 分钟
    },
    error: {
      errorCount: 50, // 错误数量
      duration: 10, // 分钟
    },
    warning: {
      warningCount: 100, // 警告数量
      duration: 15, // 分钟
    },
  },
};

// 常用的 LogQL 查询模板
export const LOGQL_TEMPLATES = {
  // 错误类型统计
  errorTypeStats: (hours: number) => 
    `sum by (error_type) (count_over_time({level=~"error|critical"} | json [${hours}h]))`,
  
  // TopN 错误
  topNErrors: (n: number, hours: number) => 
    `topk(${n}, sum by (message, level) (count_over_time({level=~"error|critical|warning"} | json [${hours}h])))`,
  
  // 错误趋势
  errorTrend: (level: string) => 
    `sum(count_over_time({level="${level}"} [1h]))`,
  
  // 错误率
  errorRate: (minutes: number) => 
    `sum(rate({level=~"error|critical"} [${minutes}m]))`,
  
  // 日志流
  logStream: () => 
    `{job=~".+"}`,
  
  // 按服务统计
  errorsByService: (hours: number) => 
    `sum by (job) (count_over_time({level=~"error|critical"} [${hours}h]))`,
  
  // 按主机统计
  errorsByHost: (hours: number) => 
    `sum by (hostname) (count_over_time({level=~"error|critical"} [${hours}h]))`,
};
