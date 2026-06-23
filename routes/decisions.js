var express = require('express');
var router = express.Router();
var supabaseAdmin = require('../config/supabaseAdmin');
var { requireAuth } = require('../middleware/auth');

/* Create a new decision */
router.post('/', requireAuth, async function (req, res) {
  var { title, category, decisionText, analysis } = req.body;

  var { data, error } = await supabaseAdmin
    .from('decisions')
    .insert({
      user_id: req.user.id,
      title: title,
      category: category,
      decision_text: decisionText,
      analysis: analysis
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ decision: data });
});

/* Fetch all of the logged-in user's decisions, with optional filtering */
router.get('/', requireAuth, async function (req, res) {
  var { category, from } = req.query;

  var query = supabaseAdmin
    .from('decisions')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);
  if (from) query = query.gte('created_at', from);

  var { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json({ decisions: data });
});

module.exports = router;