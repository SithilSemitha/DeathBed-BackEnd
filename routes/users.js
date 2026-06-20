var express = require('express');
var router = express.Router();
var supabaseAdmin = require('../config/supabaseAdmin');
var { requireAuth } = require('../middleware/auth');

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

router.get('/me', requireAuth, async function (req, res) {
  var { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

module.exports = router;