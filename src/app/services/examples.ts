/**
 * ═══════════════════════════════════════════════════════════════
 * 日志分析系统 - 使用示例
 * ═══════════════════════════════════════════════════════════════
 */

import {
  initializeLogAnalysisManager,
  getLogAnalysisManager,
} from './services/logAnalysisManager';

/**
 * 示例 1: 基础使用 - 生成分析报告
 */
export async function example1_basicAnalysis() {
  console.log('=== 示例 1: 基础分析报告 ===');

  const manager = initializeLogAnalysisManager({
    lokiUrl: 'http://47.242.170.56:3100',
    defaultTimeRange: 24,
  });

  // 生成24小时的分析报告
  const report = await manager.generateAnalysisReport(24);

  console.log('📊 分析报告摘要:');
  console.log(`  总日志数: ${report.summary.totalLogs}`);
  console.log(`  错误数: ${report.summary.totalErrors}`);
  console.log(`  错误率: ${(report.summary.errorRate * 100).toFixed(2)}%`);
  console.log(`  受影响服务数: ${report.summary.affectedServices}`);

  console.log('\n🔴 Top 5 错误:');
  report.topErrors.forEach((error, i) => {
    console.log(`  ${i + 1}. ${error.message} - ${error.count}次 (${error.percentage.toFixed(1)}%)`);
  });

  console.log('\n⚠️ 建议:');
  report.recommendations.forEach((rec) => {
    console.log(`  ${rec}`);
  });

  return report;
}

/**
 * 示例 2: 高级查询 - 多维度统计
 */
export async function example2_multiDimensionStats() {
  console.log('=== 示例 2: 多维度统计 ===');

  const manager = getLogAnalysisManager();
  const advancedLoki = manager.getAdvancedLokiService();

  // 按服务、项目、严重级别统计
  const stats = await advancedLoki.getMultiDimensionStats(
    '{level!=""}', // 所有日志
    ['service', 'project', 'level'],
    24
  );

  console.log('📊 按服务统计:');
  stats.service?.buckets.forEach((bucket) => {
    console.log(`  ${bucket.key}: ${bucket.count} 条 (${bucket.percentage.toFixed(1)}%)`);
  });

  console.log('\n📊 按项目统计:');
  stats.project?.buckets.forEach((bucket) => {
    console.log(`  ${bucket.key}: ${bucket.count} 条 (${bucket.percentage.toFixed(1)}%)`);
  });

  console.log('\n📊 按严重级别统计:');
  stats.level?.buckets.forEach((bucket) => {
    console.log(`  ${bucket.key}: ${bucket.count} 条 (${bucket.percentage.toFixed(1)}%)`);
  });
}

/**
 * 示例 3: 服务健康检查
 */
export async function example3_serviceHealthCheck() {
  console.log('=== 示例 3: 服务健康检查 ===');

  const manager = getLogAnalysisManager();
  const analyzer = manager.getAnalyzer();

  const services = ['api-gateway', 'user-service', 'order-service'];

  for (const service of services) {
    const health = await analyzer.generateServiceHealthReport(service);

    const statusEmoji = {
      healthy: '✅',
      degraded: '⚠️',
      critical: '🔴',
    }[health.status];

    console.log(`\n${statusEmoji} ${service}`);
    console.log(`  状态: ${health.status}`);
    console.log(`  错误率: ${(health.errorRate * 100).toFixed(2)}%`);
    console.log(`  平均响应时间: ${health.avgResponseTime}ms`);
    console.log(`  建议:`);
    health.recommendations.forEach((rec) => {
      console.log(`    - ${rec}`);
    });
  }
}

/**
 * 示例 4: SLO 计算
 */
