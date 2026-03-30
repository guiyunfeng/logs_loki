# Loki 日志监控系统 - 业务架构完整框架

## 🎯 核心定位公式

```
唯一标识 = 服务器 + 项目名 + 服务名
```

**实际场景说明**：
- ✅ **混合云部署**（阿里云 + 腾讯云 + 自建机房）
- ✅ **传统物理机/虚拟机**（非 K8s 容器化）
- ✅ **多语言技术栈**（Nginx、PHP、MySQL、Redis、Go、C++、Python）
- ✅ **同一服务器运行多个项目**，通过目录路径区分

---

## 📂 目录结构示例

```bash
服务器: 192.168.1.10 (阿里云 - 华东上海)
├── /data/project-a/nginx/logs/          → server=192.168.1.10, project=project-a, service=nginx
├── /data/project-a/php-fpm/logs/        → server=192.168.1.10, project=project-a, service=php-fpm
└── /data/project-b/nginx/logs/          → server=192.168.1.10, project=project-b, service=nginx (同名服务，不同项目)

服务器: 192.168.2.10 (腾讯云 - 华北北京)
├── /data/user-api/go-service/logs/      → server=192.168.2.10, project=user-api, service=go-service
└── /data/order-api/python-service/logs/ → server=192.168.2.10, project=order-api, service=python-service

服务器: 192.168.3.10 (阿里云 - 华东上海)
├── /data/project-a/mysql/logs/          → server=192.168.3.10, project=project-a, service=mysql
└── /data/project-a/redis/logs/          → server=192.168.3.10, project=project-a, service=redis
```

---

## 🏷️ Loki 标签体系设计

### **核心三元组（必填）**

```yaml
{
  # 【核心三元组】- 唯一定位
  server: "192.168.1.10",       # 服务器IP
  project: "project-a",         # 项目名（从路径提取）
  service: "nginx",             # 服务名
  
  # 【日志分类】
  severity: "ERROR",            # CRITICAL / ERROR / WARNING / INFO
}
```

### **辅助标签（可选）**

```yaml
{
  # 【辅助信息】
  hostname: "web-server-01",    # 主机名
  region: "华东-上海",           # 地域
  cloud: "阿里云",              # 云厂商
  
  # 【服务类型】
  service_type: "gateway",      # web / api / database / cache / worker
  language: "Nginx 1.24",       # 技术栈
  port: "80",                   # 端口
  
  # 【错误分类】
  error_category: "upstream",   # database / network / business / upstream
  error_code: "TIMEOUT",        # 标准错误码
}
```

---

## ⚙️ Promtail 配置示例

### **从日志路径提取标签**

```yaml
scrape_configs:
  - job_name: app
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          server: "192.168.1.10"        # 每台服务器固定配置
          hostname: "web-server-01"     # 主机名
          region: "华东-上海"            # 地域
          cloud: "阿里云"               # 云厂商
    
    pipeline_stages:
      # 1. 从文件路径提取项目名和服务名
      - regex:
          expression: '/data/(?P<project>[^/]+)/(?P<service>[^/]+)/'
          source: filename
      
      # 2. 提取到标签
      - labels:
          project:
          service:
      
      # 3. 解析日志内容（JSON 格式示例）
      - json:
          expressions:
            timestamp: time
            level: level
            message: msg
      
      # 4. 映射日志级别到 severity
      - labels:
          severity: level
      
      # 5. 归一化消息（去掉动态变量）
      - template:
          source: message
          template: '{{ regexReplaceAll "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}" .Value "IP" }}'
```

### **日志路径映射示例**

| 日志文件路径 | 提取的标签 |
|------------|----------|
| `/data/project-a/nginx/logs/error.log` | `project=project-a`, `service=nginx` |
| `/data/user-api/go-service/logs/app.log` | `project=user-api`, `service=go-service` |
| `/data/project-b/mysql/logs/slow.log` | `project=project-b`, `service=mysql` |

---

## 📊 业务架构数据

### **3 个服务组 · 9 台服务器 · 16 个服务实例**

#### **1️⃣ Web 服务组**
```
服务器: 192.168.1.10 (web-server-01, 阿里云, 华东-上海)
  ├─ project-a / nginx      [gateway, Nginx 1.24, :80]     running
  ├─ project-a / php-fpm    [web, PHP 8.2, :9000]         running
  └─ project-b / nginx      [gateway, Nginx 1.24, :8080]  warning ⚠️

服务器: 192.168.1.11 (web-server-02, 阿里云, 华东-上海)
  ├─ project-a / nginx      [gateway, Nginx 1.24, :80]    running
  └─ project-c / nginx      [gateway, Nginx 1.24, :8888]  running
```

