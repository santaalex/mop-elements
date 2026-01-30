# MoP Atomic Elements Library

This repository contains the atomic rendering components for the MoP (Metrics-on-Process) Platform. These components are designed to be cloud-encapsulated to ensure physical isolation and prevent regression during development.

## 📦 Components

### 1. ViewportEngine (Stage Layer)
The core engine responsible for infinite canvas zoom, pan, and coordinate transformations.

#### Usage
```javascript
import { ViewportEngine } from 'https://esm.sh/gh/santaalex/mop-elements/ViewportEngine.js';

const engine = new ViewportEngine('app-container');
```

#### API Highlights
- `toWorld(x, y)`: Screen to World coordinate conversion.
- `toScreen(x, y)`: World to Screen coordinate conversion.
- `centerOn(x, y)`: Smoothly focus the camera on a specific coordinate.
- `on('change', callback)`: Listen to zoom/pan updates.

---

## 🛠 Development Strategy
All core logic here is "Locked" for local AI agents. To modify these components, changes must be made directly in this repository and then pulled via ESM CDNs into the main application.

---

## 📜 License
Industrial Use Only.
