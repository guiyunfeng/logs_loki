const lokiConfig = {
  // 在开发环境使用代理路径，在生产环境使用完整 URL
  baseURL: import.meta.env.MODE === 'development' ? '/loki' : 'https://loki.goingf.hk',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
};

export default lokiConfig;