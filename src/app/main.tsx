import { updateDashboards } from './services/grafanaService';

const dashboards = [
  {
    dashboard: {
      id: null,
      uid: 'panel-1',
      title: '错误日志面板',
      panels: [
        {
          type: 'graph',
          title: '错误日志趋势',
          targets: [
            {
              expr: '{job="my-job-name"} | logfmt | level="error"',
              legendFormat: '{{level}}',
              refId: 'A',
            },
          ],
        },
      ],
    },
    overwrite: true,
  },
  {
    dashboard: {
      id: null,
      uid: 'panel-2',
      title: '警告日志面板',
      panels: [
        {
          type: 'table',
          title: '警告日志详情',
          targets: [
            {
              expr: '{job="my-job-name"} | logfmt | level="warning"',
              refId: 'B',
            },
          ],
        },
      ],
    },
    overwrite: true,
  },
  {
    dashboard: {
      id: null,
      uid: 'panel-3',
      title: '信息日志面板',
      panels: [
        {
          type: 'logs',
          title: '信息日志',
          targets: [
            {
              expr: '{job="my-job-name"} | logfmt | level="info"',
              refId: 'C',
            },
          ],
        },
      ],
    },
    overwrite: true,
  },
  {
    dashboard: {
      id: null,
      uid: 'panel-4',
      title: '调试日志面板',
      panels: [
        {
          type: 'graph',
          title: '调试日志趋势',
          targets: [
            {
              expr: '{job="my-job-name"} | logfmt | level="debug"',
              refId: 'D',
            },
          ],
        },
      ],
    },
    overwrite: true,
  },
];

updateDashboards(dashboards)
  .then(() => console.log('所有面板更新完成'))
  .catch((error) => console.error('更新面板时出错:', error));