// src/lib/validation.ts — Zod schemas + FORM-SEC-01 (API-VALIDATION-01, DATA-VALIDATION-01)
// Adapted from src/services/requestSchemas.ts

import { z } from 'zod';

function containsDangerous(input: string): boolean {
  // FORM-SEC-01
  if (/<\s*(script|iframe|object|embed|link|meta|style)\b/i.test(input)) return true;
  if (/on\w+\s*=/i.test(input)) return true;
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input)) return true;
  if (/\.\.\//.test(input) || /\.\.\\/.test(input)) return true;
  if (/(javascript|data|vbscript|file|blob)\s*:/i.test(input)) return true;
  return false;
}

const safeString = (max: number) =>
  z
    .string()
    .max(max)
    .refine((val) => !containsDangerous(val), { message: 'Contenido no permitido' });

export const loginSchema = z
  .object({
    email: z.string().email().max(255).toLowerCase().trim().refine((v) => !containsDangerous(v), { message: 'Contenido no permitido' }),
    password: z.string().max(128).refine((v) => !containsDangerous(v), { message: 'Contenido no permitido' }),
  })
  .strict();

export const signupSchema = z
  .object({
    name: safeString(100),
    email: z.string().email().max(255).toLowerCase().trim().refine((v) => !containsDangerous(v), { message: 'Contenido no permitido' }),
    password: z.string().min(8).max(128).refine((v) => !containsDangerous(v), { message: 'Contenido no permitido' }),
    terms: z.boolean().refine((v) => v === true, { message: 'Debes aceptar términos' }),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().email().max(255).toLowerCase().trim(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const createCollectionSchema = z
  .object({
    name: safeString(100),
    description: safeString(500).optional(),
    visibility: z.enum(['everyone', 'members', 'admins']).default('everyone'),
  })
  .strict();

export const updateCollectionSchema = z
  .object({
    name: safeString(100).optional(),
    description: safeString(500).optional(),
    visibility: z.enum(['everyone', 'members', 'admins']).optional(),
  })
  .strict();

export const createFileSchema = z
  .object({
    title: safeString(200),
    content: safeString(1000000),
    collectionId: z.string().uuid(),
    filename: safeString(255),
  })
  .strict();

export const askQuestionSchema = z
  .object({
    question: safeString(1000),
    collectionIds: z.array(z.string().uuid()).max(10).optional(),
    workspaceSlug: safeString(50).optional(),
    embedId: z.string().max(100).optional(),
    userId: safeString(100).optional(),
    role: safeString(50).optional(),
    currentUrl: z.string().max(500).optional(),
  })
  .strict();

export const feedbackSchema = z
  .object({
    messageId: z.string().uuid(),
    helpful: z.boolean(),
    comment: safeString(500).optional(),
  })
  .strict();
