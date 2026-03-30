# 📋 Loki 日志聚合统计分析 - 完整实现指南

## 🎯 项目优化概览

本优化方案将你的日志系统从基础的日志展示升级为**完整的日志聚合、统计、分析和告警系统**。

### ✨ 核心改进

| 功能模块 | 说明 | 文件位置 |
|---------|------|---------|
| **高级 Loki 查询服务** | 支持缓存、批量查询、复杂聚合 | `advancedLokiService.ts` |
| **Grafana 集成** | 自动创建仪表盘、告警规则、通知渠道 | `grafanaService.ts` |
| **增强分析器** | 根因分析、SLO 计算、异常检测 | `enhancedLogAnalyzer.ts` |
| **统一管理器** | 一键启动在线/离线分析 | `logAnalysisManager.ts` |

---

## 🚀 快速开始

### 1. 初始化管理器

```typescript
import { initializeLogAnalysisManager } from './services/logAnalysisManager';

// 初始化 - 仅 Loki
const manager = initializeLogAnalysisManager({
  lokiUrl: 'http://47.242.170.56:3100',
  lokiDefaultLimit: 1000,
  defaultTimeRange: 24,
  enableCache: true,
  cacheExpirationMs: 300000, // 5分钟
});

// 或者 - 包含 Grafana
const manager = initializeLogAnalysisManager({
  lokiUrl: 'http://47.242.170.56:3100',
  grafanaUrl: 'http://localhost:3000',
  grafanaApiKey: 'your-api-key',
  grafanaOrgId: 1,
  defaultTimeRange: 24,
  enableCache: true,
});
```

### 2. 生成分析报告

```typescript
// 获取完整分析报告
const report = await manager.generateAnalysisReport(24); // 24小时
console.log(report);

/* 输出示例：
{
  timestamp: "2024-03-27T10:00:00Z",
  period: "24h",
  summary: {
    totalLogs: 45320,
    totalErrors: 1240,
    errorRate: 0.0273,  // 2.73%
    affectedServices: 8
  },
  topErrors: [
    { message: "Connection timeout", count: 450, percentage: 36.3 },
    { message: "Database error", count: 320, percentage: 25.8 },
    ...
  ],
  serviceHealth: [
    { service: "api-gateway", status: "critical", errorRate: 0.15 },
    { service: "user-service", status: "degraded", errorRate: 0.08 }
  ],
  recommendations: [
    "⚠️ 【严重】api-gateway 服务状态异常",
    "📊 检测到 12 类高频错误"
  ]
}
*/
```

### 3. 推送到 Grafana

```typescript
// 自动创建仪表盘和告警规则
const { dashboardId, dashboardUid } = await manager.analyzeAndPushToGrafana(
  '生产环境日志分析'
);

console.log(`✅ 仪表盘已创建: ID=${dashboardId}, UID=${dashboardUid}`);
// 访问: http://localhost:3000/d/{dashboardUid}
```

### 4. 启动实时监控

```typescript
// 每30秒更新一次分析报告
const stopMonitoring = manager.startRealTimeMonitoring(30, (report) => {
  console.log(`[${report.timestamp}] 总日志: ${report.summary.totalLogs}`);
  
  // 当发现严重问题时发送告警
  if (report.summary.errorRate > 0.1) {
    sendAlertNotification('⚠️ 错误率突增至 ' + 
      (report.summary.errorRate * 100).toFixed(2) + '%');
  }
});

// 停止监控
stopMonitoring();
```

---

## 📊 详细功能说明

### A. 高级 Loki 查询服务 (`AdvancedLokiService`)

#### 支持的查询功能

```typescript
const advancedLoki = manager.getAdvancedLokiService();

// 1️⃣ 缓存查询（自动5分钟缓存）
const result = await advancedLoki.cachedQuery(
  'sum(count_over_time({level="error"} [1h]))'
);

// 2️⃣ 按标签聚合
const stats = await advancedLoki.aggregateByLabel(
  '{service="api-gateway"}',
  'level',      // 按严重级别聚合
  1             // 查询1小时数据
);

// 3️⃣ 多维度统计
const multiStats = await advancedLoki.getMultiDimensionStats(
  '{level=~"error|critical"}',
  ['service', 'project', 'server'], // 多个维度
  24
);

// 4️⃣ 计算比率（如错误率）
const errorRate = await advancedLoki.calculateRatio(
  '{level=~"error|critical"}',  // 分子：错误/关键日志
  '{level!=""}',                // 分母：所有日志
  1                             // 1小时内
);

// 5️⃣ 获取百分位数（性能分析）
const percentiles = await advancedLoki.getPercentiles(
  'response_time_ms',
  [50, 95, 99],  // p50, p95, p99
  24
);

// 6️⃣ 批量查询
const results = await advancedLoki.batchQuery([
  'sum(count_over_time({level="critical"} [1h]))',
  'sum(count_over_time({level="error"} [1h]))',
  'sum(count_over_time({level="warning"} [1h]))',
]);

// 7️⃣ 获取完整统计
const stats = await advancedLoki.getCompleteStatistics(24);
/* {
  totalLogs: 45320,
  bySeverity: { CRITICAL: 120, ERROR: 1240, WARNING: 5000, ... },
  byService: { "api-gateway": 12000, "user-service": 8000, ... },
  byProject: { "project-a": 25000, "project-b": 20320 },
  errorRate: 0.0273,
  avgProcessingTime: 1850.5
} */

// 8️⃣ 异常检测
const anomalies = await advancedLoki.detectAnomalies(
  'error_count',
  threshold = 100,  // 超过100为异常
  hours = 24
);
```