export async function example4_sloCalculation() {
  console.log('=== 示例 4: SLO 可用性计算 ===');

  const manager = getLogAnalysisManager();
  const analyzer = manager.getAnalyzer();

  const services = ['api-gateway', 'user-service'];
  const sloTarget = 0.999; // 99.9%

  for (const service of services) {
    const slo = await analyzer.calculateSLO(service, sloTarget, 30);

    console.log(`\n${service} (过去30天)`);
    console.log(`  SLO 目标: ${(sloTarget * 100).toFixed(2)}%`);
    console.log(`  实际可用性: ${(slo.availability * 100).toFixed(4)}%`);
    console.log(`  错误预算已用: ${(slo.errorBudget * 100).toFixed(4)}%`);
    console.log(`  状态: ${slo.status}`);
  }
}

/**
 * 示例 5: 错误分析和根因分析
 */
export async function example5_rootCauseAnalysis() {
  console.log('=== 示例 5: 根因分析 ===');

  const manager = getLogAnalysisManager();

  // 首先获取 Top 错误
  const report = await manager.generateAnalysisReport(1);
  if (report.topErrors.length === 0) {
    console.log('无错误数据');
    return;
  }

  // 对 Top 错误进行根因分析
  const topError = report.topErrors[0];
  console.log(`\n分析错误: "${topError.message}" (${topError.count}次)`);

  const rootCause = await manager.rootCauseAnalysis(topError.message, 30);

  console.log('\n🔗 关联错误:');
  rootCause.relatedErrors.forEach((err) => {
    console.log(`  - ${err.message} (${err.count}次)`);
  });

  console.log('\n🔧 受影响的服务:');
  rootCause.affectedServices.forEach((svc) => {
    console.log(`  - ${svc}`);
  });

  console.log('\n📅 错误时间线 (最近20条):');
  rootCause.timeline.slice(0, 10).forEach((event) => {
    console.log(`  ${event.timestamp}: [${event.severity}] ${event.event}`);
  });
}

/**
 * 示例 6: 离线分析报告导出
 */
export async function example6_exportReport() {
  console.log('=== 示例 6: 导出分析报告 ===');

  const manager = getLogAnalysisManager();

  // 生成 JSON 格式报告
  console.log('📄 生成 JSON 报告...');
  const jsonReport = await manager.offlineAnalysis(24, 'json');
  console.log(`JSON 报告大小: ${jsonReport.length} 字符`);

  // 生成 CSV 格式报告
  console.log('📄 生成 CSV 报告...');
  const csvReport = await manager.offlineAnalysis(24, 'csv');
  console.log(`CSV 报告预览:\n${csvReport.split('\n').slice(0, 5).join('\n')}`);

  // 实际使用中可以保存到文件
  // fs.writeFileSync('report.json', jsonReport);
  // fs.writeFileSync('report.csv', csvReport);
}

/**
 * 示例 7: 生产环境 Label 匹配查询
 */
