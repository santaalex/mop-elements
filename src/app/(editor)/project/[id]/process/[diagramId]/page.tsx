'use client';

import SwimlaneEditor from '@/components/diagram_l2/SwimlaneEditor';

export default function L2EditorPage({ params }: { params: { id: string; diagramId: string } }) {
    return (
        <div className="w-full h-screen">
            <SwimlaneEditor
                projectId={params.id}
                diagramId={params.diagramId}
            />
        </div>
    );
}
