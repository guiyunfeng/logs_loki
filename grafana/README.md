# Grafana Dashboard 使用说明

本目录包含可直接导入 Grafana 的 Dashboard JSON 文件，覆盖日志查询和统计分析功能。

## 前置条件

- Grafana（版本 10.0+）已部署并可访问
- Loki 已部署，Promtail 已配置并正在采集日志
- 日志中包含以下标签（由 Promtail 配置注入）：
  - 核心标签：`server`（服务器IP）、`project`（项目名）、`service`（服务名）
  - 辅助标签：`hostname`、`region`、`cloud`、`service_type`、`language`、`severity`、`error_category`

---

## 步骤 1：在 Grafana 中添加 Loki 数据源

1. 打开 Grafana，进入 **Configuration（齿轮图标）→ Data sources**
2. 点击 **Add data source**
3. 搜索并选择 **Loki**
4. 填写 Loki 地址，例如：`http://loki:3100` 或 `http://192.168.x.x:3100`
5. 点击 **Save & test**，确认连接成功

> **注意**：数据源名称建议设置为 `Loki`，导入 Dashboard 时会自动匹配。

---

## 步骤 2：导入 Dashboard

### 方法一：通过 Grafana UI 导入（推荐）

1. 在 Grafana 左侧菜单，点击 **Dashboards → Import**
2. 点击 **Upload JSON file**
3. 选择本目录下的 JSON 文件（如 `log-analytics.json`）
4. 在 **Loki** 数据源下拉框中，选择你已配置的 Loki 数据源
5. 点击 **Import**

重复以上步骤导入所有 Dashboard 文件。

### 方法二：粘贴 JSON 内容

1. 打开 `grafana/dashboards/` 目录下的 JSON 文件，复制全部内容
2. 在 Grafana 中进入 **Dashboards → Import**
3. 将 JSON 内容粘贴到文本框中
4. 点击 **Load**，选择数据源后点击 **Import**

---

## 步骤 3：可选 — Provisioning 自动配置

如果你的 Grafana 支持 [Provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/)，可以自动加载 Dashboard：

### 3.1 配置数据源 Provisioning

创建文件 `/etc/grafana/provisioning/datasources/loki.yaml`：

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    editable: true
```

### 3.2 配置 Dashboard Provisioning

创建文件 `/etc/grafana/provisioning/dashboards/logs_loki.yaml`：

```yaml
apiVersion: 1