export async function example7_productionLabelMatching() {
  console.log('=== 示例 7: 生产环境 Label 匹配 ===');

  const manager = getLogAnalysisManager();
  const lokiService = manager.getLokiService();
  const advancedLoki = manager.getAdvancedLokiService();

  try {
    // 7a: 获取所有可用标签
    console.log('🏷️ 获取所有可用标签...');
    const allLabels = await lokiService.getLabels();
    console.log(`发现 ${allLabels.length} 个标签:`, allLabels.slice(0, 10).join(', '), '...');

    // 7b: 获取特定标签的值
    console.log('\n📋 获取 service 标签的所有值...');
    const serviceValues = await lokiService.getLabelValues('service');
    console.log(`发现 ${serviceValues.length} 个服务:`, serviceValues.slice(0, 5).join(', '), '...');

    // 7c: 按标签精确匹配查询
    console.log('\n🎯 精确匹配查询示例:');
    const exactMatchQuery = '{service="api-gateway", level="error"}';
    console.log(`查询: ${exactMatchQuery}`);

    const exactResult = await advancedLoki.cachedQuery(exactMatchQuery);
    console.log(`找到 ${exactResult.data.result.length} 条匹配日志`);

    // 7d: 标签值过滤查询
    console.log('\n🔍 标签值过滤查询示例:');
    const filterQuery = '{service=~"api-gateway|user-service", level!="debug"}';
    console.log(`查询: ${filterQuery}`);

    const filterResult = await advancedLoki.cachedQuery(filterQuery);
    console.log(`找到 ${filterResult.data.result.length} 条匹配日志`);

    // 7e: 多标签聚合统计
    console.log('\n📊 按多个标签聚合统计:');
    const multiStats = await advancedLoki.getMultiDimensionStats(
      '{level!=""}', // 基础选择器
      ['service', 'namespace', 'pod'], // 要聚合的标签
      1 // 1小时
    );

    Object.entries(multiStats).forEach(([label, result]) => {
      console.log(`\n🏷️ ${label} 分布 (Top 5):`);
      result.buckets.slice(0, 5).forEach((bucket, i) => {
        console.log(`  ${i + 1}. ${bucket.key}: ${bucket.count} 条 (${bucket.percentage.toFixed(1)}%)`);
      });
    });

    // 7f: 动态标签查询示例
    console.log('\n🔄 动态标签查询示例:');
    const dynamicQueries = [
      '{job="kubernetes-pods"}',           // Kubernetes Pod 日志
      '{container_name="nginx"}',          // 容器日志
      '{namespace="production"}',          // 生产环境日志
      '{app="web-server", version="1.2.3"}', // 特定版本应用日志
    ];

    for (const query of dynamicQueries) {
      try {
        const result = await advancedLoki.cachedQuery(query);
        console.log(`  ${query} → ${result.data.result.length} 条日志`);
      } catch (error) {
        console.log(`  ${query} → 查询失败: ${error.message}`);
      }
    }

    // 7g: 标签组合查询优化
    console.log('\n⚡ 标签组合查询优化示例:');
    const optimizedQueries = [
      // 推荐：先过滤高选择性标签
      '{level="error", service="api-gateway"}',
      // 不推荐：低选择性标签在前
      '{service=~".+", level="error"}',
    ];

    for (const query of optimizedQueries) {
      const startTime = performance.now();
      const result = await advancedLoki.cachedQuery(query);
      const duration = performance.now() - startTime;
      console.log(`  ${query}`);
      console.log(`    结果: ${result.data.result.length} 条日志`);
      console.log(`    查询时间: ${duration.toFixed(2)}ms`);
    }

  } catch (error) {
    console.error('❌ Label 匹配示例执行失败:', error);
  }
}
export async function example8_sloReport() {
  console.log('=== 示例 8: SLO 报告生成 ===');

  const manager = getLogAnalysisManager();

  // 示例 8a: Top 10 服务 SLO 报告
  console.log('\n📈 Top 10 服务 SLO 报告:');
  const top10Report = await manager.generateSLOReport({
    topN: 10,
    sloTarget: 0.999, // 99.9% 可用性目标
    periodDays: 30
  });

  console.log(`总服务数: ${top10Report.totalServices}`);
  console.log(`活跃服务数: ${top10Report.activeServices}`);
  console.log(`SLO 目标: ${(top10Report.sloResults[0]?.sloTarget * 100).toFixed(1)}%`);
  console.log(`平均可用性: ${(top10Report.summary.avgAvailability * 100).toFixed(2)}%`);

  console.log('\n📊 SLO 状态分布:');
  console.log(`  ✅ 良好: ${top10Report.summary.good} 个服务`);
  console.log(`  ⚠️ 警告: ${top10Report.summary.warning} 个服务`);
  console.log(`  🔴 违反: ${top10Report.summary.violated} 个服务`);

  console.log('\n🔍 Top 10 服务 SLO 详情:');
  top10Report.sloResults.forEach((slo, i) => {
    const statusIcon = slo.status === 'good' ? '✅' : slo.status === 'warning' ? '⚠️' : '🔴';
    const activityIcon = slo.hasRecentLogs ? '🟢' : '⚫';
    console.log(`  ${i + 1}. ${activityIcon} ${slo.serviceName}`);
    console.log(`     可用性: ${(slo.availability * 100).toFixed(3)}%`);
    console.log(`     错误预算使用: ${(slo.errorBudget * 100).toFixed(3)}% ${statusIcon}`);
  });

  // 示例 8b: 全部活跃服务 SLO 报告
  console.log('\n📈 全部活跃服务 SLO 报告:');
  const allActiveReport = await manager.generateSLOReport({
    includeInactive: false, // 只包含有日志数据的服务
    sloTarget: 0.995, // 99.5% 可用性目标
    periodDays: 7 // 7天周期
  });

  console.log(`活跃服务数: ${allActiveReport.activeServices}`);
  console.log(`SLO 状态分布: 良好${allActiveReport.summary.good} | 警告${allActiveReport.summary.warning} | 违反${allActiveReport.summary.violated}`);

  // 示例 8c: 包含非活跃服务的完整报告
  console.log('\n📈 完整服务 SLO 报告 (含非活跃):');
  const fullReport = await manager.generateSLOReport({
    includeInactive: true, // 包含所有标签中的服务
    sloTarget: 0.999,
    periodDays: 30
  });

  console.log(`总服务数: ${fullReport.totalServices} (活跃: ${fullReport.activeServices})`);

  const inactiveServices = fullReport.sloResults.filter(s => !s.hasRecentLogs);
  if (inactiveServices.length > 0) {
  /**
 * 示例 9: 生产环境配置和最佳实践
 */
export async function example9_productionBestPractices() {
  console.log('=== 示例 9: 生产环境配置和最佳实践 ===');

  // 9a: 生产环境配置示例
  console.log('🔧 生产环境配置示例:');

  const productionConfig = {
    lokiUrl: 'http://loki.production.company.com:3100',
    // 高级配置
    cacheExpirationMs: 600000, // 10分钟缓存
    defaultQueryLimit: 5000,   // 更大的查询限制
    retryAttempts: 3,          // 重试次数
    timeoutMs: 30000,          // 30秒超时
  };

  console.log('生产环境配置:', JSON.stringify(productionConfig, null, 2));

  // 9b: 标签策略最佳实践
  console.log('\n📋 标签策略最佳实践:');

  const labelBestPractices = {
    // 必需标签
    required: [
      'service',      // 服务名称
      'namespace',    // 命名空间/环境
      'level',        // 日志级别
      'version',      // 应用版本
    ],

    // 推荐标签
    recommended: [
      'pod',          // Pod名称
      'container',    // 容器名称
      'node',         // 节点名称
      'cluster',      // 集群名称
      'region',       // 区域
      'team',         // 负责团队
    ],

    // 自定义标签示例
    custom: [
      'request_id',   // 请求ID
      'user_id',      // 用户ID
      'endpoint',     // API端点
      'method',       // HTTP方法
      'status_code',  // 响应状态码
    ]
  };

  Object.entries(labelBestPractices).forEach(([category, labels]) => {
    console.log(`\n${category.toUpperCase()} 标签:`);
    labels.forEach(label => console.log(`  - ${label}`));
  });

  // 9c: 查询模式示例
  console.log('\n🔍 生产环境查询模式示例:');

  const queryPatterns = {
    // 错误监控
    errorMonitoring: [
      '{level="error", service="api-gateway"}',
      '{level="error", namespace="production"}',
      '{level=~"error|critical", service=~"web-.*"}',
    ],

    // 性能监控
    performanceMonitoring: [
      '{service="api-gateway", method="POST", status_code=~"5.."}',
      '{service="database", operation="query", duration>1}',
      '{service="cache", operation="get", status="miss"}',
    ],

    // 业务监控
    businessMonitoring: [
      '{service="order-service", endpoint="/api/orders", status_code="201"}',
      '{service="payment-service", operation="charge", result="success"}',
      '{service="notification-service", type="email", status="delivered"}',
    ],

    // 安全监控
    securityMonitoring: [
      '{level="error", message=~"unauthorized|forbidden"}',
      '{service="auth-service", operation="login", result="failed"}',
      '{service="api-gateway", status_code="401"}',
    ]
  };

  Object.entries(queryPatterns).forEach(([category, queries]) => {
    console.log(`\n${category.replace(/([A-Z])/g, ' $1').toUpperCase()}:`);
    queries.forEach(query => console.log(`  ${query}`));
  });

  // 9d: 标签匹配的高级用法
  console.log('\n🎯 标签匹配高级用法:');

  const advancedUsages = {
    // 标签值排除
    exclusion: '{service!="health-check", level!="debug"}',

    // 正则匹配
    regex: '{service=~"api-gateway|v2", namespace=~"prod.*"}',

    // 多条件组合
    combination: '{service="web-server", level="error", version!="1.0.0"}',

    // 数值比较（如果标签是数值）
    numeric: '{response_time>1000, status_code=~"5.."}',

    // 时间范围过滤（结合时间选择器）
    timeBased: '{service="batch-job"} |= "started" |~ "completed|failed"',
  };

  Object.entries(advancedUsages).forEach(([type, query]) => {
    console.log(`${type.toUpperCase()}: ${query}`);
  });

  // 9e: 监控告警规则示例
  console.log('\n🚨 基于标签的监控告警规则示例:');

  const alertRules = [
    {
      name: 'High Error Rate',
      query: 'sum(rate({level="error", service="api-gateway"}[5m])) > 0.1',
      description: 'API网关错误率超过10%',
      labels: { service: 'api-gateway', severity: 'critical' }
    },
    {
      name: 'Service Down',
      query: 'up{job="kubernetes-pods", service="web-server"} == 0',
      description: 'Web服务不可用',
      labels: { service: 'web-server', severity: 'critical' }
    },
    {
      name: 'Slow Response Time',
      query: 'histogram_quantile(0.95, rate(http_request_duration_seconds{job="api-server"}[5m])) > 2',
      description: 'API响应时间过慢（95分位数>2秒）',
      labels: { service: 'api-server', severity: 'warning' }
    }
  ];

  alertRules.forEach((rule, i) => {
    console.log(`\n${i + 1}. ${rule.name}`);
    console.log(`   查询: ${rule.query}`);
    console.log(`   描述: ${rule.description}`);
    console.log(`   标签: ${JSON.stringify(rule.labels)}`);
  });

  console.log('\n✅ 生产环境配置完成！');
  console.log('💡 提示: 确保你的日志收集器（如Promtail、Fluentd）正确配置了这些标签。');
}
      console.log(`  - ${slo.serviceName}: 可用性 ${(slo.availability * 100).toFixed(1)}%`);
    });
    if (inactiveServices.length > 5) {
      console.log(`  ... 还有 ${inactiveServices.length - 5} 个服务`);
    }
  }

  return { top10Report, allActiveReport, fullReport };
}

  let updateCount = 0;
  const stopMonitoring = manager.startRealTimeMonitoring(10, (report) => {
    updateCount++;
    console.log(`[${report.timestamp}] 第 ${updateCount} 次更新`);
    console.log(`  总日志: ${report.summary.totalLogs}`);
    console.log(`  错误率: ${(report.summary.errorRate * 100).toFixed(2)}%`);

    // 如果看到严重问题立即告警
    if (report.summary.errorRate > 0.1) {
      console.log('  ⚠️ 告警: 错误率突增!');
    }

    if (report.serviceHealth.length > 0) {
      console.log(`  ⚠️ 异常服务: ${report.serviceHealth.map((s) => s.service).join(', ')}`);
    }
  });

  // 60秒后停止监控
  setTimeout(() => {
    stopMonitoring();
    console.log(`监控已停止，共收集 ${updateCount} 次数据`);
  }, 60000);
}

