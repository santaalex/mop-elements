-- CreateTable
CREATE TABLE "ProcessKPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "mingdaoFieldId" TEXT,
    "nodeId" TEXT NOT NULL,
    "diagramId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProcessKPI_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepName" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "taskDesc" TEXT NOT NULL,
    "piName" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "mingdaoFieldId" TEXT,
    "nodeId" TEXT NOT NULL,
    "diagramId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskPI_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentNodeId" TEXT,
    "enterNodeTime" DATETIME,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProcessInstance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instanceId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" TEXT,
    "operator" TEXT,
    "timestamp" DATETIME NOT NULL,
    "duration" INTEGER,
    CONSTRAINT "ProcessLog_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ProcessInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NodeRealtimeStats" (
    "nodeId" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "activeCount" INTEGER NOT NULL,
    "avgWaitTime" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL
);
