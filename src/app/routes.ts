import { createBrowserRouter } from 'react-router';
import { LandingPage } from './components/LandingPage';
import { FlowPage } from './components/FlowPage';
import { SystemPage } from './components/SystemPage';
import { LogAnalyticsPage } from './components/LogAnalyticsPage';
import { AdvancedAnalyticsDashboard } from './components/AdvancedAnalyticsDashboard';

export const router = createBrowserRouter([
  { path: '/', Component: LandingPage },
  { path: '/analytics', Component: LogAnalyticsPage },
  { path: '/advanced', Component: AdvancedAnalyticsDashboard },
  { path: '/flow', Component: FlowPage },
  { path: '/system', Component: SystemPage },
  { path: '*', Component: LandingPage },
]);