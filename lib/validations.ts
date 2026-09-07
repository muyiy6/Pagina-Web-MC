import { z } from 'zod';

export const registerSchema = z.object({
  displayName: z
    .string()
    .max(40, 'El nombre no puede exceder 40 caracteres')
    .optional()
    .or(z.literal('')),
  username: z
    .string()
    .min(3, '用户名至少 3 个字符')
    .max(20, '用户名不能超过 20 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  email: z.string().email('邮箱无效'),
  password: z.string().min(6, '密码至少 6 个字符'),
  confirmPassword: z.string(),
  referralCode: z.string().max(32).optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('邮箱无效'),
  password: z.string().min(1, '请输入密码'),
});

export const ticketSchema = z.object({
  subject: z.string().min(5, 'El asunto debe tener al menos 5 caracteres'),
  category: z.enum(['TECHNICAL', 'BILLING', 'BAN_APPEAL', 'REPORT', 'OTHER']),
  message: z.string().min(20, 'El mensaje debe tener al menos 20 caracteres'),
});

export const productSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().min(10, '描述至少 10 个字符'),
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  category: z.enum(['RANK', 'BUNDLES', 'CURRENCY', 'KEYS', 'SPECIAL']),
  features: z.array(z.string()),
  image: z.string().optional(),
  deliveryCommands: z.array(z.string()).optional().default([]),
  stock: z.number().optional(),
  isUnlimited: z.boolean(),
  isActive: z.boolean(),
});

export const blogPostSchema = z.object({
  title: z.string().min(5, '标题至少 5 个字符'),
  content: z.string().min(50, 'El contenido debe tener al menos 50 caracteres'),
  excerpt: z.string().min(10, 'El extracto debe tener al menos 10 caracteres').max(200, 'El extracto no puede exceder 200 caracteres'),
  image: z.string().optional(),
  tags: z.array(z.string()),
  isPublished: z.boolean(),
});
