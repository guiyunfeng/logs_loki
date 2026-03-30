/**
 * ═══════════════════════════════════════════════════════════════
 * 业务架构定义 - Loki 日志监控系统
 * ═══════════════════════════════════════════════════════════════
 * 
 * 核心定位公式：服务器 + 项目名 + 服务名
 * 
 * 示例：
 * - 服务器: 192.168.1.10
 * - 项目: project-a（从路径 /data/project-a/ 提取）
 * - 服务: nginx
 * → 唯一标识: 192.168.1.10 + project-a + nginx
 */

/* ═══════════════════════════════════════════════════════════════
   类型定义
   ═══════════════════════════════════════════════════════════════ */

export interface ServiceInstance {
  id: string;
  server: string;            // 服务器IP
  hostname: string;          // 主机名
  project: string;           // 项目名（从路径提取）
  service: string;           // 服务名（nginx/mysql/redis/go-api等）
  servicePath: string;       // 日志路径，如 /data/project-a/nginx/logs/
  serviceType: 'web' | 'api' | 'database' | 'cache' | 'queue' | 'gateway' | 'worker';
  language?: string;         // 技术栈：Nginx, PHP, MySQL, Go, Python, C++
  port?: number;             // 服务端口
  status: 'running' | 'warning' | 'error' | 'stopped';
  cpu: number;               // CPU 使用率
  memory: number;            // 内存使用率
  errorCount24h: number;     // 24小时错误数
  lastError?: string;        // 最近一次错误
  startTime: string;         // 启动时间
  owner: string;             // 负责人
  oncallPhone: string;       // 值班电话
}

export interface Server {
  ip: string;                // 服务器IP
  hostname: string;          // 主机名
  region: string;            // 地域：华东、华北、华南
  cloud: string;             // 云厂商：阿里云、腾讯云、自建机房
  status: 'running' | 'warning' | 'error';
  cpu: number;               // 整机CPU使用率
  memory: number;            // 整机内存使用率
  instances: ServiceInstance[];  // 该服务器上运行的所有服务
}

export interface ServiceGroup {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  servers: Server[];         // 该服务组的服务器列表
}

/* ═══════════════════════════════════════════════════════════════
   Loki 标签体系设计
   ═══════════════════════════════════════════════════════════════ */

export interface LokiLabels {
  job: string;                    // 固定为 "app"
  
  // 【核心三元组】- 唯一定位
  server: string;                 // 服务器IP，如 "192.168.1.10"
  project: string;                // 项目名（从路径提取），如 "project-a"
  service: string;                // 服务名，如 "nginx"
  
  // 【辅助信息】
  hostname?: string;              // 主机名，如 "web-server-01"
  service_type?: string;          // 服务类型：web/api/database/cache
  language?: string;              // 语言/技术栈
  region?: string;                // 地域
  cloud?: string;                 // 云厂商
  
  // 【日志分类】
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';
  error_category?: string;        // 错误分类
}

/* ═══════════════════════════════════════════════════════════════
   业务架构数据
   ═══════════════════════════════════════════════════════════════ */

