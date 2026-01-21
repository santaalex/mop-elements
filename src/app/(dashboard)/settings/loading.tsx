export default function Loading() {
    return (
        <div className="max-w-2xl mx-auto py-8">
            <div className="animate-pulse space-y-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                <div className="bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 rounded-xl p-6 h-48"></div>
                <div className="bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 rounded-xl p-6 h-64"></div>
            </div>
        </div>
    );
}
