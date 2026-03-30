/**
 * ═══════════════════════════════════════════════════════════════
 * Grafana 集成模块 - 支持数据导出和仪表盘创建
 * ═══════════════════════════════════════════════════════════════
 */

import { AdvancedLokiService } from './advancedLokiService';

export interface GrafanaConfig {
  url: string;
  apiKey: string;
  orgId?: number;
}

export interface GrafanaDashboard {
  title: string;
  description: string;
  tags: string[];
  panels: GrafanaPanel[];
  refresh: string;
  time: {
    from: string;
    to: string;
  };
}

export interface GrafanaPanel {
  id: number;
  title: string;
  type: 'graph' | 'singlestat' | 'table' | 'pie' | 'gauge' | 'heatmap';
  targets: GrafanaTarget[];
  fieldConfig?: Record<string, any>;
  options?: Record<string, any>;
  gridPos: {
    h: number;
    w: number;
    x: number;
    y: number;
  };
}

export interface GrafanaTarget {
  expr: string;
  legendFormat: string;
  refId: string;
  datasourceUID: string;
}

export interface GrafanaAlertRule {
  uid: string;
  title: string;
  condition: string;
  data: Array<{
    refId: string;
    queryType: string;
    model: {
      expr: string;
      interval: string;
      refId: string;
    };
  }>;
  noDataState: 'NoData' | 'Alerting' | 'OK';
  execErrState: 'Alerting' | 'OK';
  for: string; // 告警持续时间，如 "5m"
  annotations: Record<string, string>;
  labels: Record<string, string>;
}

export interface AlertNotificationChannel {
  type: 'dingding' | 'weixin' | 'email' | 'webhook' | 'phone';
  name: string;
  settings: Record<string, any>;
  isDefault: boolean;
}

/**
 * Grafana 集成服务
 */
export class GrafanaService {
  private config: GrafanaConfig;
  private lokiService: AdvancedLokiService;

  constructor(config: GrafanaConfig, lokiService: AdvancedLokiService) {
    this.config = config;
    this.lokiService = lokiService;
  }

