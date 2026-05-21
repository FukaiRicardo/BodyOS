import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string }
  supabase?: any
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.split(' ')[1]

  // Cria client com o token do usuário — RLS é aplicado automaticamente
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user     = { id: user.id, email: user.email!, role: user.role ?? 'authenticated' }
  req.supabase = supabase
  next()
}

export const requirePremium = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.supabase || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: profile } = await req.supabase
    .from('user_profiles')
    .select('subscription, subscription_expires_at')
    .eq('id', req.user.id)
    .single()

  const isPremium =
    (profile as any)?.subscription === 'premium' &&
    (profile as any)?.subscription_expires_at != null &&
    new Date((profile as any).subscription_expires_at) > new Date()

  if (!isPremium) {
    return res.status(403).json({ error: 'Premium subscription required' })
  }

  next()
}