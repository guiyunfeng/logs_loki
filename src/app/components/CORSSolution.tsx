import { Copy, CheckCircle, AlertCircle, Server, Terminal } from 'lucide-react';
import { useState } from 'react';

export function CORSSolution() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    try { navigator.clipboard.writeText(text); } catch {}
    setCopiedIndex(index);
  };

  const nginxConfig = `server {
    listen 80;
    server_name your-domain.com;  # 改成你的域名或 IP

    location /loki/ {
        proxy_pass http://localhost:3100/;
        
        # CORS 配置
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
        
        # 处理 OPTIONS 预检请求
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain';
            return 204;
        }
        
        # 代理配置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`;

  const caddyConfig = `your-domain.com {
    reverse_proxy /loki/* localhost:3100 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
    
    header /* {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization"
    }
    
    @options {
        method OPTIONS
    }
    respond @options 204
}`;

  const dockerComposeConfig = `version: '3'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - loki
    restart: unless-stopped

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped`;

  const quickNginxConfig = `# 快速 Nginx 配置
# 1. 创建文件: /etc/nginx/sites-available/loki-cors

server {
    listen 8080;
    
    location / {
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Content-Type';
            return 204;
        }
        
        add_header 'Access-Control-Allow-Origin' '*' always;
        proxy_pass http://localhost:3100;
    }
}

# 2. 启用配置:
# ln -s /etc/nginx/sites-available/loki-cors /etc/nginx/sites-enabled/
# nginx -t
# systemctl reload nginx

# 3. 然后在前端使用: http://your-ip:8080 代替 http://your-ip:3100`;

  const solutions = [
    {
      title: '方案 1: Nginx 反向代理 (推荐)',
      icon: <Server className="w-5 h-5" />,
      color: 'blue',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      textClass: 'text-blue-900',
      buttonClass: 'bg-blue-500',
      steps: [
        '安装 Nginx',
        '创建配置文件 /etc/nginx/sites-available/loki-cors',
        '粘贴下面的配置并修改域名/IP',
        '启用配置: ln -s /etc/nginx/sites-available/loki-cors /etc/nginx/sites-enabled/',
        '测试配置: nginx -t',
        '重载 Nginx: systemctl reload nginx',
        '在前端使用新的 URL (如 http://your-ip:8080)',
      ],
      config: nginxConfig,
      configIndex: 0,
    },
    {
      title: '方案 2: Caddy 反向代理 (最简单)',
      icon: <Server className="w-5 h-5" />,
      color: 'green',
      bgClass: 'bg-green-50',
      borderClass: 'border-green-200',
      textClass: 'text-green-900',
      buttonClass: 'bg-green-500',
      steps: [
        '安装 Caddy: curl https://getcaddy.com | bash -s personal',
        '创建 Caddyfile',
        '粘贴下面的配置',
        '运行: caddy run',
        '自动配置 HTTPS 和 CORS',
      ],
      config: caddyConfig,
      configIndex: 1,
    },
    {
      title: '方案 3: Docker Compose 一键部署',
      icon: <Terminal className="w-5 h-5" />,
      color: 'purple',
      bgClass: 'bg-purple-50',
      borderClass: 'border-purple-200',
      textClass: 'text-purple-900',
      buttonClass: 'bg-purple-500',
      steps: [
        '创建 docker-compose.yml',
        '创建 nginx.conf (使用方案 1 的配置)',
        '运行: docker-compose up -d',
        '访问 http://your-ip:8080',
      ],
      config: dockerComposeConfig,
      configIndex: 2,
    },
    {
      title: '方案 4: 快速 Nginx 配置 (5 分钟搞定)',
      icon: <Terminal className="w-5 h-5" />,
      color: 'orange',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-200',
      textClass: 'text-orange-900',
      buttonClass: 'bg-orange-500',
      steps: [
        '复制下面的完整配置',
        '按照注释中的步骤操作',
        '立即解决 CORS 问题',
      ],
      config: quickNginxConfig,
      configIndex: 3,
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-6 h-6 text-red-500" />
        <h2 className="text-xl font-bold text-gray-900">CORS 跨域问题解决方案</h2>
      </div>

      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="font-semibold text-red-900 mb-2">⚠️ 问题诊断</h3>
        <p className="text-sm text-red-800">
          浏览器安全策略阻止了前端直接访问 Loki 服务器 (http://47.242.170.56:3100)。
          这是因为 Loki 服务器没有返回正确的 CORS 响应头。
        </p>
      </div>

      <div className="space-y-6">
        {solutions.map((solution, index) => (
          <div
            key={index}
            className={`p-5 border-2 rounded-lg ${solution.bgClass} ${solution.borderClass}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 ${solution.buttonClass} text-white rounded-lg`}>
                {solution.icon}
              </div>
              <h3 className={`text-lg font-semibold ${solution.textClass}`}>
                {solution.title}
              </h3>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">操作步骤:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                {solution.steps.map((step, stepIndex) => (
                  <li key={stepIndex}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">配置文件:</h4>
                <button
                  onClick={() => copyToClipboard(solution.config, solution.configIndex)}
                  className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm"
                >
                  {copiedIndex === solution.configIndex ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>复制配置</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                {solution.config}
              </pre>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-2">💡 推荐方案</h3>
        <p className="text-sm text-yellow-800 mb-3">
          如果你熟悉 Nginx，使用<strong>方案 4 (快速 Nginx 配置)</strong>最快。
          如果你想要最简单的方案，使用<strong>方案 2 (Caddy)</strong>。
        </p>
        <p className="text-sm text-yellow-800">
          配置完成后，记得修改前端配置文件中的 Loki URL：
          <code className="ml-2 px-2 py-1 bg-white rounded text-xs">
            /src/config/loki.config.ts
          </code>
        </p>
      </div>

      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-2">✅ 配置后测试</h3>
        <p className="text-sm text-green-800">
          配置完成后，回到"调试工具"页面，点击"执行测试"验证 CORS 问题是否解决。
          如果看到 JSON 响应和状态码 200，说明配置成功！
        </p>
      </div>
    </div>
  );
}