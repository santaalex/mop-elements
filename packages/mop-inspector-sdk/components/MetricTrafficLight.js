/**
 * MetricTrafficLight.js
 * 
 * 原子组件：显示交通灯状态 (红/黄/绿)
 * Atomic Component: Display Traffic Light Status (Red/Yellow/Green)
 * 
 * @returns {string} HTML string
 */
import { MetricStatus } from '../../mop-metric-sdk/MetricCore.js';

const STATUS_COLORS = {
    [MetricStatus.Green]: '#10B981', // Emerald 500
    [MetricStatus.Yellow]: '#F59E0B', // Amber 500
    [MetricStatus.Red]: '#EF4444',    // Red 500
    [MetricStatus.Gray]: '#9CA3AF'    // Gray 400
};

/**
 * Generates the HTML string for the traffic light.
 * 生成交通灯的 HTML 字符串。
 * 
 * @param {Object} props
 * @param {string} props.status - MetricStatus enum value
 * @param {number} [props.size] - Size in pixels (default: 12)
 * @returns {string} HTML String
 */
export function MetricTrafficLight({ status, size = 12 }) {
    const color = STATUS_COLORS[status] || STATUS_COLORS[MetricStatus.Gray];

    // Inline style for atomic styling
    const style = `width: ${size}px; height: ${size}px; border-radius: 50%; background-color: ${color}; display: inline-block; box-shadow: 0 0 4px ${color}80;`;

    return `<div style="${style}" title="${status}"></div>`;
}
