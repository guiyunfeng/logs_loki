// 模拟 Loki 日志数据生成器

export const generateErrorTypeData = () => [
  { name: 'NullPointerException', value: 145, color: '#dc2626' },
  { name: 'TimeoutException', value: 98, color: '#ea580c' },
  { name: 'DatabaseException', value: 76, color: '#f59e0b' },
  { name: 'AuthenticationError', value: 54, color: '#f97316' },
  { name: 'ValidationError', value: 32, color: '#fb923c' },
];

export const generateTopNErrors = () => [
  { name: 'API timeout /users', count: 256, severity: 'critical' },
  { name: 'DB connection lost', count: 189, severity: 'critical' },
  { name: 'Invalid token', count: 156, severity: 'error' },
  { name: 'Rate limit exceeded', count: 134, severity: 'warning' },
  { name: 'File not found', count: 98, severity: 'error' },
  { name: 'Memory overflow', count: 87, severity: 'critical' },
  { name: 'Invalid JSON format', count: 76, severity: 'error' },
  { name: 'Missing parameter', count: 65, severity: 'warning' },
  { name: 'Network unreachable', count: 54, severity: 'error' },
  { name: 'Permission denied', count: 43, severity: 'warning' },
];

export const generateTrendData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();
    
    data.push({
      time: `${hour.toString().padStart(2, '0')}:00`,
      critical: Math.floor(Math.random() * 20 + 10),
      error: Math.floor(Math.random() * 40 + 20),
      warning: Math.floor(Math.random() * 60 + 30),
    });
  }
  
  return data;
};

export const generateAlerts = () => {
  const now = new Date();
  const alerts = [
    {
      id: '1',
      severity: 'critical' as const,
      message: 'API 服务 /api/users 响应时间超过 5 秒，已持续 10 分钟',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000).toLocaleTimeString('zh-CN'),
      count: 156,
      source: 'api-gateway',
    },
    {
      id: '2',
      severity: 'critical' as const,
      message: '数据库连接池耗尽，当前活跃连接数: 100/100',
      timestamp: new Date(now.getTime() - 8 * 60 * 1000).toLocaleTimeString('zh-CN'),
      count: 89,
      source: 'database',
    },
    {
      id: '3',
      severity: 'error' as const,
      message: 'Redis 缓存未命中率超过 80%',
      timestamp: new Date(now.getTime() - 12 * 60 * 1000).toLocaleTimeString('zh-CN'),
      count: 234,
      source: 'cache-service',
    },
    {
      id: '4',
      severity: 'error' as const,
      message: '认证服务返回 401 错误率超过 15%',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000).toLocaleTimeString('zh-CN'),
      count: 67,
      source: 'auth-service',
    },
    {
      id: '5',
      severity: 'warning' as const,
      message: 'CPU 使用率持续超过 75%',
      timestamp: new Date(now.getTime() - 20 * 60 * 1000).toLocaleTimeString('zh-CN'),
      count: 45,
      source: 'monitoring',
    },
    {
      id: '6',
      severity: 'warning' as const,
      message: '磁盘空间使用率达到 85%',
      timestamp: new Date(now.getTime() - 25 * 60 * 1000).toLocaleTimeString('zh-CN'),
      count: 12,
      source: 'system',
    },
  ];
  
  return alerts;
};

export const generateLogStream = () => {
  const now = new Date();
  const logs = [];
  const levels: Array<'critical' | 'error' | 'warning' | 'info' | 'debug'> = 
    ['critical', 'error', 'warning', 'info', 'debug'];
  const sources = ['api-gateway', 'auth-service', 'database', 'cache-service', 'payment-service'];
  const messages = [
    'Request timeout after 5000ms',
    'Connection to database failed',
    'Invalid authentication token provided',
    'Rate limit exceeded for user ID: 12345',
    'Cache miss for key: user_profile_67890',
    'Successfully processed payment transaction',
    'User login successful from IP: 192.168.1.1',
    'Failed to validate request payload',
    'Memory usage at 85%',
    'Disk write operation completed',
    'Background job started: data_cleanup',
    'API response returned in 145ms',
    'WebSocket connection established',
    'Session expired for user session_abc123',
    'File upload completed successfully',
  ];
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(now.getTime() - i * 10 * 1000);
    logs.push({
      timestamp: timestamp.toLocaleTimeString('zh-CN', { hour12: false }),
      level: levels[Math.floor(Math.random() * levels.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
    });
  }
  
  return logs;
};

export const generateMetrics = () => ({
  totalErrors: 1245,
  errorRate: 3.8,
  activeAlerts: 6,
  avgResponseTime: 245,
  errorChange: 12.5,
  rateChange: -8.3,
  alertChange: 15.2,
  responseChange: -5.6,
});

export const generateServiceData = () => [
  { service: 'api-gateway', total: 342, critical: 45, error: 187, warning: 110 },
  { service: 'auth-service', total: 198, critical: 12, error: 98, warning: 88 },
  { service: 'database', total: 156, critical: 34, error: 76, warning: 46 },
  { service: 'cache-service', total: 134, critical: 8, error: 54, warning: 72 },
  { service: 'payment-service', total: 89, critical: 23, error: 45, warning: 21 },
  { service: 'notification', total: 67, critical: 5, error: 32, warning: 30 },
];

export const generateResponseTimeData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();
    const p50 = Math.floor(Math.random() * 80 + 40);
    const p95 = Math.floor(Math.random() * 150 + 150);
    const p99 = Math.floor(Math.random() * 200 + 300);
    
    data.push({
      time: `${hour.toString().padStart(2, '0')}:00`,
      p50,
      p95,
      p99,
      avg: Math.floor((p50 + p95 + p99) / 3),
    });
  }
  
  return data;
};