  /**
   * 创建仪表盘
   */
  async createDashboard(dashboard: GrafanaDashboard): Promise<{ id: number; uid: string }> {
    const response = await fetch(
      `${this.config.url}/api/dashboards/db`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Grafana-Org-Id': (this.config.orgId || 1).toString(),
        },
        body: JSON.stringify({
          dashboard: {
            ...dashboard,
            uid: this.generateUID(),
            version: 0,
            timezone: 'browser',
          },
          overwrite: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create dashboard: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 创建告警规则
   */
  async createAlertRule(rule: GrafanaAlertRule): Promise<{ uid: string }> {
    const response = await fetch(
      `${this.config.url}/api/ruler/grafana/rules/Loki-Alerts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          name: rule.title,
          ...rule,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create alert rule: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 更新通知渠道
   */
  async updateNotificationChannel(channel: AlertNotificationChannel): Promise<{ id: number }> {
    const response = await fetch(
      `${this.config.url}/api/alert-notifications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(channel),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create notification channel: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 查询 Loki 数据源
   */
  async queryLoki(expr: string, start: number, end: number): Promise<any> {
    const response = await fetch(
      `${this.config.url}/api/datasources/proxy/1/loki/api/v1/query_range`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          query: expr,
          start: start * 1000000, // 转换为纳秒
          end: end * 1000000,
          limit: 1000,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to query Loki: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 生成日志分析仪表盘
   */
  async generateLogAnalyticsDashboard(
    title: string = '日志分析仪表盘'
  ): Promise<{ id: number; uid: string }> {
    const dashboard: GrafanaDashboard = {
      title,
      description: '自动生成的日志分析仪表盘',
      tags: ['loki', 'logs', 'analytics'],
      refresh: '30s',
      time: {
        from: 'now-24h',
        to: 'now',
      },
      panels: this.generatePanels(),
    };

    return this.createDashboard(dashboard);
  }

  /**
   * 生成监控面板集合
   */
  private generatePanels(): GrafanaPanel[] {
    let yPos = 0;

    const panels: GrafanaPanel[] = [
      // 错误率面板
      {
        id: 1,
        title: '错误率',
        type: 'gauge',
        gridPos: { h: 8, w: 6, x: 0, y: yPos },
        targets: [
          {
            expr: 'sum(count_over_time({level=~"error|critical"}[5m])) / sum(count_over_time({level!=""}[5m]))',
            legendFormat: '错误率',
            refId: 'A',
            datasourceUID: 'loki-uid',
          },
        ],
      },

      // 错误趋势面板
      {
        id: 2,
        title: '过去24小时错误趋势',
        type: 'graph',
        gridPos: { h: 8, w: 18, x: 6, y: yPos },
        targets: [
          {
            expr: 'sum(count_over_time({level="error"}[1h]))',
            legendFormat: '错误',
            refId: 'A',
            datasourceUID: 'loki-uid',
          },
          {
            expr: 'sum(count_over_time({level="critical"}[1h]))',
            legendFormat: '关键',
            refId: 'B',
            datasourceUID: 'loki-uid',
          },
          {
            expr: 'sum(count_over_time({level="warning"}[1h]))',
            legendFormat: '警告',
            refId: 'C',
            datasourceUID: 'loki-uid',
          },
        ],
      },
    ];

    yPos += 8;

    panels.push(
      // 按服务统计
      {
        id: 3,
        title: '按服务分类统计',
        type: 'pie',
        gridPos: { h: 8, w: 12, x: 0, y: yPos },
        targets: [
          {
            expr: 'sum by (service) (count_over_time({level!=""}[1h]))',
            legendFormat: '{{ service }}',
            refId: 'A',
            datasourceUID: 'loki-uid',
          },
        ],
      },

      // 按项目统计
      {
        id: 4,
        title: '按项目分类统计',
        type: 'pie',
        gridPos: { h: 8, w: 12, x: 12, y: yPos },
        targets: [
          {
            expr: 'sum by (project) (count_over_time({level!=""}[1h]))',
            legendFormat: '{{ project }}',
            refId: 'A',
            datasourceUID: 'loki-uid',
          },
        ],
      }
    );

    yPos += 8;

    panels.push(
      // Top N 错误表格
      {
        id: 5,
        title: 'Top 10 错误',
        type: 'table',
        gridPos: { h: 8, w: 24, x: 0, y: yPos },
        targets: [
          {
            expr: 'topk(10, sum by (message) (count_over_time({level=~"error|critical"}[1h])))',
            legendFormat: '{{ message }}',
            refId: 'A',
            datasourceUID: 'loki-uid',
          },
        ],
      }
    );

    return panels;
  }

  /**
   * 生成告警规则
   */
  generateAlertRules(): GrafanaAlertRule[] {
    return [
      {
        uid: this.generateUID(),
        title: '高错误率告警',
        condition: 'A',
        data: [
          {
            refId: 'A',
            queryType: '',
            model: {
              expr: 'sum(count_over_time({level=~"error|critical"}[5m])) / sum(count_over_time({level!=""}[5m])) > 0.05',
              interval: '5m',
              refId: 'A',
            },
          },
        ],
        noDataState: 'OK',
        execErrState: 'OK',
        for: '5m',
        annotations: {
          description: '过去5分钟错误率超过5%',
          runbook_url: '',
        },
        labels: {
          severity: 'critical',
          team: 'platform',
        },
      },
      {
        uid: this.generateUID(),
        title: '关键错误计数告警',
        condition: 'A',
        data: [
          {
            refId: 'A',
            queryType: '',
            model: {
              expr: 'sum(count_over_time({level="critical"}[5m])) > 10',
              interval: '5m',
              refId: 'A',
            },
          },
        ],
        noDataState: 'OK',
        execErrState: 'OK',
        for: '2m',
        annotations: {
          description: '过去5分钟关键错误数超过10条',
          runbook_url: '',
        },
        labels: {
          severity: 'critical',
          team: 'platform',
        },
      },
    ];
  }

  /**
   * 生成 UID
   */
  private generateUID(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * 导出数据为 JSON
   */
  async exportDashboardJSON(dashboardId: number): Promise<string> {
    const response = await fetch(
      `${this.config.url}/api/dashboards/db`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to export dashboard: ${response.statusText}`);
    }

    const dashboard = await response.json();
    return JSON.stringify(dashboard, null, 2);
  }

  /**
   * 发送测试告警
   */
  async sendTestAlert(
    channelId: number,
    title: string = '测试告警'
  ): Promise<void> {
    const response = await fetch(
      `${this.config.url}/api/alert-notifications/test`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          id: channelId,
          name: '测试通道',
          type: 'webhook',
          message: title,
          title: title,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to send test alert: ${response.statusText}`);
    }
  }
}
