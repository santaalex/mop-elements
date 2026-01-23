import { create } from 'zustand';
import { MopDsl, ResourceRole, ResourceKpi, ResourceDataSource } from '@/lib/schema/dsl';

interface ResourceState {
    roles: ResourceRole[];
    kpiDefinitions: ResourceKpi[];
    dataSources: ResourceDataSource[];

    // Actions
    setResources: (resources: MopDsl['resources']) => void;
    addRole: (role: ResourceRole) => void;
    updateRole: (id: string, role: Partial<ResourceRole>) => void;
    deleteRole: (id: string) => void;

    // KPI Helpers
    addKpiDefinition: (kpi: ResourceKpi) => void;
    updateKpiDefinition: (id: string, kpi: Partial<ResourceKpi>) => void;
    getKpiDefinitionById: (id: string) => ResourceKpi | undefined;

    // Helpers
    getRoleById: (id: string) => ResourceRole | undefined;
}

export const useResourceStore = create<ResourceState>((set, get) => ({
    roles: [],
    kpiDefinitions: [],
    dataSources: [],

    setResources: (resources) => {
        set({
            roles: resources.roles || [],
            kpiDefinitions: resources.kpi_definitions || [],
            dataSources: resources.data_sources || [],
        });
    },

    addRole: (role) => {
        set((state) => ({ roles: [...state.roles, role] }));
    },

    updateRole: (id, updatedRole) => {
        set((state) => ({
            roles: state.roles.map((r) => (r.id === id ? { ...r, ...updatedRole } : r)),
        }));
    },

    deleteRole: (id) => {
        set((state) => ({
            roles: state.roles.filter((r) => r.id !== id),
        }));
    },

    getRoleById: (id) => {
        return get().roles.find((r) => r.id === id);
    },

    addKpiDefinition: (kpi) => {
        set((state) => ({ kpiDefinitions: [...state.kpiDefinitions, kpi] }));
    },

    updateKpiDefinition: (id, updatedKpi) => {
        set((state) => ({
            kpiDefinitions: state.kpiDefinitions.map((k) => (k.id === id ? { ...k, ...updatedKpi } : k)),
        }));
    },

    getKpiDefinitionById: (id) => {
        return get().kpiDefinitions.find((k) => k.id === id);
    },
}));
