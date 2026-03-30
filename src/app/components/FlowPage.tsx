import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, ArrowRight, ArrowDown, ChevronDown, ChevronRight,
  Database, Server, BarChart3, Monitor,
  FileText, Activity,
  Filter, Tag, Search, Zap, GitBranch,
  CheckCircle, XCircle, Eye,
  HardDrive, Cpu, Network,
  RefreshCcw,
  TrendingUp, Workflow, Brain,
  CircleDot, Timer,
  Hash, Scissors, Layers, Type,
  Code, AlignLeft, WrapText,
  Eraser, SlidersHorizontal, Braces, Tags,
  Bug, FileCode, Merge,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LogProcessSimulator } from './LogProcessSimulator';

/* ═══════════════════════════════════════════════════════════════
   Tab 定义 — 聚焦日志预处理
   ═══════════════════════════════════════════════════════════════ */
type TabId = 'challenges' | 'pipeline' | 'normalize' | 'result' | 'simulator';

const tabs: { id: TabId; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { id: 'challenges', label: '日志挑战', icon: <Bug className="w-4 h-4" />, desc: '真实日志有多乱', color: 'text-red-400' },
  { id: 'pipeline', label: 'Pipeline 处理', icon: <SlidersHorizontal className="w-4 h-4" />, desc: '12 阶段逐步清洗', color: 'text-amber-400' },
  { id: 'normalize', label: '归一化策略', icon: <Sparkles className="w-4 h-4" />, desc: '去噪 · 聚类 · 分级', color: 'text-indigo-400' },
  { id: 'result', label: '处理结果', icon: <CheckCircle className="w-4 h-4" />, desc: '清洗前后对比', color: 'text-emerald-400' },
  { id: 'simulator', label: '在线模拟器', icon: <Code className="w-4 h-4" />, desc: '实时清洗预览', color: 'text-purple-400' },
];

/* ═══════════════════════════════════════════════════════════════
   Tab 1: 日志挑战 — 真实场景中日志有多乱
   ═══════════════════════════════════════════════════════════════ */