/**
 * 示例 8: Grafana 集成
 */
export async function example8_grafanaIntegration() {
  console.log('=== 示例 8: Grafana 集成 ===');

  const manager = initializeLogAnalysisManager({
    lokiUrl: 'http://47.242.170.56:3100',
    grafanaUrl: 'http://localhost:3000',
    grafanaApiKey: 'glc_xxxxxxxxxxxx',
    grafanaOrgId: 1,
  });

  const grafana = manager.getGrafanaService();

  if (!grafana) {
    console.log('❌ Grafana 未配置');
    return;
  }

  try {
    // 创建仪表盘
    console.log('📊 创建 Grafana 仪表盘...');
    const dashboard = await grafana.generateLogAnalyticsDashboard('生产环境日志分析');
    console.log(`✅ 仪表盘已创建: ID=${dashboard.id}, UID=${dashboard.uid}`);
    console.log(`   访问地址: http://localhost:3000/d/${dashboard.uid}`);

    // 生成告警规则
    console.log('\n🔔 生成告警规则...');
    const alertRules = grafana.generateAlertRules();
    console.log(`✅ 生成了 ${alertRules.length} 个告警规则`);
    alertRules.forEach((rule) => {
      console.log(`   - ${rule.title}`);
    });

    // 配置钉钉通知
    console.log('\n📱 配置钉钉通知...');
    await grafana.updateNotificationChannel({
      type: 'dingding',
      name: '钉钉告警通知',
      settings: {
        url: 'https://oapi.dingtalk.com/robot/send?access_token=your_token',
      },
      isDefault: true,
    });
    console.log('✅ 钉钉通知已配置');
  } catch (error) {
    console.error('❌ Grafana 操作失败:', error);
  }
}

