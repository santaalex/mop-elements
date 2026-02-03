/**
 * MoP Inspector SDK - Property Inspector & KPI Management
 * 
 * @version 1.0.0
 * @license MIT
 * @author MoP Team
 * 
 * High-Star Best Practice: Unified Export Pattern (Ant Design, Excalidraw)
 * 高星最佳实践：统一导出模式 (Ant Design, Excalidraw)
 */

// Main Components / 主要组件
export { RightSidebar } from './RightSidebar.js';

// UI Components / UI 组件
export { MetricCard } from './components/MetricCard.js';
export { MetricForm } from './components/MetricForm.js';
export { MetricFormDrawer } from './components/MetricFormDrawer.js';
export { MetricTrafficLight } from './components/MetricTrafficLight.js';
export { AdaptiveDrawer } from './components/AdaptiveDrawer.js';

// Re-export MetricCore from metric-sdk / 重新导出 MetricCore
// export { createMetric, calcMetricStatus, MetricStatus } from '../mop-metric-sdk/MetricCore.js';
