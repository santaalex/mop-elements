import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ExportButtonProps {
    targetId: string; // The ID of the DOM element to export
    fileName?: string;
    onStart?: () => void;
    onEnd?: () => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
    targetId,
    fileName = 'export',
    onStart,
    onEnd
}) => {
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleExport = async (type: 'png' | 'jpeg' | 'pdf') => {
        setIsOpen(false); // Close dropdown immediately
        const element = document.getElementById(targetId);
        if (!element) return;

        setLoading(true);
        if (onStart) onStart();

        try {
            // Filter out non-printable elements if needed
            const filter = (node: HTMLElement) => {
                const exclusionClasses = ['no-print', 'export-exclude'];
                return !exclusionClasses.some(classname => node.classList?.contains(classname));
            };

            const options = { quality: 0.95, backgroundColor: '#ffffff', filter };

            let dataUrl = '';

            if (type === 'png') {
                dataUrl = await htmlToImage.toPng(element, options);
            } else if (type === 'jpeg') {
                dataUrl = await htmlToImage.toJpeg(element, options);
            } else if (type === 'pdf') {
                dataUrl = await htmlToImage.toPng(element, options);

                const pdf = new jsPDF({
                    orientation: element.offsetWidth > element.offsetHeight ? 'l' : 'p',
                    unit: 'px',
                    format: [element.offsetWidth, element.offsetHeight]
                });

                pdf.addImage(dataUrl, 'PNG', 0, 0, element.offsetWidth, element.offsetHeight);
                pdf.save(`${fileName}.pdf`);
                setLoading(false);
                if (onEnd) onEnd();
                return;
            }

            // Download image
            const link = document.createElement('a');
            link.download = `${fileName}.${type}`;
            link.href = dataUrl;
            link.click();

        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setLoading(false);
            if (onEnd) onEnd();
        }
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !loading && setIsOpen(!isOpen)}
                disabled={loading}
                className={`inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-slate-200 dark:hover:bg-zinc-900 ${loading ? 'cursor-not-allowed' : ''}`}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                导出
                <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-950 dark:ring-zinc-800">
                    <div className="py-1">
                        <button
                            onClick={() => handleExport('png')}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-800"
                        >
                            导出为 PNG 图片
                        </button>
                        <button
                            onClick={() => handleExport('jpeg')}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-800"
                        >
                            导出为 JPG 图片
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-800"
                        >
                            导出为 PDF 文档
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