/**
 * 示例 9: 异常检测
 */
export async function example9_anomalyDetection() {
  console.log('=== 示例 9: 异常检测 ===');

  const manager = getLogAnalysisManager();

  // 检测 1 小时内错误数超过 50 的时段
  const anomalies = await manager.detectAnomalies(
    'count_over_time({level="error"}[5m])',
    threshold = 50,
    hours = 24
  );

  console.log(`检测到 ${anomalies.length} 个异常数据点`);
  anomalies.slice(0, 10).forEach((anomaly) => {
    const date = new Date(anomaly.timestamp);
    console.log(`  ${date.toLocaleString()}: ${anomaly.value.toFixed(0)} 个错误 (阈值: 50)`);
  });
}

/**
 * 示例 10: 性能指标监控
 */
export async function example10_performanceMetrics() {
  console.log('=== 示例 10: 性能指标监控 ===');

  const manager = getLogAnalysisManager();

  // 获取查询性能指标
  const metrics = manager.getPerformanceMetrics();

  console.log('📈 查询性能指标:');
  console.log(`  总查询数: ${metrics.totalQueries}`);
  console.log(`  缓存命中: ${metrics.cacheHits}`);
  console.log(`  缓存未命中: ${metrics.cacheMisses}`);

  const hitRate =
    metrics.cacheHits + metrics.cacheMisses > 0
      ? ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(2)
      : 'N/A';
  console.log(`  缓存命中率: ${hitRate}%`);
  console.log(`  平均响应时间: ${metrics.avgResponseTime.toFixed(2)}ms`);
}