#### **2️⃣ API 服务组**
```
服务器: 192.168.2.10 (api-server-01, 腾讯云, 华北-北京)
  ├─ user-api / go-service        [api, Go 1.21, :8080]      running
  └─ order-api / python-service   [api, Python 3.11, :8000]  running

服务器: 192.168.2.11 (api-server-02, 腾讯云, 华北-北京)
  ├─ user-api / go-service        [api, Go 1.21, :8080]      error ❌
  └─ payment-api / cpp-service    [api, C++ 17, :9090]       running

服务器: 192.168.2.12 (api-server-03, 自建机房, 华南-深圳)
  └─ analytics / python-worker    [worker, Python 3.11, :5000] running
```

#### **3️⃣ 数据服务组**
```
服务器: 192.168.3.10 (db-server-01, 阿里云, 华东-上海)
  ├─ project-a / mysql      [database, MySQL 8.0, :3306]  running
  └─ project-a / redis      [cache, Redis 7.0, :6379]     running

服务器: 192.168.3.11 (db-server-02, 腾讯云, 华北-北京)
  ├─ project-b / mysql      [database, MySQL 8.0, :3306]  running
  └─ project-c / redis      [cache, Redis 7.0, :6379]     running

服务器: 192.168.3.12 (db-server-03, 自建机房, 华南-深圳)
  └─ common / redis         [cache, Redis 7.0, :6379]     running
```

---

## 🔍 LogQL 查询示例

### **场景 1：查询特定服务器上某个项目的某个服务的错误日志**
```logql
{
  server="192.168.1.10",
  project="project-a",
  service="nginx",
  severity="ERROR"
}
```

### **场景 2：统计某个项目所有服务的错误数（跨服务器）**
```logql
sum by(service) (
  count_over_time({
    project="project-a",
    severity="ERROR"
  }[1h])
)
```

### **场景 3：查找某台服务器上所有项目的错误**
```logql
{
  server="192.168.1.10",
  severity="ERROR"
} | json | line_format "{{.project}}/{{.service}}: {{.msg}}"
```

### **场景 4：按项目分组统计错误率**
```logql
sum by(project) (
  rate({severity="ERROR"}[5m])
)
```

### **场景 5：查询所有 nginx 服务的 upstream 超时错误（跨项目、跨服务器）**
```logql
{
  service="nginx",
  severity="ERROR"
} |~ "upstream.*timeout"
```

### **场景 6：定位具体实例的最近错误**
```logql
{
  server="192.168.2.11",
  project="user-api",
  service="go-service"
} | json | line_format "{{.timestamp}} {{.level}} {{.msg}}"
```

---

## 🎨 可视化组件说明

### **1️⃣ 服务拓扑页 (ServiceTopologyMap)**

**功能**：
- 按服务组展示所有服务器卡片
- 每个服务器卡片显示：主机名、IP、地域、云厂商
- 点击服务器查看该服务器上运行的所有服务实例
- 实时显示：CPU、内存、24h错误数

**适用场景**：
- 快速了解整体服务器分布
- 定位高负载服务器
- 查看某台服务器上运行了哪些项目的哪些服务

### **2️⃣ 基础设施视图 (InfrastructureView)**

**功能**：
- 按项目分组展示（三层树：项目 → 服务器 → 服务实例）
- 统计每个项目的健康率和错误数
- 点击展开项目，查看该项目在哪些服务器上有部署
- 点击实例，右侧显示完整信息和 Loki 查询示例

**适用场景**：
- 查看某个项目的所有服务部署情况
- 快速找到 project-a 在哪些服务器上运行
- 定位跨服务器的同一项目的服务问题

---

## 🚨 告警场景示例

### **场景 1：单服务器上某个项目的某个服务异常**

**告警触发**：
```
192.168.1.10 上 project-b/nginx 5分钟内 ERROR > 50 次
```

**定位步骤**：
1. 打开 `/architecture` 页面 → "服务拓扑" Tab
2. 找到 web-server-01 (192.168.1.10) 卡片
3. 点击查看该服务器运行的服务列表
4. 看到 project-b / nginx 状态为 warning ⚠️
5. 查看错误：`Too many open files`
6. SSH 登录 192.168.1.10，检查 `/data/project-b/nginx/`

