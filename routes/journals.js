var express = require('express');
var router = express.Router();
var supabaseAdmin = require('../config/supabaseAdmin');
var { requireAuth } = require('../middleware/auth');

/* Create a journal entry, linked to a decision */
router.post('/', requireAuth, async function (req, res) {
  var { decisionId, content } = req.body;

  var { data, error } = await supabaseAdmin
    .from('journals')
    .insert({
      user_id: req.user.id,
      decision_id: decisionId,
      content: content
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ journal: data });
});

/* Fetch all journals for the logged-in user */
router.get('/', requireAuth, async function (req, res) {
  var { data, error } = await supabaseAdmin
    .from('journals')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ journals: data });
});

module.exports = router;