providers:
  - name: 'logs-loki-dashboards'
    orgId: 1
    folder: '日志监控'
    folderUid: 'logs-loki'
    type: file
    disableDeletion: false
    editable: true
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards/logs_loki
```

然后将 `grafana/dashboards/` 目录中的 JSON 文件复制到 `/var/lib/grafana/dashboards/logs_loki/` 目录，重启 Grafana 即可自动加载。

> **注意**：通过 Provisioning 加载的 Dashboard 使用 `"datasource": {"type": "loki", "uid": "${DS_LOKI}"}` 格式，需要确保数据源 UID 与 `DS_LOKI` 变量一致，或手动在 JSON 中替换为实际的数据源 UID。

---

## Dashboard 功能说明

### 📊 日志分析总览 (`log-analytics.json`)

对应前端 LogAnalyticsPage 功能，提供全面的日志查询和统计分析。

| 面板 | 功能 |
|------|------|
| 总日志量 | 所选时间范围内的日志总数 |
| 错误日志数 | ERROR + CRITICAL 级别日志数 |
| 警告日志数 | WARNING 级别日志数 |
| 错误率 | 错误日志占总日志的百分比 |
| 日志级别趋势 | 各级别日志随时间变化趋势（时间序列图） |
| 按服务错误分布 | 各服务的错误日志占比（饼图） |
| 按项目错误统计 | 各项目的错误日志数量（条形图） |
| 按服务器错误统计 | 各服务器的错误日志数量（条形图） |
| Top 10 错误服务 | 错误数最多的服务（表格，可排序过滤） |
| 日志流 | 实时日志流，支持按级别和关键词过滤 |

### 📈 高级统计分析 (`advanced-analytics.json`)

对应前端 AdvancedAnalyticsDashboard 功能，提供深度统计分析。

| 面板 | 功能 |
|------|------|
| 可用性 (SLO) | 基于错误率计算的服务可用性指标 |
| 错误总数 | ERROR + CRITICAL 总数 |
| CRITICAL 数 | CRITICAL 级别日志数 |
| 日志吞吐量 | 每秒日志处理量 |
| 按云厂商分布 | 不同云厂商的错误分布（饼图） |
| 按地域分布 | 不同地域的错误分布（环形图） |
| 按服务类型分布 | 不同服务类型的错误分布（饼图） |
| 每小时日志量 | 按级别堆叠的小时日志量（堆叠柱状图） |
| 各服务错误率对比 | 服务维度的错误率排行（条形量表） |
| 各项目错误率对比 | 项目维度的错误率排行（条形量表） |
| 错误分类统计 | 按错误分类 + 服务的详细统计（表格） |

### 🚨 告警总览 (`alerts-overview.json`)

提供告警状态概览和错误率监控。

| 面板 | 功能 |
|------|------|
| Alerting 告警数 | 当前 CRITICAL 级别告警数 |
| 近 5 分钟错误数 | 近 5 分钟 ERROR + CRITICAL 日志数 |
| 近 5 分钟警告数 | 近 5 分钟 WARNING 日志数 |
| 最近 24h 告警数 | 近 24 小时错误日志总数 |
| 当前活跃告警 | Grafana Alerting 活跃告警列表 |
| 5 分钟错误率 | 错误日志速率趋势 |
| 错误数趋势 | 错误日志数量趋势 |
| 告警规则配置指南 | 推荐的告警规则配置说明 |

---

## Template Variables 使用说明

`log-analytics.json` 和 `advanced-analytics.json` 提供以下级联变量：

| 变量 | 说明 | 联动方式 |
|------|------|---------|
| `server` | 服务器 IP | 独立，选择后影响 project |
| `project` | 项目名 | 根据 server 筛选 |
| `service` | 服务名 | 根据 server + project 筛选 |
| `severity` | 日志级别 | 独立，默认选中 ERROR/WARNING/CRITICAL |
| `search` | 关键词搜索 | 独立，用于日志流过滤 |

**使用方法**：
1. 在 Dashboard 顶部变量栏选择服务器 → 自动筛选出该服务器的项目列表
2. 选择项目 → 自动筛选出该项目的服务列表
3. 选择服务 → 所有面板自动更新为该服务的数据
4. 支持多选，选择 `All` 查看全局数据

---

## 告警规则配置指南

在 **Grafana → Alerting → Alert rules** 中创建以下告警规则：

### 规则1：错误率超过 5%（CRITICAL 告警）

```
名称: 错误率过高
类型: Loki 告警
查询: sum(rate({severity=~"ERROR|CRITICAL"} [5m])) / sum(rate({severity=~".+"} [5m])) > 0.05
评估间隔: 1m
Pending 时间: 5m
```

### 规则2：10 分钟内错误数超过 50（ERROR 告警）

```
名称: 错误数量过多
类型: Loki 告警
查询: sum(count_over_time({severity=~"ERROR|CRITICAL"} [10m])) > 50
评估间隔: 1m
Pending 时间: 0s
```

### 规则3：15 分钟内警告数超过 100（WARNING 告警）

```
名称: 警告数量过多
类型: Loki 告警
查询: sum(count_over_time({severity="WARNING"} [15m])) > 100
评估间隔: 2m
Pending 时间: 5m
```

### 规则4：出现 CRITICAL 日志（立即告警）

```
名称: CRITICAL 日志告警
类型: Loki 告警
查询: sum(count_over_time({severity="CRITICAL"} [1m])) > 0
评估间隔: 30s
Pending 时间: 0s
```

> 💡 **配置通知渠道**：在 **Alerting → Contact points** 中配置钉钉 Webhook、企业微信或邮件通知。