### B. 增强日志分析器 (`EnhancedLogAnalyzer`)

#### 深度分析功能

```typescript
const analyzer = manager.getAnalyzer();

// 1️⃣ 完整错误分析报告
const errorAnalysis = await analyzer.generateErrorAnalysis(24);
/* {
  topErrors: [
    {
      message: "Connection timeout",
      count: 450,
      percentage: 36.3,
      services: ["api-gateway", "user-service"],
      firstSeen: "2024-03-26T10:00:00Z",
      lastSeen: "2024-03-27T09:59:00Z"
    },
    ...
  ],
  errorTrend: [
    { timestamp: "2024-03-26T10:00:00Z", critical: 5, error: 120, warning: 500 },
    ...
  ],
  affectedServices: {
    "api-gateway": 450,
    "user-service": 380,
    ...
  },
  totalErrors: 1240
} */

// 2️⃣ 服务健康报告
const healthReport = await analyzer.generateServiceHealthReport('api-gateway');
/* {
  service: "api-gateway",
  status: "critical",  // 健康 | 降级 | 严重
  errorRate: 0.15,
  avgResponseTime: 2500,
  totalLogs: 8000,
  recommendations: [
    "错误率达到 15%，需要立即处理",
    "检查最近的代码部署",
    "查看实时日志排查问题根因"
  ]
} */

// 3️⃣ 计算 SLO 指标
const sloMetrics = await analyzer.calculateSLO(
  'api-gateway',
  sloTarget = 0.999,    // 99.9% SLO
  periodDays = 30       // 30天周期
);
/* {
  serviceName: "api-gateway",
  sloTarget: 0.999,
  availability: 0.9985,    // 99.85%
  status: "good",          // good | warning | violated
  errorBudget: 0.0015,     // 错误预算已用 0.15%
  period: "30d"
} */

// 4️⃣ 性能配置分析
const perfProfile = await analyzer.getPerformanceProfile('api-gateway', 24);
/* {
  p50: 850,    // 50%的请求在850ms内完成
  p95: 2100,   // 95%的请求在2.1s内完成
  p99: 4500,   // 99%的请求在4.5s内完成
  max: 15000,
  min: 100,
  avg: 1850.5
} */

// 5️⃣ 检测日志模式
const patterns = await analyzer.detectLogPatterns(
  '{level=~"error|critical"}',
  minOccurrences = 5,
  hours = 1
);
/* [
  {
    pattern: "Connection timeout",
    count: 450,
    examples: ["Connection timeout from 192.168.1.1", ...],
    firstSeen: "2024-03-27T08:00:00Z",
    lastSeen: "2024-03-27T09:59:00Z"
  },
  ...
] */

// 6️⃣ 根因分析
const rootCause = await analyzer.rootCauseAnalysis(
  'Connection timeout',
  minutes = 10
);
/* {
  relatedErrors: [
    { message: "Connection timeout", count: 45, timestamp: "..." },
    { message: "Network unreachable", count: 12, timestamp: "..." }
  ],
  affectedServices: ["api-gateway", "user-service"],
  timeline: [
    { timestamp: "2024-03-27T09:45:00Z", event: "...", severity: "critical" },
    { timestamp: "2024-03-27T09:46:00Z", event: "...", severity: "error" }
  ]
} */

// 7️⃣ 对比分析 - 对比不同时间段
const comparison = await analyzer.compareAnalysis(
  '{level=~"error|critical"}',
  hours = 24
);
/* {
  current: { totalLogs: 1240, ... },
  previous: { totalLogs: 890, ... },
  trend: "上升",
  changePercentage: 39.3  // 上升39.3%
} */

// 8️⃣ 导出分析结果
const jsonExport = await analyzer.exportAnalysis(errorAnalysis, 'json');
const csvExport = await analyzer.exportAnalysis(errorAnalysis, 'csv');
```