export const BUSINESS_ARCHITECTURE: ServiceGroup[] = [
  {
    id: 'web-group',
    name: 'web-services',
    displayName: 'Web 服务组',
    description: '前端网关、Web 服务器',
    icon: 'Globe',
    color: 'blue',
    servers: [
      {
        ip: '192.168.1.10',
        hostname: 'web-server-01',
        region: '华东-上海',
        cloud: '阿里云',
        status: 'running',
        cpu: 45,
        memory: 62,
        instances: [
          {
            id: 'web-01-project-a-nginx',
            server: '192.168.1.10',
            hostname: 'web-server-01',
            project: 'project-a',
            service: 'nginx',
            servicePath: '/data/project-a/nginx/logs/',
            serviceType: 'gateway',
            language: 'Nginx 1.24',
            port: 80,
            status: 'running',
            cpu: 35,
            memory: 28,
            errorCount24h: 12,
            lastError: '2026-03-27 14:30:01 - Upstream timeout',
            startTime: '2026-03-20 10:00:00',
            owner: '张三',
            oncallPhone: '13800138000',
          },
          {
            id: 'web-01-project-a-php-fpm',
            server: '192.168.1.10',
            hostname: 'web-server-01',
            project: 'project-a',
            service: 'php-fpm',
            servicePath: '/data/project-a/php-fpm/logs/',
            serviceType: 'web',
            language: 'PHP 8.2',
            port: 9000,
            status: 'running',
            cpu: 42,
            memory: 55,
            errorCount24h: 8,
            startTime: '2026-03-20 10:05:00',
            owner: '张三',
            oncallPhone: '13800138000',
          },
          {
            id: 'web-01-project-b-nginx',
            server: '192.168.1.10',
            hostname: 'web-server-01',
            project: 'project-b',
            service: 'nginx',
            servicePath: '/data/project-b/nginx/logs/',
            serviceType: 'gateway',
            language: 'Nginx 1.24',
            port: 8080,
            status: 'warning',
            cpu: 68,
            memory: 72,
            errorCount24h: 34,
            lastError: '2026-03-27 15:12:45 - Too many open files',
            startTime: '2026-03-20 10:10:00',
            owner: '李四',
            oncallPhone: '13900139000',
          },
        ],
      },
      {
        ip: '192.168.1.11',
        hostname: 'web-server-02',
        region: '华东-上海',
        cloud: '阿里云',
        status: 'running',
        cpu: 38,
        memory: 52,
        instances: [
          {
            id: 'web-02-project-a-nginx',
            server: '192.168.1.11',
            hostname: 'web-server-02',
            project: 'project-a',
            service: 'nginx',
            servicePath: '/data/project-a/nginx/logs/',
            serviceType: 'gateway',
            language: 'Nginx 1.24',
            port: 80,
            status: 'running',
            cpu: 32,
            memory: 45,
            errorCount24h: 5,
            startTime: '2026-03-21 09:00:00',
            owner: '张三',
            oncallPhone: '13800138000',
          },
          {
            id: 'web-02-project-c-nginx',
            server: '192.168.1.11',
            hostname: 'web-server-02',
            project: 'project-c',
            service: 'nginx',
            servicePath: '/data/project-c/nginx/logs/',
            serviceType: 'gateway',
            language: 'Nginx 1.24',
            port: 8888,
            status: 'running',
            cpu: 28,
            memory: 38,
            errorCount24h: 3,
            startTime: '2026-03-21 09:05:00',
            owner: '王五',
            oncallPhone: '13700137000',
          },
        ],
      },
    ],
  },
  {
    id: 'api-group',
    name: 'api-services',
    displayName: 'API 服务组',
    description: 'Go、Python、C++ 业务 API',
    icon: 'Cpu',
    color: 'emerald',
    servers: [
      {
        ip: '192.168.2.10',
        hostname: 'api-server-01',
        region: '华北-北京',
        cloud: '腾讯云',
        status: 'running',
        cpu: 58,
        memory: 68,
        instances: [
          {
            id: 'api-01-user-api-go',
            server: '192.168.2.10',
            hostname: 'api-server-01',
            project: 'user-api',
            service: 'go-service',
            servicePath: '/data/user-api/go-service/logs/',
            serviceType: 'api',
            language: 'Go 1.21',
            port: 8080,
            status: 'running',
            cpu: 54,
            memory: 62,
            errorCount24h: 23,
            lastError: '2026-03-27 14:30:01 - Database connection timeout',
            startTime: '2026-03-19 08:00:00',
            owner: '赵六',
            oncallPhone: '13600136000',
          },
          {
            id: 'api-01-order-api-python',
            server: '192.168.2.10',
            hostname: 'api-server-01',
            project: 'order-api',
            service: 'python-service',
            servicePath: '/data/order-api/python-service/logs/',
            serviceType: 'api',
            language: 'Python 3.11',
            port: 8000,
            status: 'running',
            cpu: 48,
            memory: 58,
            errorCount24h: 19,
            startTime: '2026-03-19 08:05:00',
            owner: '孙七',
            oncallPhone: '13500135000',
          },
        ],
      },
      {
        ip: '192.168.2.11',
        hostname: 'api-server-02',
        region: '华北-北京',
        cloud: '腾讯云',
        status: 'error',
        cpu: 92,
        memory: 95,
        instances: [
          {
            id: 'api-02-user-api-go',
            server: '192.168.2.11',
            hostname: 'api-server-02',
            project: 'user-api',
            service: 'go-service',
            servicePath: '/data/user-api/go-service/logs/',
            serviceType: 'api',
            language: 'Go 1.21',
            port: 8080,
            status: 'error',
            cpu: 95,
            memory: 98,
            errorCount24h: 156,
            lastError: '2026-03-27 15:45:12 - Out of memory',
            startTime: '2026-03-19 08:10:00',
            owner: '赵六',
            oncallPhone: '13600136000',
          },
          {
            id: 'api-02-payment-api-cpp',
            server: '192.168.2.11',
            hostname: 'api-server-02',
            project: 'payment-api',
            service: 'cpp-service',
            servicePath: '/data/payment-api/cpp-service/logs/',
            serviceType: 'api',
            language: 'C++ 17',
            port: 9090,
            status: 'running',
            cpu: 41,
            memory: 52,
            errorCount24h: 7,
            startTime: '2026-03-22 10:00:00',
            owner: '周八',
            oncallPhone: '13400134000',
          },
        ],
      },
      {
        ip: '192.168.2.12',
        hostname: 'api-server-03',
        region: '华南-深圳',
        cloud: '自建机房',
        status: 'running',
        cpu: 36,
        memory: 48,
        instances: [
          {
            id: 'api-03-analytics-python',
            server: '192.168.2.12',
            hostname: 'api-server-03',
            project: 'analytics',
            service: 'python-worker',
            servicePath: '/data/analytics/python-worker/logs/',
            serviceType: 'worker',
            language: 'Python 3.11',
            port: 5000,
            status: 'running',
            cpu: 36,
            memory: 48,
            errorCount24h: 15,
            startTime: '2026-03-23 11:00:00',
            owner: '吴九',
            oncallPhone: '13300133000',
          },
        ],
      },
    ],
  },
  {
    id: 'data-group',
    name: 'data-services',
    displayName: '数据服务组',
    description: 'MySQL、Redis、消息队列',
    icon: 'Database',
    color: 'purple',
    servers: [
      {
        ip: '192.168.3.10',
        hostname: 'db-server-01',
        region: '华东-上海',
        cloud: '阿里云',
        status: 'running',
        cpu: 68,
        memory: 75,
        instances: [
          {
            id: 'db-01-project-a-mysql',
            server: '192.168.3.10',
            hostname: 'db-server-01',
            project: 'project-a',
            service: 'mysql',
            servicePath: '/data/project-a/mysql/logs/',
            serviceType: 'database',
            language: 'MySQL 8.0',
            port: 3306,
            status: 'running',
            cpu: 65,
            memory: 72,
            errorCount24h: 28,
            lastError: '2026-03-27 13:25:30 - Slow query detected',
            startTime: '2026-03-01 00:00:00',
            owner: '郑十',
            oncallPhone: '13200132000',
          },
          {
            id: 'db-01-project-a-redis',
            server: '192.168.3.10',
            hostname: 'db-server-01',
            project: 'project-a',
            service: 'redis',
            servicePath: '/data/project-a/redis/logs/',
            serviceType: 'cache',
            language: 'Redis 7.0',
            port: 6379,
            status: 'running',
            cpu: 35,
            memory: 68,
            errorCount24h: 6,
            startTime: '2026-03-01 00:00:00',
            owner: '郑十',
            oncallPhone: '13200132000',
          },
        ],
      },
      {
        ip: '192.168.3.11',
        hostname: 'db-server-02',
        region: '华北-北京',
        cloud: '腾讯云',
        status: 'running',
        cpu: 52,
        memory: 64,
        instances: [
          {
            id: 'db-02-project-b-mysql',
            server: '192.168.3.11',
            hostname: 'db-server-02',
            project: 'project-b',
            service: 'mysql',
            servicePath: '/data/project-b/mysql/logs/',
            serviceType: 'database',
            language: 'MySQL 8.0',
            port: 3306,
            status: 'running',
            cpu: 48,
            memory: 61,
            errorCount24h: 12,
            startTime: '2026-03-01 00:00:00',
            owner: '李四',
            oncallPhone: '13900139000',
          },
          {
            id: 'db-02-project-c-redis',
            server: '192.168.3.11',
            hostname: 'db-server-02',
            project: 'project-c',
            service: 'redis',
            servicePath: '/data/project-c/redis/logs/',
            serviceType: 'cache',
            language: 'Redis 7.0',
            port: 6379,
            status: 'running',
            cpu: 32,
            memory: 55,
            errorCount24h: 4,
            startTime: '2026-03-01 00:00:00',
            owner: '王五',
            oncallPhone: '13700137000',
          },
        ],
      },
      {
        ip: '192.168.3.12',
        hostname: 'db-server-03',
        region: '华南-深圳',
        cloud: '自建机房',
        status: 'running',
        cpu: 30,
        memory: 42,
        instances: [
          {
            id: 'db-03-common-redis',
            server: '192.168.3.12',
            hostname: 'db-server-03',
            project: 'common',
            service: 'redis',
            servicePath: '/data/common/redis/logs/',
            serviceType: 'cache',
            language: 'Redis 7.0',
            port: 6379,
            status: 'running',
            cpu: 30,
            memory: 42,
            errorCount24h: 3,
            startTime: '2026-03-01 00:00:00',
            owner: '吴九',
            oncallPhone: '13300133000',
          },
        ],
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   工具函数
   ═══════════════════════════════════════════════════════════════ */

/**
 * 根据三元组获取服务实例
 */
export function getInstanceByKey(server: string, project: string, service: string): ServiceInstance | null {
  for (const group of BUSINESS_ARCHITECTURE) {
    for (const srv of group.servers) {
      if (srv.ip === server) {
        const instance = srv.instances.find(
          inst => inst.project === project && inst.service === service
        );
        if (instance) return instance;
      }
    }
  }
  return null;
}

/**
 * 获取服务器信息
 */
export function getServerByIP(ip: string): Server | null {
  for (const group of BUSINESS_ARCHITECTURE) {
    const server = group.servers.find(s => s.ip === ip);
    if (server) return server;
  }
  return null;
}

/**
 * 获取所有服务器列表
 */
export function getAllServers(): Server[] {
  return BUSINESS_ARCHITECTURE.flatMap(group => group.servers);
}

/**
 * 获取所有服务实例列表
 */
export function getAllInstances(): ServiceInstance[] {
  return BUSINESS_ARCHITECTURE.flatMap(group =>
    group.servers.flatMap(server => server.instances)
  );
}

/**
 * 按项目分组统计
 */
export function getProjectStats() {
  const instances = getAllInstances();
  const projectMap = new Map<string, ServiceInstance[]>();
  
  instances.forEach(inst => {
    const existing = projectMap.get(inst.project) || [];
    existing.push(inst);
    projectMap.set(inst.project, existing);
  });
  
  return Array.from(projectMap.entries()).map(([project, instances]) => {
    const totalErrors = instances.reduce((sum, inst) => sum + inst.errorCount24h, 0);
    const runningCount = instances.filter(inst => inst.status === 'running').length;
    
    return {
      project,
      instanceCount: instances.length,
      runningCount,
      totalErrors,
      healthRate: (runningCount / instances.length) * 100,
    };
  });
}

/**
 * 统计各服务组的健康状态
 */
export function getGroupHealthStats() {
  return BUSINESS_ARCHITECTURE.map(group => {
    const totalServers = group.servers.length;
    const totalInstances = group.servers.reduce((sum, srv) => sum + srv.instances.length, 0);
    const runningInstances = group.servers.reduce(
      (sum, srv) => sum + srv.instances.filter(inst => inst.status === 'running').length,
      0
    );
    const warningInstances = group.servers.reduce(
      (sum, srv) => sum + srv.instances.filter(inst => inst.status === 'warning').length,
      0
    );
    const errorInstances = group.servers.reduce(
      (sum, srv) => sum + srv.instances.filter(inst => inst.status === 'error').length,
      0
    );
    const totalErrors24h = group.servers.reduce(
      (sum, srv) => sum + srv.instances.reduce((s, inst) => s + inst.errorCount24h, 0),
      0
    );
    
    return {
      groupId: group.id,
      groupName: group.displayName,
      totalServers,
      totalInstances,
      runningInstances,
      warningInstances,
      errorInstances,
      totalErrors24h,
      healthRate: (runningInstances / totalInstances) * 100,
    };
  });
}
