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

/* ---------- SCRUM-105: Provide Financial Comparison Data ---------- */
router.get('/financial-comparison', requireAuth, async function (req, res) {
  var { category } = req.query;

  if (!category) {
    return res.status(400).json({ error: 'category is required' });
  }

  var { data, error } = await supabaseAdmin
    .from('decisions')
    .select('choice, analysis')
    .eq('category', category);

  if (error) return res.status(500).json({ error: error.message });

  var totals = { A: { sum: 0, count: 0 }, B: { sum: 0, count: 0 } };

  data.forEach(function (row) {
    var choice = row.choice;
    var financial = row.analysis && row.analysis.financial_outcome;

    if ((choice === 'A' || choice === 'B') && typeof financial === 'number') {
      totals[choice].sum += financial;
      totals[choice].count += 1;
    }
  });

  res.json({
    comparison: {
      choiceA: totals.A.count > 0 ? totals.A.sum / totals.A.count : null,
      choiceB: totals.B.count > 0 ? totals.B.sum / totals.B.count : null,
      sampleSizeA: totals.A.count,
      sampleSizeB: totals.B.count,
      category: category
    }
  });
});

module.exports = router;