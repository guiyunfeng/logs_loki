// Loki API 服务接口
export interface LokiConfig {
  url: string;
  defaultQueryLimit?: number;
}

export interface LokiQueryResult {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      values?: Array<[number, string]>;
      value?: [number, string];
    }>;
  };
}

export interface LokiStreamResult {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      stream: Record<string, string>;
      values: Array<[string, string]>; // [timestamp_ns, log_line]
    }>;
  };
}

export class LokiService {
  private config: LokiConfig;

  constructor(config: LokiConfig) {
    this.config = {
      ...config,
      defaultQueryLimit: config.defaultQueryLimit || 1000,
    };
  }

  /**
   * 执行 LogQL 查询
   */
  async query(query: string, time?: number): Promise<LokiQueryResult> {
    const params = new URLSearchParams({
      query,
      time: time ? time.toString() : Math.floor(Date.now() / 1000).toString(), // Unix 秒
      limit: this.config.defaultQueryLimit!.toString(),
    });

    const response = await fetch(
      `${this.config.url}/loki/api/v1/query?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Loki query failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 执行范围查询
   */
  async queryRange(
    query: string,
    start: number,
    end: number,
    step?: number
  ): Promise<LokiQueryResult> {
    const params = new URLSearchParams({
      query,
      start: (start * 1000000000).toString(), // 转换为纳秒
      end: (end * 1000000000).toString(),
      limit: this.config.defaultQueryLimit!.toString(),
    });

    if (step) {
      params.append('step', step.toString());
    }

    const response = await fetch(
      `${this.config.url}/loki/api/v1/query_range?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Loki query_range failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取日志流（用于实时日志展示）
   */
  async getLogStream(
    query: string,
    limit: number = 100
  ): Promise<LokiStreamResult> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
    });

    const response = await fetch(
      `${this.config.url}/loki/api/v1/query?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Loki stream query failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取所有标签
   */
  async getLabels(start?: number, end?: number): Promise<string[]> {
    const params = new URLSearchParams();
    if (start) params.append('start', (start * 1000000000).toString());
    if (end) params.append('end', (end * 1000000000).toString());

    const response = await fetch(
      `${this.config.url}/loki/api/v1/labels?${params}`
    );

    if (!response.ok) {
      throw new Error(`Loki labels query failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  }

  /**
   * 获取标签的所有值
   */
  async getLabelValues(label: string): Promise<string[]> {
    const response = await fetch(
      `${this.config.url}/loki/api/v1/label/${label}/values`
    );

    if (!response.ok) {
      throw new Error(`Loki label values query failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  }
}

// 创建默认实例
export const createLokiService = (url: string) => {
  return new LokiService({
    url,
    defaultQueryLimit: 1000,
  });
};