### C. Grafana 集成 (`GrafanaService`)

#### 仪表盘和告警管理

```typescript
const grafana = manager.getGrafanaService();

if (grafana) {
  // 1️⃣ 自动生成分析仪表盘
  const result = await grafana.generateLogAnalyticsDashboard('生产监控');
  console.log(`仪表盘UID: ${result.uid}`);
  
  // 访问仪表盘
  window.open(`https://grafana.your-company.com/d/${result.uid}`);

  // 2️⃣ 查看生成的告警规则
  const alertRules = grafana.generateAlertRules();
  alertRules.forEach(rule => {
    console.log(`告警: ${rule.title}`);
    console.log(`  条件: ${rule.condition}`);
    console.log(`  持续时间: ${rule.for}`);
  });

  // 3️⃣ 创建自定义告警规则
  await grafana.createAlertRule({
    uid: 'custom-alert-1',
    title: '内存泄漏告警',
    condition: 'A',
    data: [{
      refId: 'A',
      queryType: '',
      model: {
        expr: 'memory_usage_percent > 85',
        interval: '5m',
        refId: 'A',
      }
    }],
    noDataState: 'OK',
    execErrState: 'OK',
    for: '10m',
    annotations: {
      description: '内存使用率超过85%'
    },
    labels: {
      severity: 'warning',
      team: 'platform'
    }
  });

  // 4️⃣ 配置通知渠道（钉钉/企业微信/邮件等）
  await grafana.updateNotificationChannel({
    type: 'dingding',
    name: '钉钉告警',
    settings: {
      url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      message: '{{ alert.status }}: {{ alert.title }}',
      mentionAll: false
    },
    isDefault: true
  });

  // 5️⃣ 发送测试告警
  await grafana.sendTestAlert(1, '这是一条测试告警');

  // 6️⃣ 导出仪表盘配置
  const dashboardJSON = await grafana.exportDashboardJSON(123);
  console.log(dashboardJSON);
}
```

---

## 🔧 高级用法

### 1. 自定义 LogQL 查询

```typescript
const loki = manager.getLokiService();

// 查询 API 平均响应时间
const result = await loki.queryRange(
  'avg(http_request_duration_ms{service="api-gateway"})',
  start = Math.floor(Date.now() / 1000) - 3600,  // 1小时前
  end = Math.floor(Date.now() / 1000),           // 现在
  step = 60                                      // 1分钟间隔
);
```

### 2. 性能监控

```typescript
// 获取查询性能指标
const metrics = manager.getPerformanceMetrics();
console.log(`缓存命中率: ${
  (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(2)
}%`);
console.log(`平均响应时间: ${metrics.avgResponseTime.toFixed(2)}ms`);
console.log(`总查询数: ${metrics.totalQueries}`);

// 清除缓存
manager.clearCache();
```

### 3. 导出完整报告

```typescript
// 生成 JSON 报告
const jsonReport = await manager.offlineAnalysis(24, 'json');
fs.writeFileSync('analysis-report.json', jsonReport);

// 生成 CSV 报告
const csvReport = await manager.offlineAnalysis(24, 'csv');
fs.writeFileSync('analysis-report.csv', csvReport);
```

---

## 📝 LogQL 常用查询模板

```logql
-- 错误统计
sum(count_over_time({level=~"error|critical"} [1h]))

-- 按服务分类
sum by (service) (count_over_time({level="error"} [1h]))

-- 计算错误率
sum(count_over_time({level=~"error|critical"} [1h])) / 
sum(count_over_time({level!=""} [1h]))

-- Top N 错误
topk(10, sum by (message) (count_over_time({level="error"} [1h])))

-- 百分位数
histogram_quantile(0.99, sum(rate(response_time_ms[5m])))

-- 时间序列趋势
sum(increase({level="error"}[1h])) by (timestamp)

-- 多条件过滤
{level="error", service="api-gateway", status_code="500"}

-- 正则匹配
{message=~".*timeout.*|.*refused.*"}
```

---

## 🎯 集成到你的应用

### 在 React 组件中使用

```typescript
// src/app/components/AnalyticsDashboard.tsx
import { useEffect, useState } from 'react';
import { getLogAnalysisManager } from '../services/logAnalysisManager';
import { AnalysisReport } from '../services/logAnalysisManager';

