# Loki + Grafana 日志监控系统

这是一个完整的日志监控可视化平台，已接入你的 Loki 服务（http://47.242.170.56:3100）。

## 🎯 核心功能

### 1. 错误类型统计面板
- 使用饼图展示不同错误类型的分布
- 自动聚合 `error_type` 字段
- LogQL: `sum by (error_type) (count_over_time({level=~"error|critical"} | json [1h]))`

### 2. Top 10 错误排名
- 横向柱状图展示最高频的错误
- 根据严重程度（critical/error/warning）用颜色区分
- LogQL: `topk(10, sum by (message, level) (count_over_time({level=~"error|critical|warning"} | json [1h])))`

### 3. 错误趋势图（24小时）
- 多条线图展示三种错误级别的时间序列
- 分别统计 critical、error、warning
- LogQL: `sum(count_over_time({level="critical"} [1h]))`

### 4. 智能告警中心
基于日志严重程度的自动告警系统：

**告警规则：**
- **Critical**: 错误率 > 5% 持续 5 分钟
- **Error**: 错误数量 > 50 次/10分钟
- **Warning**: 警告数量 > 100 次/15分钟

### 5. 实时日志流
- 类似终端的日志展示界面
- 支持按级别筛选（critical/error/warning/info/debug）
- 支持关键词搜索

### 6. 关键指标卡片
- 总错误数
- 错误率
- 活跃告警数
- 平均响应时间

## 📁 项目结构

```
/src/app/
├── config/
│   └── loki.config.ts          # Loki 配置和 LogQL 模板
├── services/
│   ├── lokiService.ts          # Loki API 客户端封装
│   └── logAnalyzer.ts          # 日志分析器（数据处理逻辑）
├── components/
│   ├── ErrorTypePanel.tsx      # 错误类型统计面板
│   ├── TopNErrorsPanel.tsx     # TopN 错误排名面板
│   ├── ErrorTrendPanel.tsx     # 错误趋势面板
│   ├── AlertsPanel.tsx         # 告警面板
│   ├── LogStream.tsx           # 实时日志流
│   └── MetricsCards.tsx        # 指标卡片
└── App.tsx                     # 主应用
```

## 🔧 配置说明

### 修改 Loki 地址
编辑 `/src/app/config/loki.config.ts`:

```typescript
export const LOKI_CONFIG = {
  url: 'http://47.242.170.56:3100',  // 你的 Loki 地址
  refreshInterval: 30000,             // 自动刷新间隔（毫秒）
  queryRanges: {
    errorType: 1,   // 错误类型统计时间范围（小时）
    topN: 1,        // TopN 错误时间范围（小时）
    trend: 24,      // 趋势图时间范围（小时）
    logs: 100,      // 日志流数量
  },
};
```

### 修改告警阈值
在 `loki.config.ts` 中修改：

```typescript
alertThresholds: {
  critical: {
    errorRate: 0.05,  // 5% 错误率
    duration: 5,      // 持续 5 分钟
  },
  error: {
    errorCount: 50,   // 50 次错误
    duration: 10,     // 持续 10 分钟
  },
  warning: {
    warningCount: 100,  // 100 次警告
    duration: 15,       // 持续 15 分钟
  },
}
```

## 📊 日志格式要求

为了让系统正确解析日志，建议你的日志符合以下格式之一：

### JSON 格式（推荐）
```json
{
  "level": "error",
  "message": "Database connection failed",
  "error_type": "DatabaseException",
  "source": "api-gateway",
  "timestamp": "2025-03-27T10:30:00Z"
}
```

### 标签要求
Loki 日志流应包含以下标签（labels）：
- `level`: 日志级别（critical/error/warning/info/debug）
- `job`: 服务名称（用于区分不同服务）
- `error_type`: 错误类型（可选，用于错误分类统计）

### LogQL 查询示例

```logql
# 1. 查询所有错误日志
{level=~"error|critical"} | json

# 2. 查询特定服务的错误
{job="api-gateway", level="error"} | json

# 3. 计算错误率
sum(rate({level=~"error|critical"}[5m]))

# 4. 按错误类型聚合
sum by (error_type) (count_over_time({level="error"} | json [1h]))

# 5. 查询包含特定关键词的日志
{job="api-gateway"} |= "timeout" | json

# 6. 多条件过滤
{level="error"} | json | error_type="DatabaseException"
```

## 🚀 使用方法

1. **自动刷新**: 默认每 30 秒自动从 Loki 拉取最新数据
2. **手动刷新**: 点击右上角"刷新数据"按钮
3. **连接状态**: 顶部显示与 Loki 的连接状态（已连接/未连接）
4. **告警筛选**: 在告警面板中可按严重程度筛选
5. **日志搜索**: 在日志流中输入关键词搜索，或按级别筛选

## 🔍 Loki API 端点

系统使用以下 Loki API：

- `GET /loki/api/v1/query` - 即时查询
- `GET /loki/api/v1/query_range` - 范围查询
- `GET /loki/api/v1/labels` - 获取所有标签
- `GET /loki/api/v1/label/{name}/values` - 获取标签值

## ⚠️ 跨域问题处理

如果遇到 CORS 跨域错误，需要在 Loki 配置中添加：

```yaml
# loki-config.yaml
server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  
  # 添加 CORS 配置
  http_server_read_timeout: 600s
  http_server_write_timeout: 600s

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules

# 如果使用 Nginx 反向代理，添加：
# add_header 'Access-Control-Allow-Origin' '*';
# add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
# add_header 'Access-Control-Allow-Headers' 'Content-Type';
```

## 📈 性能优化建议

1. **限制查询范围**: 不要一次查询过长时间范围的数据
2. **使用标签过滤**: 在 LogQL 中优先使用标签筛选，再使用文本过滤
3. **合理设置刷新间隔**: 根据日志量调整自动刷新时间
4. **限制日志流数量**: 默认最多显示 100 条实时日志

## 🐛 故障排查

### 连接失败
1. 检查 Loki 服务是否运行：`curl http://47.242.170.56:3100/ready`
2. 检查网络连接和防火墙设置
3. 查看浏览器控制台的错误信息

### 没有数据显示
1. 确认 Loki 中有日志数据：`curl "http://47.242.170.56:3100/loki/api/v1/labels"`
2. 检查日志标签是否包含 `level` 字段
3. 查看 LogQL 查询是否返回结果

### 告警不准确
1. 检查告警阈值配置是否合理
2. 确认日志中的 `level` 字段值正确（critical/error/warning）
3. 调整 `loki.config.ts` 中的告警规则

## 📝 扩展开发

### 添加新的查询面板
1. 在 `logAnalyzer.ts` 中添加新的查询方法
2. 创建新的组件文件
3. 在 `App.tsx` 中集成新组件

### 自定义 LogQL 查询
在 `loki.config.ts` 的 `LOGQL_TEMPLATES` 中添加：

```typescript
export const LOGQL_TEMPLATES = {
  // 你的自定义查询
  myCustomQuery: (params) => `{label="value"} | json | custom_field="${params}"`,
};
```

## 📞 技术支持

- Loki 官方文档: https://grafana.com/docs/loki/
- LogQL 语法参考: https://grafana.com/docs/loki/latest/logql/
