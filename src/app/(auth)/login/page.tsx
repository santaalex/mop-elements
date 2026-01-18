'use client'

import { useFormState } from 'react-dom'
import { useFormStatus } from 'react-dom'
import { login } from '@/actions/auth'
import Link from 'next/link'

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
            {pending ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
                '登录'
            )}
        </button>
    )
}

const initialState = {
    error: '',
}

export default function LoginPage() {
    const [state, formAction] = useFormState(login, initialState)

    return (
        <div className="w-full max-w-md mx-auto space-y-8">
            <div className="text-center">
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
                    登录您的账户
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    或者{' '}
                    <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                        开始免费试用
                    </Link>
                </p>
            </div>

            <form action={formAction} className="mt-8 space-y-6 bg-white dark:bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            邮箱
                        </label>
                        <div className="mt-1">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="admin@mingdao.com"
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-zinc-800 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            密码
                        </label>
                        <div className="mt-1">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                placeholder="••••••••"
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-zinc-800 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {state?.error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                    登录失败
                                </h3>
                                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                    {state.error}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <SubmitButton />
                </div>
            </form>
        </div>
    )
}
