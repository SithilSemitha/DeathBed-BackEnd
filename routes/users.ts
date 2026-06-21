import express from 'express';
import supabaseAdmin from '../config/supabaseAdmin';
import supabaseAuth from '../config/supabaseAuth';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = express.Router();

router.post('/signup', async function (req, res) {
  const { email, password } = req.body;
  const { data, error } = await supabaseAuth.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data.user, session: data.session });
});

router.post('/login', async function (req, res) {
  const { email, password } = req.body;
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data.user, session: data.session });
});

router.get('/google-login', async function (req, res) {
  const { data, error } = await supabaseAuth.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: process.env.FRONTEND_ORIGIN }
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ url: data.url });
});

router.post('/profile', async function (req, res) {
  const { userId, firstName, lastName, age, country, gender, dateOfBirth, phone, email } = req.body;

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      age,
      country,
      gender,
      date_of_birth: dateOfBirth,
      phone,
      email
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

router.get('/me', requireAuth, async function (req: AuthedRequest, res) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

export default router;