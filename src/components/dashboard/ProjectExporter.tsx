'use client';

import { Download } from 'lucide-react';
import { exportProject } from '@/actions/backup';
import { useState } from 'react';

export default function ProjectExporter({ projectId, projectName }: { projectId: string; projectName: string }) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent entering project

        if (!confirm('确定要导出此项目数据吗？')) return;

        setIsExporting(true);
        try {
            const res = await exportProject(projectId);
            if (res.success && res.data) {
                // Create Blob and Download
                const jsonString = JSON.stringify(res.data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = `${projectName}_backup_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                console.error('Export Error Result:', res);
                alert('导出失败: ' + (res.error || 'Server returned failure without message'));
            }
        } catch (err: any) {
            console.error('Export Exception:', err);
            alert('导出发生严重错误: ' + (err?.message || 'Unknown error'));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
            title="导出项目备份 (JSON)"
        >
            <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
        </button>
    );
}
