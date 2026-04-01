import { queryLoki } from './lokiService';

/**
 * 从 Loki 获取并转换真实日志数据
 */
export class RealLokiDataService {
  /**
   * 获取所有日志
   */
  static async fetchAllLogs(timeRangeMinutes: number = 1440) {
    try {
      // 计算时间范围
      const end = Date.now();
      const start = end - timeRangeMinutes * 60 * 1000;

      // 查询所有日志
      const queryExpr = '{job!=""}'; // 获取所有日志
      const response = await queryLoki(queryExpr, start, end);

      // 转换数据格式
      const logs: Array<{
        id: string;
        timestamp: string;
        level: string;
        message: string;
        service: string;
        labels: Record<string, string>;
      }> = [];

      if (response.data?.result?.length > 0) {
        response.data.result.forEach((stream: any) => {
          const labels = stream.stream || {};
          stream.values?.forEach((value: [string, string], index: number) => {
            const [timestamp, message] = value;
            logs.push({
              id: `${labels.job || 'unknown'}-${index}-${timestamp}`,
              timestamp: new Date(parseInt(timestamp) / 1000000).toISOString(),
              level: labels.level || 'INFO',
              message: message,
              service: labels.job || labels.service || 'unknown',
              labels,
            });
          });
        });
      }

      return logs;
    } catch (error) {
      console.error('从 Loki 获取日志失败:', error);
      return [];
    }
  }

  /**
   * 获取错误日志统计
   */
  static async getErrorStats(timeRangeMinutes: number = 1440) {
    try {
      const end = Date.now();
      const start = end - timeRangeMinutes * 60 * 1000;

      // 查询错误日志
      const response = await queryLoki(
        '{level="ERROR"} | json',
        start,
        end
      );

      const logs = [];
      if (response.data?.result?.length > 0) {
        response.data.result.forEach((stream: any) => {
          stream.values?.forEach((value: [string, string]) => {
            logs.push(value[1]);
          });
        });
      }

      return {
        total: logs.length,
        byService: this.groupByField(logs, 'service'),
        topErrors: this.getTopErrors(logs, 10),
      };
    } catch (error) {
      console.error('获取错误统计失败:', error);
      return { total: 0, byService: {}, topErrors: [] };
    }
  }

  /**
   * 按字段分组
   */
  private static groupByField(logs: string[], field: string) {
    const result: Record<string, number> = {};
    logs.forEach((log) => {
      try {
        const parsed = JSON.parse(log);
        const value = parsed[field] || 'unknown';
        result[value] = (result[value] || 0) + 1;
      } catch (e) {
        // 忽略无法解析的日志
      }
    });
    return result;
  }

  /**
   * 获取顶部错误
   */
  private static getTopErrors(logs: string[], limit: number) {
    const errorCounts: Record<string, number> = {};
    logs.forEach((log) => {
      try {
        const parsed = JSON.parse(log);
        const message = parsed.message || 'unknown';
        errorCounts[message] = (errorCounts[message] || 0) + 1;
      } catch (e) {
        // 忽略无法解析的日志
      }
    });

    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([message, count]) => ({ message, count }));
  }
}

export default RealLokiDataService;