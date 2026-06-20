import express, { type Request, type Response } from 'express'
import supabaseAdmin from '../config/supabaseAdmin'
import { requireAuth } from '../middleware/auth'

const router = express.Router()

type ProfileRequestBody = {
  firstName?: string
  ageYears?: number | string
  country?: string
  incomeBracket?: string
  relationshipStatus?: string
}

type ProfileErrors = Partial<
  Record<
    'firstName' | 'ageYears' | 'country' | 'incomeBracket' | 'relationshipStatus',
    string
  >
>

type AuthedRequest = Request & {
  user?: {
    id: string
    email?: string | null
  }
}

function validateProfileInput(body: ProfileRequestBody): ProfileErrors {
  const errors: ProfileErrors = {}

  if (!body.firstName || !body.firstName.trim()) {
    errors.firstName = 'Please complete this field'
  }

  if (
    body.ageYears === undefined ||
    body.ageYears === null ||
    body.ageYears === ''
  ) {
    errors.ageYears = 'Please complete this field'
  } else {
    const ageNumber = Number(body.ageYears)

    if (!Number.isFinite(ageNumber) || ageNumber < 13 || ageNumber > 120) {
      errors.ageYears = 'Please enter a valid age between 13 and 120'
    }
  }

  if (!body.country || !body.country.trim()) {
    errors.country = 'Please complete this field'
  }

  if (!body.incomeBracket || !body.incomeBracket.trim()) {
    errors.incomeBracket = 'Please complete this field'
  }

  if (!body.relationshipStatus || !body.relationshipStatus.trim()) {
    errors.relationshipStatus = 'Please complete this field'
  }

  return errors
}

function formatProfileRow(row: {
  id: string
  user_id: string
  first_name: string
  age_years: number
  country: string
  income_bracket: string
  relationship_status: string
  created_at: string
  updated_at: string
}) {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    ageYears: row.age_years,
    country: row.country,
    incomeBracket: row.income_bracket,
    relationshipStatus: row.relationship_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

router.post(
  '/profile',
  requireAuth,
  async function (req: AuthedRequest, res: Response) {
    try {
      const errors = validateProfileInput(req.body)

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors })
      }

      if (!req.user?.id) {
        return res.status(401).json({ error: 'Invalid or expired session' })
      }

      const payload = {
        user_id: req.user.id,
        first_name: req.body.firstName!.trim(),
        age_years: Number(req.body.ageYears),
        country: req.body.country!,
        income_bracket: req.body.incomeBracket!,
        relationship_status: req.body.relationshipStatus!,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ profile: formatProfileRow(data) })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to save profile data' })
    }
  },
)

router.get('/me', requireAuth, async function (req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ profile: formatProfileRow(data) })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch profile data' })
  }
})

export default router