import { useState } from 'react';
import {
  Sparkles, Copy, Check, RotateCcw, Code, Play, Eye,
  ChevronRight, CheckCircle, XCircle, AlertCircle,
  Braces, Hash, Scissors, Filter, Tags, Type, Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/* ═══════════════════════════════════════════════════════════════
   预设日志模板
   ═══════════════════════════════════════════════════════════════ */

const logTemplates = [
  {
    id: 'spring-json',
    name: 'Spring Boot JSON',
    service: 'order-service',
    raw: `{"timestamp":"2026-03-27T14:30:01.234Z","level":"ERROR","service":"order-service","thread":"http-8080-exec-3","class":"OrderController","message":"订单创建失败: 库存不足","error_code":"INVENTORY_INSUFFICIENT","order_id":"ORD-20260327-8842","trace_id":"abc123def456"}`,
  },
  {
    id: 'nginx',
    name: 'Nginx Access Log',
    service: 'nginx-ingress',
    raw: `2026/03/27 14:30:01 [error] 1234#0: *56789 upstream timed out (110: Connection timed out) while connecting to upstream, client: 10.0.3.45, server: api.example.com, request: "POST /api/v1/orders HTTP/1.1", upstream: "http://10.0.5.12:8080/api/v1/orders", host: "api.example.com"`,
  },
  {
    id: 'mysql-slow',
    name: 'MySQL Slow Query',
    service: 'mysql-cluster',
    raw: `# Time: 2026-03-27T14:30:01.000000Z
# User@Host: app_user[app_user] @ [10.0.5.12]  Id: 42
# Query_time: 12.345678  Lock_time: 0.000123  Rows_sent: 0  Rows_examined: 1500000
SET timestamp=1774628401;
SELECT * FROM orders WHERE user_id = 8842 AND status IN ('pending','processing') ORDER BY created_at DESC;`,
  },
  {
    id: 'java-stack',
    name: 'Java Stack Trace',
    service: 'auth-service',
    raw: `2026-03-27 14:30:01.234 ERROR [auth-service,abc123,def456] --- [http-8080-exec-5] c.e.a.s.TokenService : Token验证失败
java.security.SignatureException: JWT signature does not match locally computed signature
    at io.jsonwebtoken.impl.DefaultJwtParser.parse(DefaultJwtParser.java:354)
    at com.example.auth.service.TokenService.validate(TokenService.java:89)
    ... 28 more`,
  },
  {
    id: 'redis',
    name: 'Redis Error',
    service: 'redis-cluster',
    raw: `42:M 27 Mar 2026 14:30:01.234 # Client id=1234 addr=10.0.5.12:54321 fd=8 name= db=0 flags=N events=r cmd=get scheduled to be closed ASAP for overcoming of output buffer limits.`,
  },
  {
    id: 'python-trace',
    name: 'Python Traceback',
    service: 'recommendation-service',
    raw: `[2026-03-27 14:30:01,234] ERROR in app: Exception on /api/recommend [POST]
Traceback (most recent call last):
  File "/app/service.py", line 142, in recommend
    result = model.predict(features)
  File "/app/ml/model.py", line 67, in predict
    raise ValueError("Invalid feature dimension")
ValueError: Invalid feature dimension`,
  },
];

/* ═══════════════════════════════════════════════════════════════
   Pipeline Stages 定义
   ═══════════════════════════════════════════════════════════════ */

type StageType = 
  | 'json'
  | 'regex'
  | 'timestamp'
  | 'labels'
  | 'output'
  | 'match'
  | 'multiline'
  | 'template'
  | 'drop'
  | 'metrics';

interface PipelineStage {
  id: string;
  type: StageType;
  name: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
  config?: any;
}

const defaultStages: PipelineStage[] = [
  {
    id: 'multiline',
    type: 'multiline',
    name: '多行合并',
    icon: <Layers className="w-4 h-4" />,
    description: '合并堆栈跟踪等多行日志',
    enabled: true,
  },
  {
    id: 'json',
    type: 'json',
    name: 'JSON 解析',
    icon: <Braces className="w-4 h-4" />,
    description: '解析 JSON 格式日志',
    enabled: true,
  },
  {
    id: 'regex',
    type: 'regex',
    name: '正则提取',
    icon: <Hash className="w-4 h-4" />,
    description: '提取结构化字段',
    enabled: true,
  },
  {
    id: 'timestamp',
    type: 'timestamp',
    name: '时间戳解析',
    icon: <Filter className="w-4 h-4" />,
    description: '标准化时间格式',
    enabled: true,
  },
  {
    id: 'labels',
    type: 'labels',
    name: '标签提取',
    icon: <Tags className="w-4 h-4" />,
    description: '添加 Loki 索引标签',
    enabled: true,
  },
  {
    id: 'template',
    type: 'template',
    name: '消息归一化',
    icon: <Type className="w-4 h-4" />,
    description: '模板化错误消息',
    enabled: true,
  },
  {
    id: 'output',
    type: 'output',
    name: '输出格式化',
    icon: <Code className="w-4 h-4" />,
    description: '格式化最终输出',
    enabled: true,
  },
];

/* ═══════════════════════════════════════════════════════════════
   日志处理逻辑
   ═══════════════════════════════════════════════════════════════ */

interface ProcessedLog {
  original: string;
  steps: {
    stage: string;
    input: string;
    output: string;
    extracted: Record<string, string>;
    changes: string[];
  }[];
  final: {
    message: string;
    labels: Record<string, string>;
    fields: Record<string, any>;
    severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  };
}

function processLog(rawLog: string, stages: PipelineStage[]): ProcessedLog {
  const steps: ProcessedLog['steps'] = [];
  let currentLog = rawLog;
  const extracted: Record<string, any> = {};
  
  // 1. Multiline (如果启用)
  if (stages.find(s => s.id === 'multiline' && s.enabled)) {
    const input = currentLog;
    // 简单示例：不实际合并，只标记
    steps.push({
      stage: '多行合并',
      input,
      output: currentLog,
      extracted: {},
      changes: ['识别为单行/多行日志'],
    });
  }

  // 2. JSON 解析
  if (stages.find(s => s.id === 'json' && s.enabled)) {
    const input = currentLog;
    try {
      const jsonData = JSON.parse(currentLog);
      Object.assign(extracted, jsonData);
      currentLog = JSON.stringify(jsonData, null, 2);
      steps.push({
        stage: 'JSON 解析',
        input,
        output: currentLog,
        extracted: jsonData,
        changes: [`解析出 ${Object.keys(jsonData).length} 个字段`],
      });
    } catch {
      // 不是 JSON 格式，继续
      steps.push({
        stage: 'JSON 解析',
        input,
        output: currentLog,
        extracted: {},
        changes: ['非 JSON 格式，跳过'],
      });
    }
  }

  // 3. Regex 提取
  if (stages.find(s => s.id === 'regex' && s.enabled) && !extracted.level) {
    const input = currentLog;
    const changes: string[] = [];
    
    // 提取时间戳
    const timestampRegex = /(\d{4}[-/]\d{2}[-/]\d{2}[T\s]\d{2}:\d{2}:\d{2})/;
    const timestampMatch = currentLog.match(timestampRegex);
    if (timestampMatch) {
      extracted.timestamp = timestampMatch[1];
      changes.push(`提取 timestamp: ${timestampMatch[1]}`);
    }

    // 提取日志级别
    const levelRegex = /\b(CRITICAL|ERROR|WARN(?:ING)?|INFO|DEBUG)\b/i;
    const levelMatch = currentLog.match(levelRegex);
    if (levelMatch) {
      extracted.level = levelMatch[1].toUpperCase();
      changes.push(`提取 level: ${extracted.level}`);
    }

    // 提取服务名 (从 service= 或 [service-name])
    const serviceRegex = /service[=:]?\s*["']?([a-z-]+)["']?|^\d+:\w+|\[([a-z-]+),/i;
    const serviceMatch = currentLog.match(serviceRegex);
    if (serviceMatch) {
      extracted.service = serviceMatch[1] || serviceMatch[2] || 'unknown';
      changes.push(`提取 service: ${extracted.service}`);
    }

    // 提取消息 (简单示例)
    const messageRegex = /(?:message|:)\s*["']?([^"'\n]+)["']?/i;
    const messageMatch = currentLog.match(messageRegex);
    if (messageMatch) {
      extracted.message = messageMatch[1];
      changes.push(`提取 message`);
    } else {
      // 如果没有明确的 message 字段，使用整个日志
      extracted.message = currentLog.substring(0, 100) + '...';
    }

    steps.push({
      stage: '正则提取',
      input,
      output: currentLog,
      extracted: Object.fromEntries(Object.entries(extracted).map(([k, v]) => [k, String(v)])),
      changes: changes.length > 0 ? changes : ['未匹配到标准字段'],
    });
  }

  // 4. Timestamp 标准化
  if (stages.find(s => s.id === 'timestamp' && s.enabled) && extracted.timestamp) {
    const input = extracted.timestamp;
    const normalized = new Date(extracted.timestamp).toISOString();
    extracted.timestamp = normalized;
    steps.push({
      stage: '时间戳解析',
      input,
      output: normalized,
      extracted: { timestamp: normalized },
      changes: [`标准化为 ISO 8601 格式`],
    });
  }

  // 5. Labels 提取
  if (stages.find(s => s.id === 'labels' && s.enabled)) {
    const labels: Record<string, string> = {
      job: 'app',
      service: extracted.service || 'unknown',
      level: extracted.level || 'INFO',
    };
    
    steps.push({
      stage: '标签提取',
      input: JSON.stringify(extracted, null, 2),
      output: JSON.stringify(labels, null, 2),
      extracted: labels,
      changes: [`生成 Loki 标签: ${Object.keys(labels).join(', ')}`],
    });
    
    extracted.labels = labels;
  }

  // 6. Template 归一化
  if (stages.find(s => s.id === 'template' && s.enabled) && extracted.message) {
    const input = extracted.message;
    let normalized = extracted.message;
    const changes: string[] = [];

    // 移除变量值，保留模板
    const patterns = [
      { regex: /订单\s*\w+[:：]\s*\w+-\d+-\d+/g, template: '订单 {order_id}', name: '订单ID' },
      { regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, template: '{ip_address}', name: 'IP地址' },
      { regex: /\buser_id\s*=\s*\d+/gi, template: 'user_id={user_id}', name: '用户ID' },
      { regex: /\btrace[_-]?id[=:]\s*\w+/gi, template: 'trace_id={trace_id}', name: 'Trace ID' },
      { regex: /\d{4}-\d{2}-\d{2}/g, template: '{date}', name: '日期' },
    ];

    patterns.forEach(({ regex, template, name }) => {
      if (regex.test(normalized)) {
        normalized = normalized.replace(regex, template);
        changes.push(`归一化 ${name}`);
      }
    });

    extracted.message_template = normalized;
    
    steps.push({
      stage: '消息归一化',
      input,
      output: normalized,
      extracted: { message_template: normalized },
      changes: changes.length > 0 ? changes : ['无需归一化'],
    });
  }

  // 7. 严重程度分级
  let severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO' = 'INFO';
  const level = extracted.level?.toUpperCase();
  const message = extracted.message?.toLowerCase() || '';

  if (level === 'ERROR' || level === 'CRITICAL') {
    // 检查是否是关键错误
    const criticalKeywords = ['payment', '支付', 'database', '数据库', 'deadlock', 'oom', 'outofmemory'];
    if (criticalKeywords.some(kw => message.includes(kw)) || level === 'CRITICAL') {
      severity = 'CRITICAL';
    } else {
      severity = 'ERROR';
    }
  } else if (level === 'WARNING' || level === 'WARN') {
    severity = 'WARNING';
  }

  // 最终结果
  const final = {
    message: extracted.message_template || extracted.message || rawLog,
    labels: extracted.labels || {
      job: 'app',
      service: extracted.service || 'unknown',
      level: extracted.level || 'INFO',
    },
    fields: {
      timestamp: extracted.timestamp,
      error_code: extracted.error_code,
      trace_id: extracted.trace_id,
      ...extracted,
    },
    severity,
  };

  return { original: rawLog, steps, final };
}

/* ═══════════════════════════════════════════════════════════════
   组件主体
   ═══════════════════════════════════════════════════════════════ */

export function LogProcessSimulator() {
  const [rawLog, setRawLog] = useState('');
  const [stages, setStages] = useState<PipelineStage[]>(defaultStages);
  const [result, setResult] = useState<ProcessedLog | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSteps, setShowSteps] = useState(true);

  const handleProcess = () => {
    if (!rawLog.trim()) return;
    const processed = processLog(rawLog, stages);
    setResult(processed);
  };

  const handleTemplateSelect = (template: typeof logTemplates[0]) => {
    setRawLog(template.raw);
    setResult(null);
  };

  const handleReset = () => {
    setRawLog('');
    setResult(null);
  };

  const handleCopy = (text: string) => {
    try { navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleStage = (id: string) => {
    setStages(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const severityConfig = {
    CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <XCircle className="w-4 h-4" /> },
    ERROR: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: <AlertCircle className="w-4 h-4" /> },
    WARNING: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <AlertCircle className="w-4 h-4" /> },
    INFO: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: <CheckCircle className="w-4 h-4" /> },
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold">日志清理模拟器</h2>
          </div>
          <p className="text-sm text-gray-400">
            实时预览 Promtail Pipeline 处理流程 · 从混乱到规范的转变
          </p>
        </div>
      </div>

      {/* 预设模板 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Code className="w-4 h-4" />
          快速开始 - 选择预设模板
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {logTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="p-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-indigo-500/50 transition-all text-left group"
            >
              <div className="text-sm font-medium text-gray-200 group-hover:text-indigo-400 transition-colors">
                {template.name}
              </div>
              <div className="text-xs text-gray-500 mt-1">{template.service}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Stages 配置 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Pipeline Stages 配置
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {stages.map(stage => (
            <button
              key={stage.id}
              onClick={() => toggleStage(stage.id)}
              className={`p-3 rounded-lg border transition-all text-left ${
                stage.enabled
                  ? 'bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/20'
                  : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={stage.enabled ? 'text-indigo-400' : 'text-gray-500'}>
                  {stage.icon}
                </div>
                <div className={`text-sm font-medium ${stage.enabled ? 'text-gray-200' : 'text-gray-500'}`}>
                  {stage.name}
                </div>
              </div>
              <div className="text-xs text-gray-500">{stage.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">原始日志输入</h3>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置
            </button>
            <button
              onClick={handleProcess}
              disabled={!rawLog.trim()}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              开始处理
            </button>
          </div>
        </div>
        <textarea
          value={rawLog}
          onChange={(e) => setRawLog(e.target.value)}
          placeholder="粘贴原始日志内容，或从上方选择预设模板..."
          className="w-full h-32 px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:outline-none font-mono text-sm text-gray-300 resize-none"
        />
      </div>

      {/* 处理结果 */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* 处理步骤 */}
            {showSteps && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" />
                    处理步骤详情
                  </h3>
                  <button
                    onClick={() => setShowSteps(!showSteps)}
                    className="text-xs text-gray-500 hover:text-gray-400"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {result.steps.map((step, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 rounded-lg bg-gray-800/50 border border-gray-700"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-200">{step.stage}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {step.changes.join(' · ')}
                          </div>
                        </div>
                      </div>
                      {Object.keys(step.extracted).length > 0 && (
                        <div className="mt-3 p-3 rounded bg-gray-900/50 border border-gray-700/50">
                          <div className="text-xs text-gray-500 mb-2">提取字段:</div>
                          <div className="space-y-1">
                            {Object.entries(step.extracted).map(([key, value]) => (
                              <div key={key} className="flex items-start gap-2 text-xs font-mono">
                                <span className="text-indigo-400">{key}:</span>
                                <span className="text-gray-300 flex-1 break-all">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 最终结果 */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                最终结果
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 严重程度 */}
                <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-2">严重程度分级</div>
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${severityConfig[result.final.severity].bg} ${severityConfig[result.final.severity].border}`}>
                    <div className={severityConfig[result.final.severity].color}>
                      {severityConfig[result.final.severity].icon}
                    </div>
                    <span className={`font-bold ${severityConfig[result.final.severity].color}`}>
                      {result.final.severity}
                    </span>
                  </div>
                </div>

                {/* Loki 标签 */}
                <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-2">Loki 标签 (索引)</div>
                  <div className="space-y-1">
                    {Object.entries(result.final.labels).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-indigo-400">{key}=</span>
                        <span className="text-xs font-mono text-gray-300">&quot;{value}&quot;</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 归一化消息 */}
              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-gray-500">归一化消息模板</div>
                  <button
                    onClick={() => handleCopy(result.final.message)}
                    className="p-1.5 rounded hover:bg-gray-700 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                    )}
                  </button>
                </div>
                <div className="font-mono text-sm text-gray-300">{result.final.message}</div>
              </div>

              {/* 完整字段 */}
              <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-500">完整结构化数据 (JSON)</div>
                  <button
                    onClick={() => handleCopy(JSON.stringify(result.final.fields, null, 2))}
                    className="p-1.5 rounded hover:bg-gray-700 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                    )}
                  </button>
                </div>
                <pre className="font-mono text-xs text-gray-400 overflow-x-auto">
                  {JSON.stringify(result.final.fields, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 空状态提示 */}
      {!result && (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-800/50 border border-gray-700 mb-4">
            <Sparkles className="w-8 h-8 text-gray-600" />
          </div>
          <div className="text-sm text-gray-500">
            选择预设模板或输入原始日志，点击「开始处理」查看效果
          </div>
        </div>
      )}
    </div>
  );
}