**Grafana Alert Rule**：
```logql
count_over_time({
  server="192.168.1.10",
  project="project-b",
  service="nginx",
  severity="ERROR"
}[5m]) > 50
```

**告警通知**：
```
【ERROR 告警】
服务器: 192.168.1.10 (web-server-01)
项目: project-b
服务: nginx
错误数: 68 errors / 5min
最近错误: Too many open files
负责人: @李四 (13900139000)
```

---

### **场景 2：同一项目跨多台服务器故障**

**告警触发**：
```
project-a 整体错误率 > 100/min
```

**定位步骤**：
1. 打开 `/architecture` 页面 → "基础设施" Tab
2. 点击展开 project-a 项目
3. 看到该项目在 3 台服务器上有部署：
   - 192.168.1.10: nginx ✅, php-fpm ✅
   - 192.168.1.11: nginx ✅
   - 192.168.3.10: mysql ⚠️, redis ✅
4. 发现 mysql 异常，查看错误：`Slow query detected`
5. 定位问题：MySQL 慢查询导致整个项目响应慢

**Grafana Alert Rule**：
```logql
sum(rate({
  project="project-a",
  severity="ERROR"
}[1m])) > 100
```

---

## 📝 完整业务流程

```
1️⃣ 【日志产生】
   192.168.1.10 上 project-a/nginx 产生错误日志
   /data/project-a/nginx/logs/error.log
   ↓

2️⃣ 【Promtail 采集】
   读取日志文件
   从路径提取: project=project-a, service=nginx
   固定标签: server=192.168.1.10, hostname=web-server-01
   ↓

3️⃣ 【Pipeline 预处理】
   - 解析 JSON 日志
   - 提取 severity=ERROR
   - 归一化消息（去掉动态IP、订单号等）
   ↓

4️⃣ 【写入 Loki】
   标签: {server="192.168.1.10", project="project-a", service="nginx", severity="ERROR"}
   ↓

5️⃣ 【Grafana 监控】
   Dashboard 实时展示:
   - 按项目聚合错误数
   - 按服务器聚合错误数
   - 按服务类型聚合错误数
   ↓

6️⃣ 【告警触发】
   规则: 单实例 5分钟 ERROR > 50
   匹配: {server="192.168.1.10", project="project-a", service="nginx", severity="ERROR"}
   ↓

7️⃣ 【钉钉告警】
   服务器: 192.168.1.10 (web-server-01, 阿里云, 华东-上海)
   项目: project-a
   服务: nginx
   路径: /data/project-a/nginx/logs/
   负责人: @张三 (13800138000)
   ↓

8️⃣ 【问题定位】
   SSH 登录 192.168.1.10
   cd /data/project-a/nginx/logs/
   tail -f error.log
```

---

## ✅ 核心优势总结

| 问题 | 解决方案 |
|------|---------|
| ❌ 同一服务器多个 nginx，分不清是哪个 | ✅ `server + project + service` 三元组唯一定位 |
| ❌ 不知道某个项目部署在哪些服务器上 | ✅ "基础设施视图" 按项目分组展示 |
| ❌ 只看到 IP，不知道是哪个云厂商哪个地域 | ✅ 标签包含 `hostname`、`region`、`cloud` |
| ❌ 日志路径混乱，手动配置麻烦 | ✅ Promtail 正则自动提取 `/data/<project>/<service>/` |
| ❌ 告警信息不够详细，无法快速定位 | ✅ 告警包含完整三元组 + 路径 + 负责人 |

---

## 📁 文件结构

```
/src/app/
├── config/
│   └── businessArchitecture.ts         # 业务架构定义（9台服务器，16个实例）
├── components/
│   ├── ArchitecturePage.tsx            # 架构总览页面
│   ├── ServiceTopologyMap.tsx          # 服务拓扑视图（按服务组展示服务器）
│   ├── InfrastructureView.tsx          # 基础设施视图（按项目展示部署）
│   ├── LogProcessSimulator.tsx         # 日志清理模拟器
│   ├── FlowPage.tsx                    # 日志处理页面
│   ├── SystemPage.tsx                  # Grafana 监控页面
│   └── LandingPage.tsx                 # 首页（3个入口）
└── routes.ts                           # 路由配置
```

---

**设计完成时间**：2026-03-27  
**适用场景**：传统混合云部署，一台服务器运行多个项目，通过目录路径区分服务
