import React from 'react';
import { getDiagram, getL2Diagram } from '@/actions/diagram';
import { MoPRenderer } from '@/components/monitor/MoPRenderer';
import { createDefaultDsl, reactFlowToDsl } from '@/lib/engine/transformer';
import { notFound } from 'next/navigation';

interface MonitorPageProps {
    params: {
        id: string;
    };
    searchParams: {
        diagramId?: string;
    };
}

export default async function MonitorPage({ params, searchParams }: MonitorPageProps) {
    const { id: projectId } = params;
    let result;

    // Fetch Data (Legacy Way)
    if (searchParams.diagramId) {
        result = await getL2Diagram(searchParams.diagramId);
    } else {
        result = await getDiagram(projectId, { includeRealtimeStats: true });
    }

    const { success, data } = result;

    if (!success || !data) {
        // Simple error handling for now
        return (
            <div className="flex h-full items-center justify-center text-slate-500">
                Failed to load diagram data.
            </div>
        );
    }

    // --- ADAPTER LAYER (Legacy/DSL -> New DSL) ---
    // 1. Create a skeleton DSL
    const dsl = createDefaultDsl(projectId);

    // 2. Convert or Use Existing DSL
    const graphKey = searchParams.diagramId || 'main_view';
    const rawData = data as any;
    let l2Graph;

    // DETECT FORMAT
    if (rawData.lanes && Array.isArray(rawData.lanes)) {
        // Already DSL
        l2Graph = rawData;
    } else {
        // Legacy Format -> Convert
        l2Graph = reactFlowToDsl(data.nodes || [], data.edges || []);
    }

    // 3. Inject into DSL
    dsl.l2_graphs[graphKey] = l2Graph;

    // 4. (Optional) Populate Resources if we had them in separate DB tables
    // For now, resources are empty or inferred.
    // ---------------------------------------------

    return (
        <div className="h-[calc(100vh-4rem)] w-full bg-slate-950 text-slate-100 overflow-hidden flex flex-col">
            <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-indigo-500 rounded-sm shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                    <h1 className="text-xl font-bold tracking-tight text-white">
                        <span className="text-slate-400 font-normal">Command Center / </span>
                        Project {projectId.substring(0, 8)}...
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-medium text-emerald-400">LIVE SYSTEM</span>
                        <span className="text-[10px] text-slate-500 border border-slate-700 px-1 rounded ml-2">v4.2 (Engine)</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 relative">
                {/* Render with the new MoP Engine */}
                <MoPRenderer dsl={dsl} />
            </main>
        </div>
    );
}