export function AnalyticsDashboard() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const manager = getLogAnalysisManager();
    
    // 启动实时监控，每30秒更新一次
    const stopMonitoring = manager.startRealTimeMonitoring(30, (newReport) => {
      setReport(newReport);
      setLoading(false);
    });

    // 首次立即加载
    manager.generateAnalysisReport().then(setReport).finally(() => setLoading(false));

    return stopMonitoring;
  }, []);

  if (loading) return <div>加载中...</div>;
  if (!report) return <div>无数据</div>;

  return (
    <div className="p-6 space-y-6">
      {/* 摘要卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded">
          <div className="text-sm text-gray-600">总日志</div>
          <div className="text-2xl font-bold">{report.summary.totalLogs.toLocaleString()}</div>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <div className="text-sm text-gray-600">错误数</div>
          <div className="text-2xl font-bold text-red-600">{report.summary.totalErrors}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded">
          <div className="text-sm text-gray-600">错误率</div>
          <div className="text-2xl font-bold text-yellow-600">
            {(report.summary.errorRate * 100).toFixed(2)}%
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <div className="text-sm text-gray-600">受影响服务</div>
          <div className="text-2xl font-bold text-green-600">{report.summary.affectedServices}</div>
        </div>
      </div>

      {/* 建议 */}
      {report.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
          <h3 className="font-semibold mb-2">📋 建议</h3>
          <ul className="space-y-1">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="text-sm">{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Top 错误 */}
      <div>
        <h3 className="font-semibold mb-2">🔴 Top 5 错误</h3>
        <div className="space-y-2">
          {report.topErrors.map((error, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
              <span className="text-sm">{error.message}</span>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                {error.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 服务健康 */}
      {report.serviceHealth.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">⚠️ 异常服务</h3>
          <div className="space-y-2">
            {report.serviceHealth.map((svc, i) => (
              <div key={i} className="flex items-center justify-between bg-red-50 p-2 rounded">
                <span className="text-sm font-medium">{svc.service}</span>
                <div className="flex gap-2">
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    {svc.status}
                  </span>
                  <span className="text-xs text-red-600">
                    {(svc.errorRate * 100).toFixed(2)}% 错误率
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## ⚙️ 配置文件更新

在 `src/app/config/loki.config.ts` 中更新配置：

```typescript
// 导入管理器
import { initializeLogAnalysisManager } from '../services/logAnalysisManager';

// 在应用启动时初始化
export function setupAnalysisManager() {
  return initializeLogAnalysisManager({
    lokiUrl: 'http://47.242.170.56:3100',
    lokiDefaultLimit: 1000,
    grafanaUrl: process.env.VITE_GRAFANA_URL,
    grafanaApiKey: process.env.VITE_GRAFANA_API_KEY,
    defaultTimeRange: 24,
    enableCache: true,
    cacheExpirationMs: 300000,
  });
}
```

---

## 💡 最佳实践

### 1. 缓存策略
- 使用缓存减少 Loki 服务器网络请求
- 设置合理的缓存过期时间（5-10分钟）
- 在重要分析前清除缓存获取最新数据

### 2. 告警阈值
```typescript
const ALERT_THRESHOLDS = {
  errorRate: 0.05,        // 5% 错误率
  errorCount: 100,        // 100 个错误
  responseTime: 5000,     // 5秒响应时间
  affectedServices: 3,    // 3个服务受影响
};
```

### 3. 监控频率
```typescript
// 生产环境：30秒
manager.startRealTimeMonitoring(30);

// 开发环境：60秒
manager.startRealTimeMonitoring(60);

// 低流量场景：300秒（5分钟）
manager.startRealTimeMonitoring(300);
```

### 4. 错误处理
```typescript
try {
  const report = await manager.generateAnalysisReport();
} catch (error) {
  console.error('分析失败:', error);
  // 可以显示缓存的历史数据或降级处理
  const cachedReport = localStorage.getItem('lastReport');
  if (cachedReport) {
    setReport(JSON.parse(cachedReport));
  }
}
```

---

## 🔍 故障排除

| 问题 | 解决方案 |
|------|---------|
| 无法连接到 Loki | 检查 `lokiUrl` 配置，确保网络连通 |
| 查询响应缓慢 | 检查缓存是否启用，考虑调整 `step` 参数 |
| Grafana 仪表盘创建失败 | 验证 `grafanaApiKey` 权限，确保组织 ID 正确 |
| 内存占用过高 | 清除缓存或减少实时监控频率 |

---

## 📚 参考资源

- [Loki 官方文档](https://grafana.com/docs/loki/)
- [LogQL 查询语言](https://grafana.com/docs/loki/latest/logql/)
- [Grafana API](https://grafana.com/docs/grafana/latest/developers/http_api/)

---

## 🎉 下一步

1. ✅ 集成这些新服务到你的应用
2. ✅ 配置 Loki 日志标签体系
3. ✅ 设置 Grafana Loki 数据源
4. ✅ 创建告警规则和通知渠道
5. ✅ 启动实时监控和分析

**祝你的日志分析系统运行顺利！** 🚀
