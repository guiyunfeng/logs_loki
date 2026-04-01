import axios from 'axios';

const grafanaConfig = {
  baseURL: 'http://172.16.30.250:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
};

const grafanaService = axios.create(grafanaConfig);

// 添加认证拦截器
grafanaService.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_GRAFANA_API_KEY || '';
  if (apiKey) {
    config.headers.Authorization = `Bearer ${apiKey}`;
  }
  return config;
});

export const createDashboard = async (dashboardConfig: any) => {
  try {
    const response = await grafanaService.post('/api/dashboards/db', dashboardConfig);
    return response.data;
  } catch (error) {
    console.error('Grafana 面板创建失败:', error);
    throw error;
  }
};

/**
 * 批量更新 Grafana 面板
 * @param dashboards 面板配置数组
 */
export const updateDashboards = async (dashboards: any[]) => {
  try {
    const results = await Promise.all(
      dashboards.map((dashboard) =>
        grafanaService.post('/api/dashboards/db', dashboard)
      )
    );
    console.log('所有面板更新成功:', results);
    return results;
  } catch (error) {
    console.error('批量更新面板失败:', error);
    throw error;
  }
};

export default grafanaService;