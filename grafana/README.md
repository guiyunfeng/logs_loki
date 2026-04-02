# Grafana Dashboard 导入指南

## 前置条件

- Grafana 已部署并运行
- Loki 数据源已添加到 Grafana（数据源名称建议使用 "Loki"）
- Promtail 正常采集日志到 Loki

## 导入步骤

### 1. 添加 Loki 数据源（如果还没有）

1. 进入 Grafana → Configuration → Data Sources
2. 点击 "Add data source"
3. 选择 "Loki"
4. URL 填入你的 Loki 地址，如 `http://172.26.240.15:3100`
5. 点击 "Save & Test"

### 2. 导入 Dashboard

1. 进入 Grafana → Dashboards → Import
2. 点击 "Upload JSON file"
3. 依次导入以下文件：
   - `log-analytics.json` — 错误日志分析总览
   - `advanced-analytics.json` — 高级错误分析
   - `alerts-overview.json` — 告警与监控
4. 在导入界面选择你的 Loki 数据源
5. 点击 "Import"

## Dashboard 说明

### 错误日志分析总览 (log-analytics)
主力 Dashboard，包含：
- 错误总数、涉及项目/服务/服务器数量
- 错误趋势图（按项目分组）
- 按服务、服务器的错误统计
- Top 10 错误来源（按 caller_file）
- Top 10 错误服务
- 实时错误日志流（支持关键词搜索）

### 高级错误分析 (advanced-analytics)
深度分析 Dashboard，包含：
- 错误速率、今日总数、同期对比
- 按调用文件(caller_file)的错误趋势和占比
- 错误内容 Top 20（从日志 JSON 解析 content 字段）
- 跨项目、跨服务器对比
- 带 Trace ID 的错误日志关联查看

### 告警与监控 (alerts-overview)
实时监控 Dashboard，包含：
- 最近5分钟/1小时错误数、错误速率
- 错误速率趋势（带告警阈值线）
- 各项目/服务器错误突增检测
- 推荐的 Grafana 告警规则配置

## 筛选变量说明

所有 Dashboard 都支持以下筛选条件（页面顶部下拉框）：
- **服务器 (job)**: 对应 Promtail 的 JOB_NAME，每台服务器唯一
- **项目 (project)**: 从日志路径 `/logs/{project}/{service}/error.log` 提取
- **服务 (service)**: 从日志路径提取
- **搜索关键词 (search)**: 在日志内容中搜索（log-analytics 和 advanced-analytics）
- **调用文件 (caller_file)**: 按代码文件筛选（仅 advanced-analytics）

变量支持级联联动：选择服务器后，项目和服务列表会自动更新。

## 标签对照

| Grafana 变量 | Loki 标签 | 来源 |
|-------------|----------|------|
| job | job | Promtail docker-compose 的 JOB_NAME |
| project | project | 从 `/logs/{project}/...` 路径提取 |
| service | service | 从 `/logs/.../service/error.log` 路径提取 |
| level | level | 从日志 JSON 的 level 字段提取 |
| caller_file | caller_file | 从日志 JSON 的 caller 字段提取（去掉行号） |

## 日志标签体系说明

### 静态标签（由 Promtail 配置注入）

| 标签 | 说明 | 示例值 |
|------|------|--------|
| `job` | 每台服务器唯一标识，格式为自定义名称 | `aliyun-ait0-ai-worker-47-242-124-68-test` |
| `env` | 环境 | `pro` |
| `logtype` | 日志类型 | `error` |

### 从日志路径动态提取的标签
路径格式: `/logs/{project}/{service}/error.log`

| 标签 | 说明 | 示例值 |
|------|------|--------|
| `project` | 项目名 | `ai_quant`, `worker`, `quote` 等 |
| `service` | 服务名 | `account` 等 |

### 从日志 JSON 内容提取的标签

| 标签 | 说明 | 示例值 |
|------|------|--------|
| `level` | 日志级别 | `error` |
| `caller_file` | 调用文件（已去掉行号） | `md/msglogin.go` |

### 日志行 JSON 内容字段（通过 `| json` 解析）

```json
{
  "@timestamp": "2026-03-27T14:30:01.123+08:00",
  "level": "error",
  "caller": "md/msglogin.go:56",
  "content": "database connection timeout",
  "trace": "abc123",
  "span": "def456",
  "duration": "1.234"
}
```