const logChallenges = [
  {
    id: 'format',
    title: '格式混乱',
    subtitle: '同一系统中 JSON、纯文本、XML 混杂',
    icon: <Braces className="w-5 h-5" />,
    color: 'text-red-400',
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    examples: [
      {
        service: 'order-service (Spring Boot)',
        format: 'JSON',
        raw: `{"timestamp":"2026-03-27T14:30:01.234Z","level":"ERROR","service":"order-service","thread":"http-8080-exec-3","class":"OrderController","message":"订单创建失败: 库存不足","error_code":"INVENTORY_INSUFFICIENT","order_id":"ORD-20260327-8842","trace_id":"abc123def456","stack_trace":"java.lang.RuntimeException: 库存不足\\n  at OrderService.create(OrderService.java:142)\\n  at OrderController.post(OrderController.java:67)"}`,
        problem: '标准 JSON，可直接解析',
        difficulty: '简单',
        diffColor: 'text-green-400',
      },
      {
        service: 'nginx-ingress',
        format: '自定义文本',
        raw: `2026/03/27 14:30:01 [error] 1234#0: *56789 upstream timed out (110: Connection timed out) while connecting to upstream, client: 10.0.3.45, server: api.example.com, request: "POST /api/v1/orders HTTP/1.1", upstream: "http://10.0.5.12:8080/api/v1/orders", host: "api.example.com"`,
        problem: 'Nginx 自有格式，字段用逗号分隔，需要正则提取',
        difficulty: '中等',
        diffColor: 'text-yellow-400',
      },
      {
        service: 'mysql-cluster (慢查询)',
        format: '多行文本',
        raw: `# Time: 2026-03-27T14:30:01.000000Z
# User@Host: app_user[app_user] @ [10.0.5.12]  Id: 42
# Query_time: 12.345678  Lock_time: 0.000123  Rows_sent: 0  Rows_examined: 1500000
SET timestamp=1774628401;
SELECT * FROM orders WHERE user_id = 8842 AND status IN ('pending','processing') ORDER BY created_at DESC;`,
        problem: '多行日志，#号注释行 + SQL 语句，需要先合并再解析',
        difficulty: '困难',
        diffColor: 'text-orange-400',
      },
      {
        service: 'auth-service (异常堆栈)',
        format: 'Java Stack Trace',
        raw: `2026-03-27 14:30:01.234 ERROR [auth-service,abc123,def456] --- [http-8080-exec-5] c.e.a.s.TokenService : Token验证失败
java.security.SignatureException: JWT signature does not match locally computed signature
    at io.jsonwebtoken.impl.DefaultJwtParser.parse(DefaultJwtParser.java:354)
    at io.jsonwebtoken.impl.DefaultJwtParser.parseClaimsJws(DefaultJwtParser.java:404)
    at com.example.auth.service.TokenService.validate(TokenService.java:89)
    at com.example.auth.filter.JwtFilter.doFilter(JwtFilter.java:42)
    at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:107)
    ... 28 more`,
        problem: '首行是日志头 + 多行堆栈，需要合并为一条，且堆栈可能很长需裁剪',
        difficulty: '困难',
        diffColor: 'text-orange-400',
      },
      {
        service: 'redis-cluster (原始输出)',
        format: '纯文本 + PID',
        raw: `42:M 27 Mar 2026 14:30:01.234 # Client id=1234 addr=10.0.5.12:54321 fd=8 name= db=0 flags=N multi=-1 qbuf=26 qbuf-free=32742 obl=0 oll=0 events=r cmd=get scheduled to be closed ASAP for overcoming of output buffer limits.`,
        problem: 'Redis 自有日志格式，# 标记级别，无标准字段分隔',
        difficulty: '困难',
        diffColor: 'text-orange-400',
      },
      {
        service: 'k8s-events',
        format: 'kubectl 输出风格',
        raw: `E0327 14:30:01.234567       1 pod_workers.go:918] "Error syncing pod, skipping" err="failed to 'StartContainer' for 'app' with CrashLoopBackOff: back-off 5m0s restarting failed container=app pod=order-service-7d4b8c6f9-x4k2n_prod(uid-abc-123)"`,
        problem: 'Go 日志格式，错误信息嵌套在引号中，包含 Pod/Namespace 等 K8s 元数据',
        difficulty: '中等',
        diffColor: 'text-yellow-400',
      },
    ],
  },
  {
    id: 'length',
    title: '日志过长',
    subtitle: '堆栈轨迹、SQL 语句、请求体动辄数 KB',
    icon: <Scissors className="w-5 h-5" />,
    color: 'text-orange-400',
    bg: 'bg-orange-500/5',
    border: 'border-orange-500/20',
    scenarios: [
      { type: 'Java 堆栈', typical: '50-200 行', problem: '嵌套异常 Caused by 链可达 100+ 行', solution: '保留前 5 行堆栈 + Caused by 首行' },
      { type: '慢 SQL', typical: '1-50 KB', problem: 'IN 子句含数千个 ID', solution: '截断 SQL 至 500 字符 + 参数摘要' },
      { type: 'HTTP 请求体', typical: '1-100 KB', problem: '请求/响应 Body 被完整打印', solution: '只保留前 200 字符 + Content-Length' },
      { type: '序列化对象', typical: '1-500 KB', problem: 'toString() 打印整个对象树', solution: '移除或截断至关键字段摘要' },
      { type: '批处理日志', typical: '重复 N 行', problem: '循环中每条记录打一行，产生万行同类日志', solution: '采样 + 计数摘要' },
    ],
  },
  {
    id: 'similar',
    title: '相似日志去重难',
    subtitle: '内容几乎一样，但 ID、时间戳、IP 不同',
    icon: <Merge className="w-5 h-5" />,
    color: 'text-violet-400',
    bg: 'bg-violet-500/5',
    border: 'border-violet-500/20',
    pairs: [
      {
        label: '请求 ID 不同',
        logA: 'OrderService - 订单创建失败: 库存不足 [orderId=ORD-20260327-8842, userId=10042]',
        logB: 'OrderService - 订单创建失败: 库存不足 [orderId=ORD-20260327-9913, userId=20085]',
        variable: 'orderId, userId',
        strategy: '替换 ID 为占位符 → "订单创建失败: 库存不足 [orderId=<ID>, userId=<ID>]"',
      },
      {
        label: 'IP 地址不同',
        logA: 'Connection refused: connect to 10.0.5.12:3306 from 10.0.3.45:54321',
        logB: 'Connection refused: connect to 10.0.5.12:3306 from 10.0.3.78:54987',
        variable: '源 IP, 源端口',
        strategy: '正则替换 IP:Port → "Connection refused: connect to <HOST>:3306 from <CLIENT>"',
      },
      {
        label: '时间戳不同',
        logA: '[2026-03-27 14:30:01] Timeout after 5000ms waiting for connection',
        logB: '[2026-03-27 14:30:03] Timeout after 5000ms waiting for connection',
        variable: '时间戳',
        strategy: '时间戳已由 Promtail 独立提取，日志模板中去除时间 → "Timeout after 5000ms..."',
      },
      {
        label: '数值不同',
        logA: 'Memory usage critical: 92.3% (7384MB / 8000MB), GC count: 342',
        logB: 'Memory usage critical: 94.1% (7528MB / 8000MB), GC count: 358',
        variable: '百分比, 内存值, GC次数',
        strategy: '提取数值为 metric 标签 → 日志模板化为 "Memory usage critical: <PERCENT>%"',
      },
    ],
  },
  {
    id: 'multiline',
    title: '多行日志合并',
    subtitle: '堆栈异常、慢查询被拆成多条独立日志',
    icon: <WrapText className="w-5 h-5" />,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/5',
    border: 'border-cyan-500/20',
    cases: [
      {
        name: 'Java 异常堆栈',
        startPattern: '^\\d{4}-\\d{2}-\\d{2}',
        desc: '以日期开头为新日志的起点，后续以空格/tab开头的行合并到上一条',
        lines: 6,
      },
      {
        name: 'Python Traceback',
        startPattern: '^Traceback|^\\S',
        desc: 'Traceback 开始 → 多行缩进 → 最后一行异常类型，需完整合并',
        lines: 8,
      },
      {
        name: 'MySQL 慢查询',
        startPattern: '^# Time:',
        desc: '以 # Time: 开头的块为一条完整慢查询记录',
        lines: 5,
      },
      {
        name: 'Go Panic',
        startPattern: '^goroutine|^panic',
        desc: 'panic 后跟 goroutine 堆栈，以空行结束',
        lines: 15,
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   Tab 2: Pipeline 12 阶段
   ═══════════════════════════════════════════════════════════════ */

const pipelineStages = [
  {
    phase: '采集层',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    stages: [
      {
        name: 'docker / cri',
        purpose: '解析容器运行时日志格式',
        icon: <Layers className="w-4 h-4" />,
        desc: 'Docker 和 CRI 运行时会在日志外层包裹一层 JSON（含 stream、time 字段），此阶段剥离外层，提取原始应用日志',
        config: `pipeline_stages:
  - cri: {}   # 或 docker: {}
  # 输入: {"log":"app log here\\n","stream":"stderr","time":"2026-03-27T..."}
  # 输出: app log here`,
        inputLabel: '容器包裹的 JSON',
        outputLabel: '原始应用日志文本',
      },
      {
        name: 'multiline',
        purpose: '多行日志合并为单条',
        icon: <WrapText className="w-4 h-4" />,
        desc: 'Java 异常堆栈、Python Traceback、SQL 等多行内容需合并为一条完整日志。通过 firstline 正则匹配新日志的起始行',
        config: `pipeline_stages:
  - multiline:
      firstline: '^\d{4}-\d{2}-\d{2}[T ]\\d{2}:\\d{2}:\\d{2}'
      max_wait_time: 3s
      max_lines: 50    # 防止无限合并
  # 效果: 堆栈异常从 N 行 → 合并为 1 条日志`,
        inputLabel: 'N 行分散的日志',
        outputLabel: '1 条完整日志（含堆栈）',
      },
    ],
  },
  {
    phase: '解析层',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    stages: [
      {
        name: 'json',
        purpose: '解析 JSON 格式日志',
        icon: <Braces className="w-4 h-4" />,
        desc: '从 JSON 日志中提取指定字段到 extracted map。支持嵌套路径（如 context.user_id）',
        config: `pipeline_stages:
  - json:
      expressions:
        level: level               # 顶层字段
        service: service
        message: message
        error_code: error_code
        trace_id: trace_id
        user_id: context.user_id   # 嵌套字段
        stack: stack_trace
  # 提取结果存入 extracted data map, 后续阶段可引用`,
        inputLabel: 'JSON 日志文本',
        outputLabel: 'extracted map 中的结构化字段',
      },
      {
        name: 'regex',
        purpose: '正则提取非 JSON 日志字段',
        icon: <Search className="w-4 h-4" />,
        desc: '对于 Nginx、Redis、MySQL 等非 JSON 格式日志，使用命名分组正则从文本中提取字段',
        config: `pipeline_stages:
  # Nginx error log 解析
  - regex:
      expression: >-
        ^(?P<timestamp>\\d{4}/\\d{2}/\\d{2} [\\d:]+)
        \\[(?P<level>\\w+)\\]
        .*upstream timed out.*
        client: (?P<client_ip>[\\d.]+),
        .*request: "(?P<method>\\w+) (?P<path>[^ ]+) .*",
        upstream: "(?P<upstream>[^"]+)"

  # Redis log 解析
  - regex:
      expression: >-
        ^\\d+:[A-Z] (?P<timestamp>\\d+ \\w+ \\d{4} [\\d:.]+)
        (?P<level>[#*]) (?P<message>.+)$`,
        inputLabel: '非结构化文本',
        outputLabel: '命名分组提取的字段',
      },
      {
        name: 'logfmt',
        purpose: '解析 key=value 格式',
        icon: <AlignLeft className="w-4 h-4" />,
        desc: '部分 Go 服务使用 logfmt（level=error msg="..." service=gateway），直接按 key=value 拆解',
        config: `pipeline_stages:
  - logfmt:
      mapping:
        level:
        msg:
        service:
        err:
        duration:
  # 输入: level=error msg="connection refused" service=gateway duration=5.2s
  # 自动提取为 extracted map`,
        inputLabel: 'key=value 文本',
        outputLabel: 'extracted map',
      },
    ],
  },
  {
    phase: '清洗层',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    stages: [
      {
        name: 'replace',
        purpose: '归一化可变部分（ID、IP、数值）',
        icon: <RefreshCcw className="w-4 h-4" />,
        desc: '这是日志去重的关键！将 orderId、IP、端口等可变部分替换为占位符，使同类日志产生相同的「日志模板」',
        config: `pipeline_stages:
  # 替换各种 ID
  - replace:
      expression: '(orderId|userId|traceId|requestId)=([\\w-]+)'
      replace: '{{ .Name }}=<ID>'

  # 替换 IP:Port
  - replace:
      expression: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d+)?'
      replace: '<HOST>'

  # 替换纯数字 ID (如 uid=10042)
  - replace:
      expression: '(?<=\\W)\\d{4,}(?=\\W)'
      replace: '<NUM>'

  # 效果: 不同 ID 的相同错误 → 同一模板 → 可聚合统计`,
        inputLabel: '含可变 ID/IP/数值的日志',
        outputLabel: '模板化日志（可聚合）',
        highlight: true,
      },
      {
        name: 'template',
        purpose: 'Go template 复杂字段变换',
        icon: <Code className="w-4 h-4" />,
        desc: '使用 Go template 语法对 extracted 字段做复杂变换：级别映射、条件判断、字符串截取等',
        config: `pipeline_stages:
  # severity 综合分级
  - template:
      source: severity
      template: >-
        {{ if or (eq .level "fatal") (eq .level "FATAL") }}CRITICAL
        {{ else if or (eq .level "error") (eq .level "ERROR") }}ERROR
        {{ else if or (eq .level "warn") (eq .level "warning") }}WARNING
        {{ else }}INFO{{ end }}

  # Nginx level 映射 (# → error, * → warning)
  - template:
      source: severity
      template: >-
        {{ if eq .level "#" }}ERROR
        {{ else if eq .level "*" }}WARNING
        {{ else }}INFO{{ end }}

  # 堆栈截断至前 5 行
  - template:
      source: short_stack
      template: >-
        {{ with .stack }}{{ slice . 0 (min (len .) 500) }}{{ end }}`,
        inputLabel: 'extracted 字段',
        outputLabel: '变换后的新字段',
      },
      {
        name: 'drop',
        purpose: '丢弃无价值日志',
        icon: <Eraser className="w-4 h-4" />,
        desc: '健康检查、心跳、DEBUG 级别等日志在生产环境中大量存在但无分析价值，直接丢弃以减少存储',
        config: `pipeline_stages:
  # 丢弃健康检查
  - drop:
      source: message
      expression: '(healthcheck|health_check|/health|/ready|/live|ping)'

  # 丢弃 DEBUG/TRACE 级别
  - drop:
      source: level
      expression: '(debug|trace|DEBUG|TRACE)'

  # 丢弃特定 User-Agent (监控探针)
  - drop:
      source: message
      expression: 'kube-probe|Prometheus|ELB-HealthChecker'

  # 预计可丢弃 40-60% 的无效日志`,
        inputLabel: '所有日志',
        outputLabel: '过滤后的有效日志',
      },
      {
        name: 'limit',
        purpose: '限流 & 截断',
        icon: <Scissors className="w-4 h-4" />,
        desc: '对单条日志长度截断（防止巨型 SQL / 请求体），对高频日志限流（防止日志风暴打爆 Loki）',
        config: `pipeline_stages:
  # 截断超长日志行（保留前 2000 字符）
  - template:
      source: output
      template: '{{ slice .message 0 (min (len .message) 2000) }}'

  # 使用 limit stage 限流
  - limit:
      rate: 100          # 每秒最多 100 条
      burst: 200         # 突发允许 200 条
      drop: true         # 超限则丢弃

  # 或对特定级别限流
  - match:
      selector: '{level="info"}'
      stages:
        - limit:
            rate: 10     # INFO 日志限流更严格
            burst: 50`,
        inputLabel: '可能超长/高频的日志',
        outputLabel: '长度安全、速率可控的日志',
      },
    ],
  },
  {
    phase: '输出层',
    color: 'text-violet-400',
    borderColor: 'border-violet-500/20',
    stages: [
      {
        name: 'labels',
        purpose: '提取字段写入 Loki 标签',
        icon: <Tags className="w-4 h-4" />,
        desc: '将 extracted map 中的字段提升为 Loki 标签（label）。标签用于索引，是 LogQL 查询的基础。注意：高基数字段（如 user_id）不应作为标签',
        config: `pipeline_stages:
  - labels:
      service:           # ✅ 低基数，适合做标签
      severity:          # ✅ 只有 4 个值
      error_code:        # ✅ 有限的错误类型
      namespace:         # ✅ 有限的命名空间
      # user_id:         # ❌ 高基数，不要做标签！
      # trace_id:        # ❌ 高基数，放在日志内容中
      # order_id:        # ❌ 高基数，放在日志内容中

  # 标签基数原则:
  # < 100 种值 → 适合做标签
  # 100-1000 → 谨慎考虑
  # > 1000 → 绝对不要做标签`,
        inputLabel: 'extracted map',
        outputLabel: 'Loki 标签',
        highlight: true,
      },
      {
        name: 'timestamp',
        purpose: '解析日志自带的时间戳',
        icon: <Timer className="w-4 h-4" />,
        desc: '将日志中的时间字符串解析为精确时间戳，替代 Promtail 接收时间。不同服务的时间格式可能不同',
        config: `pipeline_stages:
  # Java / Spring Boot
  - timestamp:
      source: timestamp
      format: '2006-01-02T15:04:05.000Z'     # Go 格式

  # Nginx
  - timestamp:
      source: timestamp
      format: '2006/01/02 15:04:05'

  # MySQL
  - timestamp:
      source: timestamp
      format: '2006-01-02T15:04:05.000000Z'

  # Unix timestamp
  - timestamp:
      source: timestamp
      format: 'Unix'`,
        inputLabel: '各种格式的时间字符串',
        outputLabel: 'Unix 纳秒时间戳',
      },
      {
        name: 'output',
        purpose: '重组最终日志输出格式',
        icon: <FileCode className="w-4 h-4" />,
        desc: '控制最终写入 Loki 的日志内容格式。可以重组为统一的结构化格式，移除冗余信息',
        config: `pipeline_stages:
  # 统一输出为简洁格式
  - output:
      source: output_line

  # 配合 template 构建 output_line
  - template:
      source: output_line
      template: >-
        [{{ .severity }}] {{ .service }} | {{ .error_code }}
        | {{ .message }}
        {{ if .short_stack }}| stack: {{ .short_stack }}{{ end }}

  # 效果:
  # 输入: 各种杂乱格式的原始日志
  # 输出: [ERROR] order-service | INVENTORY_INSUFFICIENT
  #       | 订单创建失败: 库存不足 | stack: ...前5行...`,
        inputLabel: '原始日志文本',
        outputLabel: '统一格式的清洁日志',
        highlight: true,
      },
      {
        name: 'metrics',
        purpose: '从日志中提取 Prometheus 指标',
        icon: <BarChart3 className="w-4 h-4" />,
        desc: '在 Promtail 侧直接将日志转化为计数器/直方图指标，供 Prometheus 抓取，减少 Grafana 对 Loki 的查询压力',
        config: `pipeline_stages:
  # 错误计数器
  - metrics:
      error_total:
        type: Counter
        description: "错误日志总数"
        source: severity
        config:
          match_all: true
          action: inc
          match_all: false
          value: ERROR|CRITICAL

  # 响应时间直方图
  - metrics:
      response_duration:
        type: Histogram
        description: "请求响应时间"
        source: duration
        config:
          buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10]`,
        inputLabel: '日志中的数值/状态',
        outputLabel: 'Prometheus 指标',
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   Tab 3: 归一化策略
   ═══════════════════════════════════════════════════════════════ */

const normalizeStrategies = [
  {
    id: 'template',
    title: '日志模板化',
    subtitle: '将可变部分替换为占位符，生成统一的日志模板',
    icon: <Type className="w-5 h-5" />,
    color: 'text-violet-400',
    examples: [
      {
        before: '订单创建失败: 库存不足 [orderId=ORD-20260327-8842, userId=10042, item=SKU-2345]',
        after:  '订单创建失败: 库存不足 [orderId=<ID>, userId=<ID>, item=<ID>]',
        template: 'order_create_inventory_insufficient',
      },
      {
        before: 'Connection refused: connect to 10.0.5.12:3306 from 10.0.3.45:54321 (timeout=5000ms)',
        after:  'Connection refused: connect to <HOST>:<PORT> from <HOST>:<PORT> (timeout=<NUM>ms)',
        template: 'mysql_connection_refused',
      },
      {
        before: 'JWT signature does not match at DefaultJwtParser.java:354',
        after:  'JWT signature does not match at DefaultJwtParser.java:<NUM>',
        template: 'jwt_signature_mismatch',
      },
    ],
  },
  {
    id: 'error_code',
    title: 'error_code 标准化',
    subtitle: '为每种错误定义统一的错误码，作为聚合的核心维度',
    icon: <Hash className="w-5 h-5" />,
    color: 'text-amber-400',
    codeSystem: [
      { code: 'AUTH_TOKEN_EXPIRED', service: 'auth-service', pattern: 'Token.*expired|JWT.*expired', severity: 'WARNING' },
      { code: 'AUTH_SIGNATURE_FAIL', service: 'auth-service', pattern: 'signature.*not match|SignatureException', severity: 'ERROR' },
      { code: 'AUTH_BRUTE_FORCE', service: 'auth-service', pattern: '连续登录失败.*超过', severity: 'CRITICAL' },
      { code: 'ORDER_INVENTORY', service: 'order-service', pattern: '库存不足|InventoryInsufficient', severity: 'ERROR' },
      { code: 'ORDER_TIMEOUT', service: 'order-service', pattern: '订单.*超时|OrderTimeout', severity: 'ERROR' },
      { code: 'PAY_CHANNEL_TIMEOUT', service: 'payment-service', pattern: '支付通道.*超时|ChannelTimeout', severity: 'CRITICAL' },
      { code: 'PAY_SIGN_FAIL', service: 'payment-service', pattern: '签名验证失败|SignVerifyFailed', severity: 'ERROR' },
      { code: 'DB_SLOW_QUERY', service: 'mysql-cluster', pattern: 'Query_time: [\\d.]+ ', severity: 'WARNING' },
      { code: 'DB_DEADLOCK', service: 'mysql-cluster', pattern: 'Deadlock found', severity: 'ERROR' },
      { code: 'DB_CONN_LIMIT', service: 'mysql-cluster', pattern: 'Too many connections|ConnLimitExceeded', severity: 'CRITICAL' },
      { code: 'REDIS_FAILOVER', service: 'redis-cluster', pattern: 'failover|FAILOVER|主从切换', severity: 'CRITICAL' },
      { code: 'REDIS_OOM', service: 'redis-cluster', pattern: 'OOM|out of memory|maxmemory', severity: 'CRITICAL' },
      { code: 'K8S_CRASH_LOOP', service: 'k8s-nodes', pattern: 'CrashLoopBackOff', severity: 'ERROR' },
      { code: 'K8S_OOM_KILLED', service: 'k8s-nodes', pattern: 'OOMKilled', severity: 'CRITICAL' },
      { code: 'GW_RATE_LIMIT', service: 'api-gateway', pattern: 'rate.?limit|429|Too Many Requests', severity: 'WARNING' },
      { code: 'GW_CIRCUIT_OPEN', service: 'api-gateway', pattern: 'circuit.?breaker.*open|CircuitBreakerOpen', severity: 'ERROR' },
      { code: 'NGINX_UPSTREAM_TIMEOUT', service: 'nginx-ingress', pattern: 'upstream timed out', severity: 'ERROR' },
      { code: 'NGINX_502', service: 'nginx-ingress', pattern: '502 Bad Gateway|502', severity: 'ERROR' },
    ],
    config: `pipeline_stages:
  # 通过 match + template 生成 error_code
  - match:
      selector: '{job="app"}'
      stages:
        - regex:
            expression: '(?P<raw_msg>.*)'
        - template:
            source: error_code
            template: >-
              {{ if regexMatch "库存不足|InventoryInsufficient" .raw_msg }}ORDER_INVENTORY
              {{ else if regexMatch "支付通道.*超时" .raw_msg }}PAY_CHANNEL_TIMEOUT
              {{ else if regexMatch "CrashLoopBackOff" .raw_msg }}K8S_CRASH_LOOP
              {{ else if regexMatch "upstream timed out" .raw_msg }}NGINX_UPSTREAM_TIMEOUT
              {{ else }}UNKNOWN{{ end }}
        - labels:
            error_code:`,
  },
  {
    id: 'severity',
    title: 'severity 统一分级',
    subtitle: '不同服务的级别表示不同，需统一为 4 级',
    icon: <GitBranch className="w-5 h-5" />,
    color: 'text-red-400',
    mapping: [
      { unified: 'CRITICAL', sources: ['fatal', 'FATAL', 'emerg', 'crit', 'alert'], desc: '服务不可用 / 数据丢失风险', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
      { unified: 'ERROR', sources: ['error', 'ERROR', 'err', '#(Redis)'], desc: '功能异常但服务仍在运行', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
      { unified: 'WARNING', sources: ['warn', 'WARNING', 'warning', '*(Redis)'], desc: '潜在问题 / 性能下降', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
      { unified: 'INFO', sources: ['info', 'INFO', 'notice'], desc: '正常运行信息（通常已被 drop）', color: 'bg-gray-800/60 text-gray-400 border-gray-700' },
    ],
    config: `pipeline_stages:
  - template:
      source: severity
      template: >-
        {{ $l := toLower .level }}
        {{ if or (eq $l "fatal") (eq $l "emerg") (eq $l "crit") }}CRITICAL
        {{ else if or (eq $l "error") (eq $l "err") (eq .level "#") }}ERROR
        {{ else if or (eq $l "warn") (eq $l "warning") (eq .level "*") }}WARNING
        {{ else }}INFO{{ end }}

  # 额外: 根据错误内容升级 severity
  - template:
      source: severity
      template: >-
        {{ if and (eq .severity "ERROR")
           (regexMatch "数据丢失|data loss|主节点宕机" .message) }}CRITICAL
        {{ else }}{{ .severity }}{{ end }}`,
  },
];

/* ═══════════════════════════════════════════════════════════════
   Tab 4: 处理结果 — 清洗前后对比
   ═══════════════════════════════════════════════════════════════ */

const beforeAfterExamples = [
  {
    service: 'order-service',
    serviceColor: 'text-blue-400',
    raw: `{"timestamp":"2026-03-27T14:30:01.234Z","level":"ERROR","service":"order-service","thread":"http-8080-exec-3","class":"com.example.order.controller.OrderController","message":"订单创建失败: 库存不足","error_code":"INVENTORY_INSUFFICIENT","order_id":"ORD-20260327-8842","user_id":10042,"item_sku":"SKU-2345","requested_qty":5,"available_qty":2,"trace_id":"abc123def456","span_id":"span789","stack_trace":"java.lang.RuntimeException: 库存不足\\n  at OrderService.create(OrderService.java:142)\\n  at OrderController.post(OrderController.java:67)\\n  at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\\n  at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:897)\\n  ... 28 more"}`,
    labels: {
      service: 'order-service',
      severity: 'ERROR',
      error_code: 'ORDER_INVENTORY',
      namespace: 'prod',
      job: 'app',
    },
    output: '[ERROR] order-service | ORDER_INVENTORY | 订单创建失败: 库存不足 | stack: RuntimeException@OrderService:142',
    dropped: ['thread', 'class', 'span_id', '完整堆栈(仅保留首行)'],
  },
  {
    service: 'nginx-ingress',
    serviceColor: 'text-purple-400',
    raw: `2026/03/27 14:30:01 [error] 1234#0: *56789 upstream timed out (110: Connection timed out) while connecting to upstream, client: 10.0.3.45, server: api.example.com, request: "POST /api/v1/orders HTTP/1.1", upstream: "http://10.0.5.12:8080/api/v1/orders", host: "api.example.com"`,
    labels: {
      service: 'nginx-ingress',
      severity: 'ERROR',
      error_code: 'NGINX_UPSTREAM_TIMEOUT',
      namespace: 'ingress-nginx',
      job: 'infra',
    },
    output: '[ERROR] nginx-ingress | NGINX_UPSTREAM_TIMEOUT | upstream timed out connecting to <HOST>:<PORT>, path: /api/v1/orders',
    dropped: ['PID信息(1234#0)', '连接序号(*56789)', '客户端IP', '完整upstream地址'],
  },
  {
    service: 'mysql-cluster (慢查询)',
    serviceColor: 'text-cyan-400',
    raw: `# Time: 2026-03-27T14:30:01.000000Z
# User@Host: app_user[app_user] @ [10.0.5.12]  Id: 42
# Query_time: 12.345678  Lock_time: 0.000123  Rows_sent: 0  Rows_examined: 1500000
SET timestamp=1774628401;
SELECT * FROM orders WHERE user_id = 8842 AND status IN ('pending','processing') ORDER BY created_at DESC;`,
    labels: {
      service: 'mysql-cluster',
      severity: 'WARNING',
      error_code: 'DB_SLOW_QUERY',
      namespace: 'database',
      job: 'infra',
    },
    output: '[WARNING] mysql-cluster | DB_SLOW_QUERY | query_time=12.35s rows_examined=1500000 | SQL: SELECT * FROM orders WHERE user_id = <NUM> AND status IN (...) ORDER BY crea...',
    dropped: ['User@Host详情', 'Lock_time', 'SET timestamp', 'SQL中具体参数值'],
  },
  {
    service: 'auth-service (堆栈异常)',
    serviceColor: 'text-amber-400',
    raw: `2026-03-27 14:30:01.234 ERROR [auth-service,abc123,def456] --- [http-8080-exec-5] c.e.a.s.TokenService : Token验证失败
java.security.SignatureException: JWT signature does not match locally computed signature
    at io.jsonwebtoken.impl.DefaultJwtParser.parse(DefaultJwtParser.java:354)
    at io.jsonwebtoken.impl.DefaultJwtParser.parseClaimsJws(DefaultJwtParser.java:404)
    at com.example.auth.service.TokenService.validate(TokenService.java:89)
    at com.example.auth.filter.JwtFilter.doFilter(JwtFilter.java:42)
    at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:107)
    ... 28 more`,
    labels: {
      service: 'auth-service',
      severity: 'ERROR',
      error_code: 'AUTH_SIGNATURE_FAIL',
      namespace: 'prod',
      job: 'app',
    },
    output: '[ERROR] auth-service | AUTH_SIGNATURE_FAIL | Token验证失败: JWT signature does not match | stack: SignatureException@DefaultJwtParser:354 → TokenService:89',
    dropped: ['线程名', 'Spring 内部堆栈(28行)', 'trace/span ID(已移至标签)'],
  },
];

/* ═══════════════════════════════════════════════════════════════
   辅助组件
   ═══════════════════════════════════════════════════════════════ */

function PipelineArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-2">
      <div className="w-px h-4 bg-gradient-to-b from-gray-800 to-gray-700" />
      {label && (
        <span className="text-[10px] text-gray-500 bg-gray-950 px-2.5 py-0.5 rounded-full border border-gray-800 -my-1 relative z-10">
          {label}
        </span>
      )}
      <div className="w-px h-3 bg-gradient-to-b from-gray-700 to-gray-800" />
      <ArrowDown className="w-3.5 h-3.5 text-gray-600 -mt-0.5" />
    </div>
  );
}

function CodeBlock({ code, className = '' }: { code: string; className?: string }) {
  return (
    <pre className={`text-[11px] font-mono bg-gray-950 border border-gray-800 rounded-lg p-3 overflow-x-auto leading-relaxed ${className}`}>
      {code}
    </pre>
  );
}

function ExpandableCard({ isOpen, onToggle, header, children, activeBg = 'bg-gray-800/30', activeBorder = 'border-gray-700' }: {
  isOpen: boolean; onToggle: () => void; header: React.ReactNode; children: React.ReactNode; activeBg?: string; activeBorder?: string;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
          isOpen ? `${activeBg} ${activeBorder}` : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
        }`}
      >
        {header}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mx-0.5 mt-0.5 p-4 bg-gray-900/80 border border-gray-800 border-t-0 rounded-b-xl">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 1: 日志挑战
   ═══════════════════════════════════════════════════════════════ */

function ChallengesTab() {
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>('format');
  const [expandedExample, setExpandedExample] = useState<number | null>(null);

  return (
    <div>
      <div className="mb-5 p-4 bg-red-500/5 border border-red-500/15 rounded-xl">
        <p className="text-xs text-red-300/80 leading-relaxed">
          <span className="font-semibold text-red-300">核心问题：</span>
          在日志能被 Grafana 聚合分析之前，必须先解决四大挑战——格式混乱、日志过长、相似难聚、多行合并。
          这些「脏活」全部由 Promtail 的 pipeline_stages 完成，是整个监控链路中最复杂、最容易出错的环节。
        </p>
      </div>

      <div className="space-y-3">
        {logChallenges.map((challenge) => {
          const isOpen = expandedChallenge === challenge.id;
          return (
            <ExpandableCard
              key={challenge.id}
              isOpen={isOpen}
              onToggle={() => setExpandedChallenge(isOpen ? null : challenge.id)}
              activeBg={challenge.bg}
              activeBorder={challenge.border}
              header={
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-center ${challenge.color} flex-shrink-0`}>
                    {challenge.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{challenge.title}</div>
                    <div className="text-[11px] text-gray-500">{challenge.subtitle}</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-600 flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              }
            >
              {/* 格式混乱 - 展示 6 种不同日志格式 */}
              {challenge.id === 'format' && challenge.examples && (
                <div className="space-y-2">
                  {challenge.examples.map((ex, i) => {
                    const exOpen = expandedExample === i;
                    return (
                      <div key={i}>
                        <button
                          onClick={() => setExpandedExample(exOpen ? null : i)}
                          className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                            exOpen ? 'bg-gray-950/80 border-gray-700' : 'bg-gray-950/40 border-gray-800/50 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono font-semibold text-gray-300">{ex.service}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{ex.format}</span>
                                <span className={`text-[10px] font-semibold ${ex.diffColor}`}>难度: {ex.difficulty}</span>
                              </div>
                              <div className="text-[11px] text-gray-500 mt-1">{ex.problem}</div>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-600 flex-shrink-0 transition-transform ${exOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        <AnimatePresence>
                          {exOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-1 mt-0.5 p-3 bg-gray-950 border border-gray-800 border-t-0 rounded-b-lg">
                                <div className="text-[10px] text-red-400/60 uppercase tracking-wider mb-1.5">原始日志</div>
                                <pre className="text-[10px] font-mono text-gray-400 whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto">
                                  {ex.raw}
                                </pre>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 日志过长 */}
              {challenge.id === 'length' && challenge.scenarios && (
                <div className="space-y-2">
                  {challenge.scenarios.map((s, i) => (
                    <div key={i} className="p-3 bg-gray-950/60 rounded-lg border border-gray-800/50">
                      <div className="flex items-start justify-between gap-4 mb-1.5">
                        <span className="text-xs font-semibold text-gray-300">{s.type}</span>
                        <span className="text-[10px] text-orange-400/60 bg-orange-500/10 px-1.5 py-0.5 rounded flex-shrink-0">典型 {s.typical}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mb-1.5">
                        <span className="text-red-400/70">问题: </span>{s.problem}
                      </div>
                      <div className="text-[11px] text-emerald-400/70">
                        <span className="text-emerald-400/50">处理: </span>{s.solution}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 相似日志去重 */}
              {challenge.id === 'similar' && challenge.pairs && (
                <div className="space-y-3">
                  {challenge.pairs.map((pair, i) => (
                    <div key={i} className="p-3 bg-gray-950/60 rounded-lg border border-gray-800/50">
                      <div className="text-xs font-semibold text-violet-400/80 mb-2">{pair.label}</div>
                      <div className="space-y-1 mb-2">
                        <div className="text-[10px] text-gray-600">日志 A:</div>
                        <code className="text-[10px] font-mono text-gray-400 block bg-gray-900/80 px-2 py-1 rounded">{pair.logA}</code>
                        <div className="text-[10px] text-gray-600 mt-1">日志 B:</div>
                        <code className="text-[10px] font-mono text-gray-400 block bg-gray-900/80 px-2 py-1 rounded">{pair.logB}</code>
                      </div>
                      <div className="flex items-start gap-2 text-[11px]">
                        <span className="text-gray-600 flex-shrink-0">可变部分:</span>
                        <span className="text-amber-400 font-mono">{pair.variable}</span>
                      </div>
                      <div className="flex items-start gap-2 text-[11px] mt-1">
                        <span className="text-gray-600 flex-shrink-0">策略:</span>
                        <span className="text-emerald-400">{pair.strategy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 多行合并 */}
              {challenge.id === 'multiline' && challenge.cases && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {challenge.cases.map((c, i) => (
                    <div key={i} className="p-3 bg-gray-950/60 rounded-lg border border-gray-800/50">
                      <div className="text-xs font-semibold text-gray-300 mb-1">{c.name}</div>
                      <div className="text-[11px] text-gray-500 mb-2">{c.desc}</div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-gray-600">起始行正则:</span>
                        <code className="font-mono text-cyan-400/80 bg-gray-900/80 px-1.5 py-0.5 rounded">{c.startPattern}</code>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] mt-1">
                        <span className="text-gray-600">典型行数:</span>
                        <span className="text-gray-400">{c.lines} 行 → 合并为 1 条</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ExpandableCard>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 2: Pipeline 处理
   ═══════════════════════════════════════════════════════════════ */

function PipelineTab() {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-5 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
        <p className="text-xs text-amber-300/80 leading-relaxed">
          <span className="font-semibold text-amber-300">pipeline_stages 执行顺序：</span>
          Promtail 按配置顺序依次执行每个 stage，每个 stage 的输出是下一个 stage 的输入。
          日志经过完整 pipeline 后，从「原始杂乱文本」变成「带标签的结构化清洁日志」，然后推送到 Loki。
        </p>
      </div>

      <div className="space-y-6">
        {pipelineStages.map((phase) => (
          <div key={phase.phase}>
            {/* 阶段标题 */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-px flex-1 ${phase.borderColor} border-t border-dashed`} />
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${phase.borderColor} bg-gray-900/60 ${phase.color}`}>
                {phase.phase}
              </span>
              <div className={`h-px flex-1 ${phase.borderColor} border-t border-dashed`} />
            </div>

            <div className="space-y-2">
              {phase.stages.map((stage) => {
                const isOpen = expandedStage === stage.name;
                return (
                  <ExpandableCard
                    key={stage.name}
                    isOpen={isOpen}
                    onToggle={() => setExpandedStage(isOpen ? null : stage.name)}
                    activeBg={`${phase.color.replace('text-', 'bg-').replace('-400', '-500/5')}`}
                    activeBorder={phase.borderColor}
                    header={
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gray-800/80 border border-gray-700/60 flex items-center justify-center ${phase.color} flex-shrink-0`}>
                          {stage.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-mono font-semibold">{stage.name}</span>
                            {(stage as any).highlight && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">关键</span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500">{stage.purpose}</div>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-600 flex-shrink-0">
                          <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-500">{stage.inputLabel}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className={`px-1.5 py-0.5 rounded border ${phase.borderColor} ${phase.color}`}>{stage.outputLabel}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    }
                  >
                    <div className="space-y-3">
                      <p className="text-xs text-gray-400 leading-relaxed">{stage.desc}</p>
                      <CodeBlock code={stage.config} className="text-green-400" />
                      <div className="flex items-center gap-2 sm:hidden text-[10px]">
                        <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-500">{stage.inputLabel}</span>
                        <ArrowRight className="w-3 h-3 text-gray-600" />
                        <span className={`px-1.5 py-0.5 rounded border ${phase.borderColor} ${phase.color}`}>{stage.outputLabel}</span>
                      </div>
                    </div>
                  </ExpandableCard>
                );
              })}
            </div>

            {phase.phase !== '输出层' && <PipelineArrow />}
          </div>
        ))}

        {/* 最终流向 */}
        <PipelineArrow label="→ Loki /api/v1/push" />
        <div className="text-center p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <Database className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <div className="text-sm font-semibold text-emerald-400">Loki 存储</div>
          <div className="text-[11px] text-gray-500">标签索引 + Chunk 压缩存储 → Grafana LogQL 查询</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 3: 归一化策略
   ═══════════════════════════════════════════════════════════════ */

function NormalizeTab() {
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>('template');

  return (
    <div>
      <div className="mb-5 p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
        <p className="text-xs text-indigo-300/80 leading-relaxed">
          <span className="font-semibold text-indigo-300">归一化的目标：</span>
          让 Grafana 能用 <code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">sum by(error_code, service)(count_over_time(...))</code> 做聚合统计。
          如果日志中充满不同的 ID、IP、时间戳，聚合结果就是每条都不同——毫无分析价值。
        </p>
      </div>

      <div className="space-y-3">
        {normalizeStrategies.map((strategy) => {
          const isOpen = expandedStrategy === strategy.id;
          return (
            <ExpandableCard
              key={strategy.id}
              isOpen={isOpen}
              onToggle={() => setExpandedStrategy(isOpen ? null : strategy.id)}
              header={
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-center ${strategy.color} flex-shrink-0`}>
                    {strategy.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{strategy.title}</div>
                    <div className="text-[11px] text-gray-500">{strategy.subtitle}</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-600 flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              }
            >
              <div className="space-y-4">
                {/* 日志模板化示例 */}
                {strategy.id === 'template' && strategy.examples && (
                  <div className="space-y-3">
                    {strategy.examples.map((ex, i) => (
                      <div key={i} className="p-3 bg-gray-950/60 rounded-lg border border-gray-800/50">
                        <div className="space-y-2">
                          <div>
                            <div className="text-[10px] text-red-400/60 uppercase tracking-wider mb-1">原始（每条不同，无法聚合）</div>
                            <code className="text-[10px] font-mono text-gray-400 block bg-gray-900/80 px-2 py-1.5 rounded break-all">{ex.before}</code>
                          </div>
                          <div className="flex justify-center">
                            <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                          <div>
                            <div className="text-[10px] text-emerald-400/60 uppercase tracking-wider mb-1">模板化（同类日志完全相同，可聚合）</div>
                            <code className="text-[10px] font-mono text-emerald-400 block bg-gray-900/80 px-2 py-1.5 rounded break-all">{ex.after}</code>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-gray-600">模板 ID:</span>
                            <span className="font-mono text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">{ex.template}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* error_code 标准化 */}
                {strategy.id === 'error_code' && (
                  <>
                    <div>
                      <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">错误码体系（{strategy.codeSystem!.length} 种）</div>
                      <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
                        {strategy.codeSystem!.map((code, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] p-1.5 bg-gray-950/40 rounded">
                            <span className={`font-mono font-bold w-12 flex-shrink-0 text-[10px] ${
                              code.severity === 'CRITICAL' ? 'text-red-400' : code.severity === 'ERROR' ? 'text-orange-400' : 'text-yellow-400'
                            }`}>{code.severity}</span>
                            <span className="font-mono text-amber-400 w-40 flex-shrink-0 truncate">{code.code}</span>
                            <span className="text-gray-500 w-24 flex-shrink-0 truncate">{code.service}</span>
                            <span className="text-gray-600 font-mono text-[10px] flex-1 truncate">{code.pattern}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Promtail 配置</div>
                      <CodeBlock code={strategy.config!} className="text-green-400" />
                    </div>
                  </>
                )}

                {/* severity 统一分级 */}
                {strategy.id === 'severity' && (
                  <>
                    <div className="space-y-2">
                      {strategy.mapping!.map((m, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${m.color}`}>
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className="font-mono font-bold text-sm">{m.unified}</span>
                            <span className="text-[11px] text-gray-500">{m.desc}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {m.sources.map((s) => (
                              <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-900/50 rounded text-gray-400">{s}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">配置示例</div>
                      <CodeBlock code={strategy.config!} className="text-green-400" />
                    </div>
                  </>
                )}
              </div>
            </ExpandableCard>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════��═══════════════════════════════════════════════
   Tab 4: 处理结果对比
   ═══════════════════════════════════════════════════════════════ */

function ResultTab() {
  const [expandedResult, setExpandedResult] = useState<number>(0);

  return (
    <div>
      <div className="mb-5 p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
        <p className="text-xs text-emerald-300/80 leading-relaxed">
          <span className="font-semibold text-emerald-300">清洗效果：</span>
          经过完整 Pipeline 处理后，每条日志从「几百字节的杂乱文本」变成「带标签的简洁结构化记录」。
          Grafana 可以直接用 <code className="text-emerald-400 bg-emerald-500/10 px-1 rounded">{'sum by(error_code, service)(...)'}</code> 做聚合查询。
        </p>
      </div>

      <div className="space-y-4">
        {beforeAfterExamples.map((example, i) => {
          const isOpen = expandedResult === i;
          return (
            <div key={i} className="rounded-xl border border-gray-800 overflow-hidden">
              {/* 头部 */}
              <button
                onClick={() => setExpandedResult(isOpen ? -1 : i)}
                className="w-full text-left p-4 bg-gray-900/60 hover:bg-gray-900/80 transition-colors flex items-center gap-3 cursor-pointer"
              >
                <CircleDot className={`w-3.5 h-3.5 ${example.serviceColor} flex-shrink-0`} />
                <span className="font-mono font-semibold text-sm">{example.service}</span>
                <ChevronDown className={`w-4 h-4 text-gray-600 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-4 bg-gray-950/40">
                      {/* 原始日志 */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="w-3.5 h-3.5 text-red-400/60" />
                          <span className="text-[11px] font-semibold text-red-400/80 uppercase tracking-wider">原始日志（清洗前）</span>
                          <span className="text-[10px] text-gray-600 ml-auto">{example.raw.length} 字符</span>
                        </div>
                        <pre className="text-[10px] font-mono text-gray-400 bg-gray-900/80 border border-gray-800 rounded-lg p-3 whitespace-pre-wrap break-all leading-relaxed max-h-40 overflow-y-auto">
                          {example.raw}
                        </pre>
                      </div>

                      {/* 处理箭头 */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-px h-3 bg-gray-700" />
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                          Pipeline 处理
                        </span>
                        <div className="w-px h-3 bg-gray-700" />
                        <ArrowDown className="w-4 h-4 text-emerald-400" />
                      </div>

                      {/* 输出标签 */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Tags className="w-3.5 h-3.5 text-indigo-400/60" />
                          <span className="text-[11px] font-semibold text-indigo-400/80 uppercase tracking-wider">Loki 标签</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(example.labels).map(([k, v]) => (
                            <span key={k} className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-400">
                              {k}="{v}"
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 输出日志 */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400/60" />
                          <span className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider">清洗后日志</span>
                          <span className="text-[10px] text-gray-600 ml-auto">{example.output.length} 字符</span>
                        </div>
                        <code className="text-[11px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 block break-all leading-relaxed">
                          {example.output}
                        </code>
                      </div>

                      {/* 丢弃的字段 */}
                      <div className="p-3 bg-gray-900/60 rounded-lg">
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">丢弃/截断的内容</div>
                        <div className="flex flex-wrap gap-1.5">
                          {example.dropped.map((d, di) => (
                            <span key={di} className="text-[10px] px-2 py-0.5 bg-red-500/5 border border-red-500/10 rounded text-red-400/60">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 压缩比 */}
                      <div className="flex items-center gap-3 p-2 bg-gray-900/40 rounded-lg">
                        <span className="text-[10px] text-gray-500">压缩比:</span>
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                            style={{ width: `${Math.round((example.output.length / example.raw.length) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {example.raw.length} → {example.output.length} 字符
                          （-{Math.round((1 - example.output.length / example.raw.length) * 100)}%）
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* 最终效果总结 */}
      <div className="mt-6 p-5 bg-gray-900/60 border border-gray-800 rounded-xl">
        <h3 className="font-semibold mb-3">清洗后日志可直接被 Grafana 聚合分析</h3>
        <div className="space-y-2">
          {[
            { query: 'sum by(error_code)(count_over_time({severity="ERROR"}[1h]))', desc: '按错误码统计 ERROR 分布' },
            { query: 'sum by(service)(count_over_time({severity="CRITICAL"}[5m]))', desc: '按服务统计 CRITICAL 告警' },
            { query: 'topk(10, sum by(error_code)(count_over_time({job="app"}[24h])))', desc: '过去 24h 出现最多的 Top10 错误' },
            { query: 'sum(rate({severity=~"ERROR|CRITICAL"}[5m])) by (service)', desc: '各服务实时错误率' },
          ].map((q, i) => (
            <div key={i} className="flex items-start gap-3 p-2.5 bg-gray-950/60 rounded-lg">
              <code className="text-[10px] font-mono text-indigo-400 flex-1 break-all">{q.query}</code>
              <span className="text-[10px] text-gray-500 flex-shrink-0 w-36 text-right">{q.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════════════════════ */
export function FlowPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('challenges');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">日志预处理 Pipeline</h1>
              <p className="text-xs text-gray-500">Promtail pipeline_stages · 从杂乱原始日志到可聚合分析的结构化数据</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/system')}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Monitor className="w-4 h-4" />
            Grafana 面板
          </button>
        </div>
      </header>

      {/* 数据流向条 */}
      <div className="border-b border-gray-800/60 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto">
            {[
              { label: '原始日志', sub: '6+ 种格式', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
              { label: '→', color: 'text-gray-600' },
              { label: 'Pipeline', sub: '12 阶段清洗', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
              { label: '→', color: 'text-gray-600' },
              { label: '归一化', sub: '模板 + 错误码', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
              { label: '→', color: 'text-gray-600' },
              { label: '结构化日志', sub: '标签 + 简洁内容', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
              { label: '→', color: 'text-gray-600' },
              { label: 'Loki', sub: '索引存储', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
              { label: '→', color: 'text-gray-600' },
              { label: 'Grafana', sub: 'LogQL 聚合', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
            ].map((item, i) => (
              item.sub ? (
                <span key={i} className={`px-2 py-1 rounded-md border flex-shrink-0 ${item.color}`}>
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-[9px] opacity-70 ml-1">{item.sub}</span>
                </span>
              ) : (
                <span key={i} className={`flex-shrink-0 ${item.color}`}>{item.label}</span>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="sticky top-[65px] z-10 bg-gray-950/90 backdrop-blur-lg border-b border-gray-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all cursor-pointer flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
                }`}
              >
                <span className={activeTab === tab.id ? tab.color : ''}>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
                <span className="text-[10px] text-gray-600 hidden sm:block">{tab.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab 内容 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'challenges' && <ChallengesTab />}
            {activeTab === 'pipeline' && <PipelineTab />}
            {activeTab === 'normalize' && <NormalizeTab />}
            {activeTab === 'result' && <ResultTab />}
            {activeTab === 'simulator' && <LogProcessSimulator />}
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <div className="text-center py-10">
          <button
            onClick={() => navigate('/system')}
            className="inline-flex items-center gap-3 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Monitor className="w-5 h-5" />
            进入 Grafana 监控面板
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
