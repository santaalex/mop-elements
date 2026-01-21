# Design Proposal v2: The Activity "Diagnostic Matrix" (活动诊断矩阵)

## 1. Revised Core Concept: "Drill Down to Root Cause"
*   **Correction**: 1 Activity ≠ 1 Line.
*   **Reality**: **1 Activity = A Sequence of Sub-activities (Steps)**.
*   **User Story**: A manager sees "B04 Installation" flashing **RED** on the main map. They click it to answer: *"Which specific step went wrong? Was it the Technician's Drilling or the Assistant's Cleaning?"*

## 2. Interaction Design
*   **Trigger**: Click on L2 Activity Node.
*   **Container**: Large, Wide Modal (80-90% width).
*   **Content**: A structured **Data Table (The Matrix)** exactly matching your Excel mental model.

## 3. The Matrix Layout (Inside the Modal)

**Title**: `B04 精准安装 - 责任绩效到岗表`

| 步骤 (Sub-activity) | 岗位 A: 厨电安装技师 (Technician) | | | 岗位 B: 厨电安装助理 (Assistant) | | |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| | **SOP / Task** | **Standard / Quality** | **KPI (Actual/Target)** | **SOP / Task** | **Standard** | **KPI** |
| **1. 安装预检 (Prep)** | Check Flue... | Diameter >180mm | 🟢 **Error Rate: 0** <br> (Target: 0) | Check Model... | Package Intact | 🟢 **Missing: 0** |
| **2. 定位划线 (Marking)** | Laser Leveling... | Vertical Dev <1% | 🟢 **Precision: 100%** | (Assist) | - | - |
| **3. 钻孔固定 (Drilling)** | - | - | - | Drill Holes... | Depth 3-5mm | 🔴 **Success Rate: 85%** <br> (Target: 90%) ⚠️ |

### 4. Key Features
1.  **Red Flag Highlighting**: If a specific PI (e.g., Drilling Success Rate) misses the target, that specific **Cell** turns Red.
2.  **Contextual SOP**: The "SOP" column isn't just text; it can be clicked to view the detailed PDF/Image for that specific step if needed (or just show key bullets).
3.  **Live Data**: The "Actual" values are pulled from the backend (Mingdao Yun).
4.  **Responsibility Clarity**: The columns clearly separate *who* is doing *what*.

## 5. Implementation Strategy
*   **Data Structure**: We need to allow defining "Sub-activities" for each L2 Node.
*   **Config**: In "Edit Mode", this table is editable (add rows, define PIs).
*   **View Mode**: This table is Read-Only, showing Real-time data.

## 6. Visual Mockup
The Modal is essentially a **"Mini-Dashboard"** for that specific Activity.

```
+-----------------------------------------------------------------------------------+
|  [ACTIVITY] B04 精准安装 (Precision Install)               [Status: WARNING ⚠️]  [X] |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +---------------------------+---------------------------+---------------------+  |
|  | Sub-activity              | Technician (技师)          | Assistant (助理)    |  |
|  +===========================+===========================+=====================+  |
|  | 1. Prep (预检)             | [Task] Check Flue         | [Task] Check Model  |  |
|  |                           | [KPI]  Err: 0/0  [OK]     | [KPI]  Miss: 0 [OK] |  |
|  +---------------------------+---------------------------+---------------------+  |
|  | 2. Drilling (钻孔)         |                           | [Task] Drill Holes  |  |
|  |                           |                           | [KPI]  Rate: 85% ⚠️ |  | <--- Root Cause!
|  +---------------------------+---------------------------+---------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
