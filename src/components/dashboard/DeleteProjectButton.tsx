'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteProject } from '@/actions/project';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

export default function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowModal(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await deleteProject(projectId);
            if (res.error) {
                alert(res.error);
                setIsDeleting(false); // Only reset if error, otherwise waiting for refresh
            } else {
                setShowModal(false);
                router.refresh();
            }
        } catch (error) {
            alert('删除出错');
            setIsDeleting(false);
        }
    };

    return (
        <>
            <button
                onClick={handleClick}
                disabled={isDeleting}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-20 relative"
                title="删除项目"
            >
                {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Trash2 className="w-4 h-4" />
                )}
            </button>

            <ConfirmationModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={handleConfirmDelete}
                title="删除项目"
                description={`确定要删除项目 "${projectName}" 吗？此操作将永久删除该项目及其所有流程图数据，且不可恢复。`}
                confirmText="确认删除"
                confirmTextClass="bg-red-600 hover:bg-red-700" // Optional if supported
                isLoading={isDeleting}
            />
        </>
    );
}
