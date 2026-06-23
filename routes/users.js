var express = require('express');
var router = express.Router();
var supabaseAdmin = require('../config/supabaseAdmin');
var supabaseAuth = require('../config/supabaseAuth');
var { requireAuth } = require('../middleware/auth');

router.post('/signup', async function (req, res) {
  var { email, password } = req.body;
  var { data, error } = await supabaseAuth.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data.user, session: data.session });
});

router.post('/login', async function (req, res) {
  var { email, password } = req.body;
  var { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data.user, session: data.session });
});

router.get('/google-login', async function (req, res) {
  var { data, error } = await supabaseAuth.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: process.env.FRONTEND_ORIGIN }
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ url: data.url });
});

router.post('/profile', async function (req, res) {
  var { userId, firstName, lastName, age, country, gender, dateOfBirth, phone, email } = req.body;

  console.log('---- /profile called ----');
  console.log('Payload received:', req.body);

  if (!userId) {
    console.log('ERROR: no userId in request body');
    return res.status(400).json({ error: 'userId is required' });
  }

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

  console.log('Supabase data:', data);
  console.log('Supabase error:', error);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

router.get('/me', requireAuth, async function (req, res) {
  var { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

router.post('/logout', requireAuth, async function (req, res) {
  var { error } = await supabaseAdmin.auth.signOut();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;