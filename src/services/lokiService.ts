import axios from 'axios';
import lokiConfig from '../config/loki.config';

const lokiService = axios.create(lokiConfig);

/**
 * 查询 Loki 日志
 * @param query 查询表达式
 * @param start 开始时间（Unix 秒）
 * @param end 结束时间（Unix 秒）
 * @param limit 最大返回条数（默认 2000）
 */
export const queryLoki = async (query: string, start: number, end: number, limit: number = 2000) => {
  try {
    const response = await lokiService.get('/loki/api/v1/query_range', {
      params: {
        query,
        start,
        end,
        direction: 'BACKWARD',
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Loki 查询失败:', error);
    throw error;
  }
};

/**
 * 获取 Loki 日志流（立即查询）
 */
export const queryLokiInstant = async (query: string) => {
  try {
    const response = await lokiService.get('/loki/api/v1/query', {
      params: {
        query,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Loki 即时查询失败:', error);
    throw error;
  }
};

/**
 * 获取日志标签和值
 */
export const fetchLokiLabels = async () => {
  try {
    const response = await lokiService.get('/loki/api/v1/labels');
    return response.data;
  } catch (error) {
    console.error('获取 Loki 标签失败:', error);
    throw error;
  }
};

/**
 * 获取特定标签的值
 */
export const fetchLokiLabelValues = async (label: string) => {
  try {
    const response = await lokiService.get(`/loki/api/v1/label/${label}/values`);
    return response.data;
  } catch (error) {
    console.error(`获取 Loki 标签值 (${label}) 失败:`, error);
    throw error;
  }
};

export default lokiService;