/**
 * 示例 11: 完整的日常监控流程
 */
export async function example11_dailyMonitoringFlow() {
  console.log('=== 示例 11: 日常监控流程 ===\n');

  const manager = initializeLogAnalysisManager({
    lokiUrl: 'http://47.242.170.56:3100',
    grafanaUrl: process.env.GRAFANA_URL,
    grafanaApiKey: process.env.GRAFANA_API_KEY,
    defaultTimeRange: 24,
  });

  // Step 1: 生成整体报告
  console.log('1️⃣ 生成整体分析报告...');
  const overallReport = await manager.generateAnalysisReport(24);

  // Step 2: 如果错误率过高，启动深入分析
  if (overallReport.summary.errorRate > 0.05) {
    console.log('\n2️⃣ 错误率过高，执行深入分析...');

    for (const error of overallReport.topErrors.slice(0, 3)) {
      console.log(`   分析错误: ${error.message}`);
      const rootCause = await manager.rootCauseAnalysis(error.message, 60);
      console.log(`     关联服务: ${rootCause.affectedServices.join(', ')}`);
    }
  }

  // Step 3: 检查服务健康状态
  console.log('\n3️⃣ 检查关键服务健康状态...');
  const criticalServices = ['api-gateway', 'user-service', 'order-service'];
  const analyzer = manager.getAnalyzer();

  for (const service of criticalServices) {
    const health = await analyzer.generateServiceHealthReport(service);
    if (health.status !== 'healthy') {
      console.log(`   ⚠️ ${service}: ${health.status}`);
    }
  }

  // Step 4: 推送数据到 Grafana
  console.log('\n4️⃣ 推送数据到 Grafana...');
  try {
    const result = await manager.analyzeAndPushToGrafana('日常监控 - ' + new Date().toLocaleDateString());
    console.log(`   ✅ 仪表盘已创建: ${result.dashboardUid}`);
  } catch (error) {
    console.warn('   ⚠️ Grafana 推送失败，但分析继续进行');
  }

  // Step 5: 导出报告
  console.log('\n5️⃣ 导出分析报告...');
  const jsonReport = await manager.offlineAnalysis(24, 'json');
  console.log(`   ✅ JSON 报告: ${jsonReport.length} 字符`);

  console.log('\n✅ 日常监控流程完成！');
}

