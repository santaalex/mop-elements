'use client';

import { useEffect, useState, useTransition } from 'react';
import { useResourceStore } from '@/lib/store/resource-store';
import { MopDsl, ResourceRole, ResourceKpi } from '@/lib/schema/dsl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Save, Trash2, User, BarChart3, Database } from 'lucide-react';
import { saveProjectResources } from '@/actions/diagram-dsl';
import { toast } from 'sonner';
import { UnitSelect } from './UnitSelect';

interface ResourceManagerProps {
    projectId: string;
    initialResources?: MopDsl['resources'];
}

export function ResourceManager({ projectId, initialResources }: ResourceManagerProps) {
    const {
        roles, kpiDefinitions, dataSources,
        setResources, addRole, deleteRole, addKpiDefinition, updateKpiDefinition
    } = useResourceStore();

    // Hydrate store on mount
    useEffect(() => {
        if (initialResources) {
            setResources(initialResources);
        }
    }, [initialResources, setResources]);

    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        startTransition(async () => {
            const resources = {
                roles,
                kpi_definitions: kpiDefinitions,
                data_sources: dataSources,
            };

            const result = await saveProjectResources(projectId, resources);
            if (result.success) {
                toast.success('Resources saved successfully');
            } else {
                toast.error(result.error || 'Failed to save resources');
            }
        });
    };

    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Resource Management</h2>
                    <p className="text-slate-500 dark:text-slate-400">Centralized definition for Roles, KPIs, and Data Sources.</p>
                </div>
                <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                </Button>
            </div>

            <Tabs defaultValue="roles" className="w-full">
                <TabsList className="grid w-[400px] grid-cols-3">
                    <TabsTrigger value="roles">Roles ({roles.length})</TabsTrigger>
                    <TabsTrigger value="kpis">KPIs ({kpiDefinitions.length})</TabsTrigger>
                    <TabsTrigger value="data">Data Sources</TabsTrigger>
                </TabsList>

                {/* ROLES TAB */}
                <TabsContent value="roles" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Role Definitions</CardTitle>
                            <CardDescription>Roles define who performs activities in the process (e.g., Operator, Technician).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RoleList />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* KPIS TAB */}
                <TabsContent value="kpis" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>KPI Library</CardTitle>
                            <CardDescription>Standardized performance indicators reused across diagrams.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <KpiList />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DATA TAB */}
                <TabsContent value="data" className="space-y-4 mt-4">
                    <div className="text-center text-slate-500 py-12">
                        <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Data Source management coming soon.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function RoleList() {
    const { roles, addRole, updateRole, deleteRole } = useResourceStore();
    const [newName, setNewName] = useState('');

    const handleAdd = () => {
        if (!newName.trim()) return;
        const id = `role_${Date.now()}`;
        addRole({ id, name: newName });
        setNewName('');
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder="New role name..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <Button onClick={handleAdd} size="sm"><Plus className="w-4 h-4 mr-2" /> Add Role</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {roles.map(role => (
                    <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg bg-card text-card-foreground shadow-sm hover:border-indigo-500/50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                <User className="w-4 h-4" />
                            </div>
                            <span className="font-medium">{role.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500" onClick={() => deleteRole(role.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function KpiList() {
    const { kpiDefinitions, addKpiDefinition, updateKpiDefinition } = useResourceStore();
    const [newKpiName, setNewKpiName] = useState('');

    const handleAdd = () => {
        if (!newKpiName.trim()) return;
        const id = `kpi_${Date.now()}`;
        // Simple inference for unit
        let unit = '';
        if (newKpiName.includes('率') || newKpiName.includes('%')) unit = '%';
        if (newKpiName.includes('时') || newKpiName.includes('min')) unit = 'min';

        addKpiDefinition({ id, name: newKpiName, unit });
        setNewKpiName('');
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder="New KPI name (e.g. 合格率)..."
                    value={newKpiName}
                    onChange={e => setNewKpiName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <Button onClick={handleAdd} size="sm"><Plus className="w-4 h-4 mr-2" /> Add KPI</Button>
            </div>

            <div className="space-y-2">
                {kpiDefinitions.map(kpi => (
                    <div key={kpi.id} className="flex items-center gap-4 p-3 border rounded-lg bg-card text-card-foreground shadow-sm">
                        <div className="w-10 h-10 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-500 flex-shrink-0">
                            <BarChart3 className="w-5 h-5" />
                        </div>

                        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-4">
                                <Label className="text-xs text-slate-500">Name</Label>
                                <Input
                                    className="h-8"
                                    value={kpi.name}
                                    onChange={e => updateKpiDefinition(kpi.id, { name: e.target.value })}
                                />
                            </div>
                            <div className="col-span-4">
                                <Label className="text-xs text-slate-500">Unit</Label>
                                <UnitSelect
                                    value={kpi.unit}
                                    onChange={val => updateKpiDefinition(kpi.id, { unit: val })}
                                />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs text-slate-500">Warning</Label>
                                <Input
                                    className="h-8"
                                    type="number"
                                    placeholder="-"
                                    value={kpi.thresholds?.warning ?? ''}
                                    onChange={e => updateKpiDefinition(kpi.id, {
                                        thresholds: { ...kpi.thresholds, warning: Number(e.target.value) || undefined }
                                    })}
                                />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs text-slate-500">Critical</Label>
                                <Input
                                    className="h-8"
                                    type="number"
                                    placeholder="-"
                                    value={kpi.thresholds?.critical ?? ''}
                                    onChange={e => updateKpiDefinition(kpi.id, {
                                        thresholds: { ...kpi.thresholds, critical: Number(e.target.value) || undefined }
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                ))}
                {kpiDefinitions.length === 0 && (
                    <p className="text-center text-slate-400 py-8">No KPIs defined yet.</p>
                )}
            </div>
        </div>
    );
}
