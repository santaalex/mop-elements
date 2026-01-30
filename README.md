# MoP Atomic Elements Library (Industrial Edition)

This repository contains the atomic rendering components for the MoP (Metrics-on-Process) Platform. These components are **cloud-encapsulated (Atom Layer)** to ensure physical isolation, preventing AI-driven regressions.

---

## 📦 Stage Layer

### 1. ViewportEngine.js
The infinite canvas engine.
- **CDN**: `https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/ViewportEngine.js`
- **Features**: Inertial pan, smooth zoom, coordinate transformation.

---

## 🏗 Atom Layer (Web Components)

### 1. LaneComponent.js (`<mop-lane>`)
Industrial swimlane with premium glassmorphism.
- **CDN**: `https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/LaneComponent.js`
- **Attributes**:
    - `name`: Lane title.
    - `width`: Standard width (e.g., `1200px`).
    - `height`: Standard height (e.g., `240px`).
    - `color`: Primary accent color.
- **Events**:
    - `lane-click`: Dispatched when the header is clicked.
    - `lane-rename`: Dispatched on header double-click (Signal for Shell to show rename UI).
    - `lane-drop`: Dispatched when an object is dropped inside.

### 2. NodeComponent.js (`<mop-node>`)
High-precision business process node.
- **CDN**: `https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/NodeComponent.js`
- **Attributes**:
    - `label`: Main text.
    - `kpi`: Monitoring value (e.g., `98%`, `12h`).
    - `status`: `normal` (green), `warning` (yellow), `critical` (red).
    - `color`: Accent color.
    - `type`: `activity`, `gateway`, `event`.
- **Interactions**: Built-in breathing status bulb and glass hover effects.

---

## 🛠 Architectural Philosophy: Shell vs. Atom
- **Atom (This Repo)**: Dumb components. They handle **Aesthetics (CSS)** and **Signals (Events)**. They DO NOT handle state management or complex mouse math.
- **Shell (Local App)**: Smart logic. It handles **Drag & Drop math**, **Resizing algorithm**, and **Data binding**.

---

## 📜 Development
To update these components:
1. Modify the `.js` files in this repo.
2. Commit and Push to GitHub.
3. Refresh the main application (ensure CDN cache is bypassed if needed).
