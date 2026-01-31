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
High-precision business process node (L1 & L2).
- **CDN**: `https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/NodeComponent.js`
- **Visuals**: 
    - **L1**: Process node with drill-down `+` icon.
    - **L2**: 
        - `start` (Thin circle)
        - `end` (Thick 4px black stamp)
        - `activity` (Rounded rect)
        - `gateway` (Diamond with XOR/AND/OR icons)
- **Attributes**:
    - `type`: `process`, `start`, `end`, `activity`, `xor`, `and`, `or`.
    - `label`: Main text.
    - `kpi`: Monitoring value (e.g., `98%`).
    - `status`: `normal` (green), `warning` (yellow), `critical` (red).
- **Interface**:
    - `node.getAnchors()`: Returns physical coordinates of Top, Bottom, Left, Right centers.

### 3. EdgeComponent.js (`<mop-edge>`)
Atomic connector with industrial interactions.
- **CDN**: `https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/EdgeComponent.js`
- **Philosophy**: A "dumb" renderer. It does NOT calculate routes; it simply draws the path provided by the Shell.
- **Attributes**:
    - `points`: Coordinate string (e.g., `100,100 200,100`).
    - `color`: Stroke color.
    - `animated`: `true` for flowing dashed lines.
    - `selected`: `true` for blue highlight & edit handles.
    - `label`: Optional text.
- **Interactions**:
    - **Hit Area**: Includes a 16px transparent layer for easy clicking.
    - **Click**: Emits standard click events for the Shell to handle (e.g., selection).

---

## 🔗 Connection Strategy (Hybrid Snapping)
To achieve professional industrial routing (Shell Logic):

### 1. Default Mode (Automated)
- **Manhattan Routing**: Use `node.getAnchors()` to snap line endpoints to the **exact center** of the node's 4 sides.
- **Stub (Protection)**: Lines must travel **20px straight** out of the anchor before turning.

### 2. Manual Mode (Flexible)
- **Edge Projection**: If the user drags a line, calculate the **closest point** on the node's geometric boundary (Top/Bottom/Left/Right edge) and snap to that specific pixel, allowing for off-center connections.

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
