/**
 * 模拟日志数据 - 用于统计分析展示
 */

export interface LogEntry {
  id: string;
  timestamp: string;
  server: string;
  hostname: string;
  project: string;
  service: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  errorCategory?: string;
  errorCode?: string;
  region?: string;
  cloud?: string;
}

// 模拟最近 7 天的日志数据
export function generateMockLogs(count: number = 500): LogEntry[] {
  const logs: LogEntry[] = [];
  const now = new Date();
  
  const servers = [
    { ip: '10.0.1.10', hostname: 'sh-ali-web-01', region: '华东-上海', cloud: '阿里云' },
    { ip: '10.0.1.11', hostname: 'sh-ali-web-02', region: '华东-上海', cloud: '阿里云' },
    { ip: '10.0.2.10', hostname: 'bj-tx-api-01', region: '华北-北京', cloud: '腾讯云' },
    { ip: '10.0.2.11', hostname: 'bj-tx-api-02', region: '华北-北京', cloud: '腾讯云' },
    { ip: '10.0.3.10', hostname: 'idc-db-01', region: '华东-杭州', cloud: '自建机房' },
    { ip: '10.0.3.11', hostname: 'idc-db-02', region: '华东-杭州', cloud: '自建机房' },
  ];
  
  const projects = ['ai_gateway', 'ai_chat', 'ai_recommend', 'data_platform', 'user_center', 'pay_core'];
  const services = ['nginx', 'php-fpm', 'go-api', 'python-worker', 'mysql', 'redis', 'cpp-engine'];
  
  const severities: Array<'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO'> = ['CRITICAL', 'ERROR', 'WARNING', 'INFO'];
  const severityWeights = [0.05, 0.15, 0.30, 0.50];
  
  const errorMessages = [
    { msg: 'Database connection timeout', category: 'database', code: 'TIMEOUT' },
    { msg: 'Upstream server timeout', category: 'upstream', code: 'TIMEOUT' },
    { msg: 'Too many open files', category: 'system', code: 'RESOURCE' },
    { msg: 'Out of memory', category: 'system', code: 'OOM' },
    { msg: 'Slow query detected (3.5s)', category: 'database', code: 'SLOW_QUERY' },
    { msg: 'Redis connection refused', category: 'cache', code: 'CONNECTION' },
    { msg: 'HTTP 500 Internal Server Error', category: 'business', code: 'HTTP_500' },
    { msg: 'Invalid JSON payload', category: 'validation', code: 'PARSE_ERROR' },
    { msg: 'Authentication failed', category: 'security', code: 'AUTH_FAILED' },
    { msg: 'Rate limit exceeded', category: 'business', code: 'RATE_LIMIT' },
    { msg: 'Disk space low (90% used)', category: 'system', code: 'DISK_SPACE' },
    { msg: 'Network connection reset', category: 'network', code: 'RESET' },
  ];
  
  const infoMessages = [
    'Service started successfully',
    'Configuration reloaded',
    'Cache warmed up',
    'Health check passed',
    'Request processed successfully',
  ];
  
  for (let i = 0; i < count; i++) {
    const hoursAgo = Math.random() * 168; // 7 天
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    
    const server = servers[Math.floor(Math.random() * servers.length)];
    const project = projects[Math.floor(Math.random() * projects.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    
    const random = Math.random();
    let severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
    let cumulativeWeight = 0;
    for (let j = 0; j < severities.length; j++) {
      cumulativeWeight += severityWeights[j];
      if (random <= cumulativeWeight) {
        severity = severities[j];
        break;
      }
    }
    severity = severity!;
    
    let message: string;
    let errorCategory: string | undefined;
    let errorCode: string | undefined;
    
    if (severity === 'INFO') {
      message = infoMessages[Math.floor(Math.random() * infoMessages.length)];
    } else {
      const error = errorMessages[Math.floor(Math.random() * errorMessages.length)];
      message = error.msg;
      errorCategory = error.category;
      errorCode = error.code;
    }
    
    logs.push({
      id: `log-${i}-${Date.now()}`,
      timestamp: timestamp.toISOString(),
      server: server.ip,
      hostname: server.hostname,
      project,
      service,
      severity,
      message,
      errorCategory,
      errorCode,
      region: server.region,
      cloud: server.cloud,
    });
  }
  
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// 生成时序数据（数组方式，避免 recharts key 冲突）
export function generateTimeSeriesData(logs: LogEntry[], timeRangeMinutes: number = 1440) {
  const nowMs = Date.now();

  let bucketCount: number;
  let bucketSizeMs: number;

  if (timeRangeMinutes <= 30) {
    bucketCount = timeRangeMinutes;
    bucketSizeMs = 60 * 1000;
  } else if (timeRangeMinutes <= 60) {
    bucketCount = 12;
    bucketSizeMs = 5 * 60 * 1000;
  } else if (timeRangeMinutes <= 720) {
    bucketCount = Math.ceil(timeRangeMinutes / 15);
    bucketSizeMs = 15 * 60 * 1000;
  } else if (timeRangeMinutes <= 1440) {
    bucketCount = 24;
    bucketSizeMs = 60 * 60 * 1000;
  } else if (timeRangeMinutes <= 4320) {
    bucketCount = Math.ceil(timeRangeMinutes / 240);
    bucketSizeMs = 4 * 60 * 60 * 1000;
  } else {
    bucketCount = 14;
    bucketSizeMs = 12 * 60 * 60 * 1000;
  }

  // 构造桶数组，每个桶有明确的起止时间
  const bucketArr: Array<{
    start: number;
    end: number;
    time: string;
    CRITICAL: number;
    ERROR: number;
    WARNING: number;
    INFO: number;
  }> = [];

  for (let idx = 0; idx < bucketCount; idx++) {
    // idx=0 是最早的桶，idx=bucketCount-1 是最新的
    const offsetFromNow = (bucketCount - 1 - idx) * bucketSizeMs;
    const start = nowMs - offsetFromNow;
    const end = start + bucketSizeMs;
    const t = new Date(start);

    const mm = (t.getMonth() + 1).toString().padStart(2, '0');
    const dd = t.getDate().toString().padStart(2, '0');
    const hh = t.getHours().toString().padStart(2, '0');
    const mi = t.getMinutes().toString().padStart(2, '0');

    const label = timeRangeMinutes <= 1440
      ? `${hh}:${mi}`
      : `${mm}/${dd} ${hh}:${mi}`;

    bucketArr.push({ start, end, time: label, CRITICAL: 0, ERROR: 0, WARNING: 0, INFO: 0 });
  }

  // 归入桶（用二分查找加速）
  const rangeStart = bucketArr[0].start;
  logs.forEach(log => {
    const logMs = new Date(log.timestamp).getTime();
    if (logMs < rangeStart || logMs >= bucketArr[bucketArr.length - 1].end) return;
    const idx = Math.floor((logMs - rangeStart) / bucketSizeMs);
    if (idx >= 0 && idx < bucketArr.length) {
      bucketArr[idx][log.severity]++;
    }
  });

  return bucketArr.map(({ start, end, ...rest }) => rest);
}

// 按维度聚合统计
export function aggregateByDimension(logs: LogEntry[], dimension: 'project' | 'server' | 'service' | 'severity' | 'errorCategory') {
  const stats: Record<string, { name: string; total: number; CRITICAL: number; ERROR: number; WARNING: number; INFO: number }> = {};
  
  logs.forEach(log => {
    const key = log[dimension] || 'unknown';
    if (!stats[key]) {
      stats[key] = { name: key, total: 0, CRITICAL: 0, ERROR: 0, WARNING: 0, INFO: 0 };
    }
    stats[key].total++;
    stats[key][log.severity]++;
  });
  
  return Object.values(stats).sort((a, b) => b.total - a.total);
}

// 按项目聚合，展示每个项目下各服务的错误数（仅 ERROR+CRITICAL）
export function getProjectServiceErrorBreakdown(logs: LogEntry[]) {
  const errorLogs = logs.filter(l => l.severity === 'ERROR' || l.severity === 'CRITICAL');
  
  const allServices = [...new Set(errorLogs.map(l => l.service))].sort();
  
  const projectMap: Record<string, Record<string, number>> = {};
  errorLogs.forEach(log => {
    if (!projectMap[log.project]) {
      projectMap[log.project] = {};
    }
    projectMap[log.project][log.service] = (projectMap[log.project][log.service] || 0) + 1;
  });
  
  const data = Object.entries(projectMap).map(([project, services]) => {
    const row: Record<string, string | number> = { project };
    let total = 0;
    allServices.forEach(svc => {
      row[svc] = services[svc] || 0;
      total += services[svc] || 0;
    });
    row._total = total;
    return row;
  }).sort((a, b) => (b._total as number) - (a._total as number));
  
  return { data, services: allServices };
}

// Top N 错误消息
export function getTopErrors(logs: LogEntry[], topN: number = 10) {
  const errorLogs = logs.filter(log => log.severity === 'ERROR' || log.severity === 'CRITICAL');
  const messageCount: Record<string, { message: string; count: number; severity: string; category?: string }> = {};
  
  errorLogs.forEach(log => {
    if (!messageCount[log.message]) {
      messageCount[log.message] = {
        message: log.message,
        count: 0,
        severity: log.severity,
        category: log.errorCategory,
      };
    }
    messageCount[log.message].count++;
  });
  
  return Object.values(messageCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

// 获取统计概览
export function getLogStatistics(logs: LogEntry[]) {
  const total = logs.length;
  const critical = logs.filter(l => l.severity === 'CRITICAL').length;
  const error = logs.filter(l => l.severity === 'ERROR').length;
  const warning = logs.filter(l => l.severity === 'WARNING').length;
  const info = logs.filter(l => l.severity === 'INFO').length;
  
  const now = new Date();
  const halfTime = now.getTime() - 12 * 60 * 60 * 1000;
  const recentLogs = logs.filter(l => new Date(l.timestamp).getTime() > halfTime);
  const olderLogs = logs.filter(l => new Date(l.timestamp).getTime() <= halfTime);
  
  const recentErrors = recentLogs.filter(l => l.severity === 'ERROR' || l.severity === 'CRITICAL').length;
  const olderErrors = olderLogs.filter(l => l.severity === 'ERROR' || l.severity === 'CRITICAL').length;
  
  const errorGrowthRate = olderErrors > 0 ? ((recentErrors - olderErrors) / olderErrors) * 100 : 0;
  
  return {
    total,
    critical,
    error,
    warning,
    info,
    errorRate: total > 0 ? ((error + critical) / total) * 100 : 0,
    errorGrowthRate: Math.round(errorGrowthRate * 10) / 10,
  };
}
