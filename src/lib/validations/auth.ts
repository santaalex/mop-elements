import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(1, '请输入密码'),
});

export const registerSchema = z.object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码长度至少为6位'),
    name: z.string().min(2, '用户名至少2个字符'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
