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

/* ---------- FORGOT PASSWORD: send reset email ---------- */
/* Supabase auto-generates a secure token and emails it to the user */
router.post('/forgot-password', async function (req, res) {
  var { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  var { data, error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
    redirectTo: process.env.FRONTEND_ORIGIN + '/reset-password'
  });

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: 'Password reset email sent', data });
});

/* ---------- RESET PASSWORD: update with new password ---------- */
/* The frontend reset-password page extracts the access_token from the
   reset email link's URL, then sends it here along with the new password */
router.post('/reset-password', async function (req, res) {
  var { accessToken, newPassword } = req.body;

  if (!accessToken || !newPassword) {
    return res.status(400).json({ error: 'accessToken and newPassword are required' });
  }

  // Step 1: verify the token belongs to a real, valid session
  var { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return res.status(401).json({ error: 'Invalid or expired reset token' });
  }

  // Step 2: update the password using the admin client
  var { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userData.user.id,
    { password: newPassword }
  );

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'Password updated successfully', user: data.user });
});

/* ---------- DEMOGRAPHIC FILTER ON MATCHED PROFILES (SCRUM-99) ---------- */
router.get('/matches', requireAuth, async function (req, res) {
  var { category, minAge, maxAge, country, incomeBracket } = req.query;

  if (!category) {
    return res.status(400).json({ error: 'category is required to find matches' });
  }

  var { data: decisionRows, error: decisionError } = await supabaseAdmin
    .from('decisions')
    .select('user_id')
    .eq('category', category)
    .neq('user_id', req.user.id);

  if (decisionError) return res.status(500).json({ error: decisionError.message });

  var matchedUserIds = [...new Set(decisionRows.map(function (row) { return row.user_id; }))];

  if (matchedUserIds.length === 0) {
    return res.json({ matches: [] });
  }

  var query = supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, age, country, income_bracket')
    .in('id', matchedUserIds);

  if (minAge) query = query.gte('age', minAge);
  if (maxAge) query = query.lte('age', maxAge);
  if (country) query = query.eq('country', country);
  if (incomeBracket) query = query.eq('income_bracket', incomeBracket);

  var { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json({ matches: data });
});

module.exports = router;