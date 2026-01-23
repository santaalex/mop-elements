'use server'

import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { createProjectSchema, updateProjectSchema } from '@/lib/validations/project'

export async function createProject(prevState: any, formData: FormData) {
    console.log('--- createProject action started ---')
    const session = await getSession()
    if (!session || !session.user) {
        console.log('Auth check failed')
        return { error: '未授权访问，请先登录' }
    }

    const rawData = {
        name: formData.get('name'),
        description: formData.get('description'),
    }

    const validation = createProjectSchema.safeParse(rawData);

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors.name?.[0] || '输入无效' };
    }

    const { name, description } = validation.data;

    let projectId
    try {
        console.log('Attempting to create project in DB...')
        const project = await prisma.project.create({
            data: {
                name: name,
                description: description || '',
                userId: session.user.id,
                data: '{}', // Initialize with empty JSON string
            },
        })
        console.log('Project created successfully:', project.id)
        projectId = project.id
    } catch (error: any) {
        console.error('Failed to create project:', error)
        return { error: `创建失败: ${error.message || String(error)}` }
    }

    console.log('Redirecting to:', `/project/${projectId}`)
    revalidatePath('/dashboard')
    redirect(`/project/${projectId}`)
}

export async function deleteProject(projectId: string) {
    const session = await getSession()
    if (!session || !session.user) {
        return { error: '未授权访问' }
    }

    try {
        await prisma.project.delete({
            where: {
                id: projectId,
                userId: session.user.id // Ensure ownership
            }
        })
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to delete project:', error)
        return { error: '删除失败' }
    }
}

export async function updateProject(projectId: string, formData: FormData) {
    const session = await getSession()
    if (!session || !session.user) {
        return { error: '未授权访问' }
    }

    const rawData = {
        name: formData.get('name'),
        description: formData.get('description'),
    }

    const validation = updateProjectSchema.safeParse(rawData);

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors.name?.[0] || '输入无效' }
    }

    const { name, description } = validation.data;

    try {
        await prisma.project.update({
            where: {
                id: projectId,
                userId: session.user.id // Ensure ownership
            },
            data: {
                name,
                description: description || ''
            }
        })
        revalidatePath('/dashboard')
        revalidatePath(`/project/${projectId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Failed to update project:', error)
        return { error: '更新失败' }
    }
}
