import { z } from 'zod';

export const createProjectSchema = z.object({
    name: z.string().min(1, '项目名称不能为空').max(50, '名称过长'),
    description: z.string().max(200, '描述过长').optional(),
});

export const updateProjectSchema = z.object({
    name: z.string().min(1, '项目名称不能为空').max(50, '名称过长'),
    description: z.string().max(200, '描述过长').optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
