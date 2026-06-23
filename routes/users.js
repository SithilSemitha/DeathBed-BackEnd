var express = require('express');
var router = express.Router();
var supabaseAdmin = require('../config/supabaseAdmin');
var supabaseAuth = require('../config/supabaseAuth');
var { requireAuth } = require('../middleware/auth');

/* ---------- SIGN UP (email + password) ---------- */
router.post('/signup', async function (req, res) {
  var { email, password } = req.body;

  var { data, error } = await supabaseAuth.auth.signUp({ email, password });

  if (error) return res.status(400).json({ error: error.message });

  res.json({ user: data.user, session: data.session });
});

/* ---------- SIGN IN (email + password) ---------- */
router.post('/login', async function (req, res) {
  var { email, password } = req.body;

  var { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

  if (error) return res.status(400).json({ error: error.message });

  res.json({ user: data.user, session: data.session });
});

/* ---------- GOOGLE SIGN UP / LOGIN ---------- */
/* Same endpoint handles both - Supabase creates the account automatically
   on first Google login, or logs them in if it already exists. */
router.get('/google-login', async function (req, res) {
  var { data, error } = await supabaseAuth.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: process.env.FRONTEND_ORIGIN }
  });

  if (error) return res.status(400).json({ error: error.message });

  res.json({ url: data.url });
});

/* ---------- ACCOUNT CREATION & STORAGE ---------- */
/* Saves the extra signup fields (name, age, etc.) into our own `users` table,
   called by frontend right after /signup or after first Google login. */
router.post('/profile', async function (req, res) {
  var {
    userId,
    firstName,
    lastName,
    age,
    country,
    gender,
    dateOfBirth,
    phone,
    email
  } = req.body;

  var { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      age: age,
      country: country,
      gender: gender,
      date_of_birth: dateOfBirth,
      phone: phone,
      email: email
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

/* ---------- SESSION MANAGEMENT ---------- */
/* Protected route - proves the session token is valid and returns
   the logged-in user's stored profile. */
router.get('/me', requireAuth, async function (req, res) {
  var { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

/* Optional: explicit logout - tells Supabase to invalidate the session */
router.post('/logout', requireAuth, async function (req, res) {
  var { error } = await supabaseAdmin.auth.signOut();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;