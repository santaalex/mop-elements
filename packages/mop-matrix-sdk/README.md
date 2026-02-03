# MoP Matrix SDK

> L3 Matrix & SOP Collaboration for MoP Platform

## Features

- ✅ **MatrixView**: L3 RACI Matrix renderer
- ✅ **RoleSOPMatrixEditor**: Multi-role SOP collaboration matrix
- ✅ **RolePIEditor**: Role Performance Indicator editor
- ✅ **ActivityKPIModal**: Activity KPI management modal

## Installation

### From Local
```javascript
import { MatrixView } from './packages/mop-matrix-sdk/index.js';
```

### From CDN (Future)
```javascript
import { MatrixView } from 'https://cdn.jsdelivr.net/gh/santaalex/mop-elements@v1.0.0/packages/mop-matrix-sdk/index.js';
```

## Usage

```javascript
// Initialize Matrix
const matrix = new MatrixView(editorView);

// Mount to container
matrix.mount(document.getElementById('matrix-container'));

// Open L3 Matrix for activity
matrix.roleSOPMatrixEditor.open({ activityId: 'node-123' });
```

## Dependencies

- `mop-inspector-sdk` - For MetricFormDrawer

## Version

1.0.0
