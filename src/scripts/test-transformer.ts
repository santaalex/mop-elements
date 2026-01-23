import { dslToReactFlow, reactFlowToDsl } from '../lib/engine/transformer';
import { MopDsl } from '../lib/schema/dsl';
import { Node, Edge } from 'reactflow';

// Mock Data
const mockDsl: MopDsl = {
    version: '1.0.0',
    meta: {
        project_id: 'proj-123',
        name: 'Test Project'
    },
    resources: {
        roles: [
            { id: 'role-1', name: 'Operator' }
        ],
        kpi_definitions: [],
        data_sources: []
    },
    l2_graphs: {
        'l2-1': {
            lanes: [
                { id: 'lane-1', role_ref: 'role-1', layout: { y: 0, h: 200 } }
            ],
            nodes: [
                {
                    id: 'node-1',
                    type: 'activity',
                    name: 'Task 1',
                    lane_id: 'lane-1', // Should be inferred back if missing in RF-to-DSL
                    layout: { x: 100, y: 50, w: 100, h: 80 }
                }
            ],
            edges: [
                { id: 'e1', source: 'node-1', target: 'node-2' }
            ]
        }
    }
};

async function runTests() {
    console.log('--- Starting Transformer Tests ---\n');

    // Test 1: DSL -> ReactFlow
    console.log('Test 1: DSL -> ReactFlow');
    const l2Graph = mockDsl.l2_graphs['l2-1'];
    const { nodes, edges } = dslToReactFlow(l2Graph, mockDsl.resources);

    const laneNode = nodes.find(n => n.id === 'lane-1');
    const activityNode = nodes.find(n => n.id === 'node-1');

    if (nodes.length === 2 && edges.length === 1 && laneNode && activityNode) {
        console.log('✅ Nodes & Edges count match');

        if (laneNode.type === 'lane' && laneNode.data.label === 'Operator') {
            console.log('✅ Lane role resolution passed');
        } else {
            console.error('❌ Lane role resolution failed', laneNode);
        }

        if (activityNode.position.x === 100 && activityNode.position.y === 50) {
            console.log('✅ Layout coordinates passed');
        } else {
            console.error('❌ Layout coordinates failed', activityNode.position);
        }
    } else {
        console.error('❌ Structure check failed', { nodes, edges });
    }
    console.log('\n');

    // Test 2: ReactFlow -> DSL
    console.log('Test 2: ReactFlow -> DSL');

    // Simulate ReactFlow state (slightly modified to test inference)
    const rfNodes: Node[] = [
        {
            id: 'lane-1',
            type: 'lane',
            position: { x: 0, y: 0 },
            data: { label: 'Operator', roleId: 'role-1' },
            style: { width: 1000, height: 200 }
        },
        {
            id: 'node-1',
            type: 'activity',
            position: { x: 100, y: 50 },
            width: 100,
            height: 80,
            data: { label: 'Task 1' }
        }
    ];
    const rfEdges: Edge[] = [
        { id: 'e1', source: 'node-1', target: 'node-2' } // Target existing but node missing in list is fine for logic check
    ];

    const generatedDsl = reactFlowToDsl(rfNodes as any, rfEdges as any);

    if (generatedDsl.lanes.length === 1 && generatedDsl.nodes.length === 1) {
        console.log('✅ DSL reconstruction count match');

        const dslNode = generatedDsl.nodes[0];
        if (dslNode.lane_id === 'lane-1') {
            console.log('✅ Activity Lane ID inference passed');
        } else {
            console.error('❌ Activity Lane ID inference failed', dslNode.lane_id);
        }
    } else {
        console.error('❌ DSL reconstruction failed', generatedDsl);
    }

    console.log('\n--- Tests Completed ---');
}

runTests().catch(console.error);
