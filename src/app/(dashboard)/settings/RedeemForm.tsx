'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { redeemKey } from '@/actions/subscription';
import { Zap } from 'lucide-react';

export default function RedeemForm() {
    const { pending } = useFormStatus();
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    async function clientAction(formData: FormData) {
        const res = await redeemKey(null, formData);
        setMessage(res.message);
        setIsSuccess(res.success);
        if (res.success) {
            // Reload to update the server component data
            window.location.reload();
        }
    }

    return (
        <form action={clientAction} className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                激活码 / 兑换码
            </label>
            <div className="flex gap-2">
                <input
                    name="key"
                    type="text"
                    placeholder="请输入 MOP-XXXX-..."
                    className="flex-1 rounded-lg border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                    required
                />
                <button
                    type="submit"
                    disabled={pending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {pending ? '兑换中...' : <><Zap className="w-4 h-4" /> 立即激活</>}
                </button>
            </div>
            {message && (
                <p className={`mt-2 text-sm ${isSuccess ? 'text-green-600' : 'text-red-500'}`}>
                    {message}
                </p>
            )}
        </form>
    );
}
