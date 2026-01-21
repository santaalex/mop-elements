'use client';

import { Upload, Loader2 } from 'lucide-react';
import { importProject } from '@/actions/backup';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectImporter({ userId }: { userId: string }) {
    const [isImporting, setIsImporting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm(`确定要从文件 "${file.name}" 导入新的项目吗？`)) {
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        setIsImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.project || !data.l2Diagrams) {
                throw new Error('无效的项目备份文件格式');
            }

            const res = await importProject(userId, data);
            if (res.success) {
                alert('项目导入成功！');
                router.refresh();
            } else {
                alert('导入失败: ' + (res.error || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            alert('导入出错: 文件格式不正确或损坏');
        } finally {
            setIsImporting(false);
            if (inputRef.current) inputRef.current.value = ''; // Reset
        }
    };

    return (
        <>
            <input
                type="file"
                ref={inputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
            />
            <button
                onClick={() => inputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
            >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>导入项目</span>
            </button>
        </>
    );
}