/**
 * 示例 12: 自定义 LogQL 查询
 */
export async function example12_customLogQLQueries() {
  console.log('=== 示例 12: 自定义 LogQL 查询 ===');

  const manager = getLogAnalysisManager();
  const loki = manager.getLokiService();

  // 查询示例
  const queries = [
    {
      name: '错误总数',
      query: 'sum(count_over_time({level=~"error|critical"} [1h]))',
    },
    {
      name: '按服务分类',
      query: 'sum by (service) (count_over_time({level="error"} [1h]))',
    },
    {
      name: '特定服务的错误率',
      query:
        'sum(count_over_time({service="api-gateway", level=~"error|critical"} [1h])) / sum(count_over_time({service="api-gateway"} [1h]))',
    },
  ];

  for (const { name, query } of queries) {
    console.log(`\n📊 ${name}`);
    console.log(`   查询: ${query}`);
    const result = await loki.query(query);
    console.log(`   结果: ${JSON.stringify(result.data.result?.[0])}`);
  }
}

/**
 * 运行所有示例（带有错误处理）
 */
export async function runAllExamples() {
  const examples = [
    { name: '基础分析', fn: example1_basicAnalysis },
    { name: '多维度统计', fn: example2_multiDimensionStats },
    { name: '服务健康检查', fn: example3_serviceHealthCheck },
    { name: 'SLO 计算', fn: example4_sloCalculation },
    { name: '根因分析', fn: example5_rootCauseAnalysis },
    { name: '导出报告', fn: example6_exportReport },
    // { name: '实时监控', fn: example7_realtimeMonitoring },
    // { name: 'Grafana 集成', fn: example8_grafanaIntegration },
    { name: '异常检测', fn: example9_anomalyDetection },
    { name: '性能指标', fn: example10_performanceMetrics },
    { name: '自定义查询', fn: example12_customLogQLQueries },
  ];

  for (const example of examples) {
    console.log(`\n${'='.repeat(60)}`);
    try {
      await example.fn();
      console.log(`✅ ${example.name} 完成`);
    } catch (error) {
      console.error(`❌ ${example.name} 失败:`, error);
    }
    console.log('');
  }
}

// 主程序入口
if (import.meta.main) {
  runAllExamples().catch(console.error);
}
