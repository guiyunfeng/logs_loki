export type ErrorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * 致命错误关键词（系统/基础设施级别，跨项目通用）
 * 命中即标记为 CRITICAL，不看频率
 */
const CRITICAL_KEYWORDS = [
  // JVM 致命
  'OutOfMemoryError', 'StackOverflowError', 'Java heap space',
  // 系统级
  'OOM', 'Killed', 'core dumped', 'Segmentation fault',
  // 磁盘
  'disk full', 'No space left', 'No space left on device',
  // 资源耗尽
  'Too many open files', 'Connection pool exhausted',
  'Cannot allocate memory', 'unable to create new native thread',
  // 数据库致命
  'deadlock', 'Data corruption', 'table is full',
];

// 预编译正则，性能更好
const CRITICAL_REGEX = new RegExp(
  CRITICAL_KEYWORDS.map(k => k.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)).join('|'),
  'i',
);

/**
 * 判断单条日志是否命中致命关键词
 */
function isCriticalByContent(message: string): boolean {
  return CRITICAL_REGEX.test(message);
}

/**
 * 根据频率确定等级（排除已被标记为 CRITICAL 的）
 */
function getSeverityByFrequency(count: number): ErrorSeverity {
  if (count >= 100) return 'HIGH';
  if (count >= 20) return 'MEDIUM';
  return 'LOW';
}

/**
 * 对日志列表进行错误等级分类
 *
 * 策略：
 * 1. 先扫描关键词 → 命中致命关键词直接 CRITICAL
 * 2. 再按相同 message 出现频率分级 → HIGH / MEDIUM / LOW
 *
 * @param logs 日志数组，每条需要有 message 字段
 * @returns 原数组每条日志附加 severity 字段后的新数组
 */
export function classifyErrorSeverity<T extends { message: string }>(
  logs: T[],
): Array<T & { severity: ErrorSeverity }> {
  // 第一遍：统计每种 message 的出现次数
  const msgCounts: Record<string, number> = {};
  for (const log of logs) {
    const key = log.message || '';
    msgCounts[key] = (msgCounts[key] || 0) + 1;
  }

  // 第二遍：给每条日志分配等级
  return logs.map(log => {
    const msg = log.message || '';

    // 优先：关键词命中 → CRITICAL
    if (isCriticalByContent(msg)) {
      return { ...log, severity: 'CRITICAL' as ErrorSeverity };
    }

    // 其次：按频率分级
    const count = msgCounts[msg] || 1;
    return { ...log, severity: getSeverityByFrequency(count) };
  });
}

/**
 * 获取各等级的统计数量
 */
export function getSeverityStats(logs: Array<{ severity: ErrorSeverity }>) {
  const result = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const log of logs) {
    result[log.severity]++;
  }
  return result;
}

/**
 * 等级对应的颜色配置
 */
export const SEVERITY_CONFIG: Record<ErrorSeverity, { color: string; bg: string; border: string; label: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'bg-red-500/20', border: 'border-red-500/50', label: '致命' },
  HIGH:     { color: '#f97316', bg: 'bg-orange-500/20', border: 'border-orange-500/50', label: '严重' },
  MEDIUM:   { color: '#eab308', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', label: '中等' },
  LOW:      { color: '#22c55e', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', label: '轻微' },
};
