import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function EditorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    // Editor layout: distinctive background, minimal padding, full height
    return (
        <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-zinc-950 overflow-hidden">
            {children}
        </div>
    );
}
