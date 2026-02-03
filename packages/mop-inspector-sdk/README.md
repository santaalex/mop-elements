# MoP Inspector SDK

> Property Inspector & KPI Management for MoP Platform

## Features

- ✅ **RightSidebar**: Activity property inspector with auto-save
- ✅ **MetricCard**: KPI display card with traffic light
- ✅ **MetricForm**: KPI editing form
- ✅ **MetricFormDrawer**: Drawer container for metric editing
- ✅ **MetricTrafficLight**: RAG status indicator
- ✅ **AdaptiveDrawer**: Responsive drawer (desktop/mobile)

## Installation

### From Local
```javascript
import { RightSidebar } from './packages/mop-inspector-sdk/index.js';
```

### From CDN (Future)
```javascript
import { RightSidebar } from 'https://cdn.jsdelivr.net/gh/santaalex/mop-elements@v1.0.0/packages/mop-inspector-sdk/index.js';
```

## Usage

```javascript
// Initialize Sidebar
const sidebar = new RightSidebar();

// Open for a node
sidebar.open('node-id-123');

// Close
sidebar.close();
```

## Dependencies

- `mop-metric-sdk` - Metric core logic

## Version

1.0.0
