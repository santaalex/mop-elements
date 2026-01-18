'use client'

import { useFormState } from 'react-dom' // Changed from useActionState to useFormState for React 18
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createProject } from '@/actions/project'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'

// Keep the initial state structure consistent
const initialState = {
    error: '',
}

export default function CreateProjectPage() {
    const [state, formAction] = useFormState(createProject, initialState)
    const { pending } = useFormStatus() // We need a wrapper component or use useFormStatus hook properly? 
    // Wait, useFormStatus must be used inside a component rendered inside the form.
    // Let's create a SubmitButton component for cleaner code.

    return (
        <div className="max-w-2xl mx-auto py-12">
            <div className="mb-8">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    返回工作台
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            创建新项目
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 ml-11">
                        为您的业务流程图创建一个新的工作空间。
                    </p>
                </div>

                <form action={formAction} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-slate-900 dark:text-white">
                            项目名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            placeholder="例如：2024 年度销售流程优化"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium text-slate-900 dark:text-white">
                            项目描述 <span className="text-slate-400 font-normal">(可选)</span>
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            rows={4}
                            placeholder="简要描述该项目的目标、范围或背景..."
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                        />
                    </div>

                    {state?.error && (
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                            {state.error}
                        </div>
                    )}

                    <div className="pt-4 flex items-center justify-end gap-3">
                        <Link
                            href="/dashboard"
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            取消
                        </Link>
                        <SubmitButton />
                    </div>
                </form>
            </div>
        </div>
    )
}

import { useFormStatus } from 'react-dom'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
            {pending ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    创建中...
                </>
            ) : (
                <>
                    立即创建
                </>
            )}
        </button>
    )
}
