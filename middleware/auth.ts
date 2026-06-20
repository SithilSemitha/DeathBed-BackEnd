import type { NextFunction, Request, Response } from 'express'
import supabaseAdmin from '../config/supabaseAdmin'

export async function requireAuth(
  req: Request & { user?: { id: string; email?: string | null } },
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    return res.status(401).json({ error: 'Missing access token' })
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? null,
  }

  next()
}