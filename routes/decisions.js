var express = require('express');
var router = express.Router();
var supabaseAdmin = require('../config/supabaseAdmin');
var { requireAuth } = require('../middleware/auth');

// Use global fetch (Node 18+) or require node-fetch if older
var fetch = global.fetch || require('node-fetch');

// ML SERVICE CONFIG

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS || '5000', 10);

// HELPER: Call ML classifier

async function callMLClassifier(decisionText) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

  try {
    const response = await fetch(`${ML_SERVICE_URL}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: decisionText }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.detail || `ML service error (${response.status})`);
    }

    const result = await response.json();
    return result; // { category, subCategory, confidence, summary, requiresOverride }
  } catch (error) {
    clearTimeout(timeout);
    console.error('ML service call failed:', error.message);
    throw error;
  }
}

// ============================================================
// ROUTES
// ============================================================

/* ---------- CLASSIFY a decision (US-004, US-026) ---------- */
router.post('/classify', requireAuth, async function (req, res) {
  const { decisionText } = req.body;

  if (!decisionText || decisionText.trim().length < 20) {
    return res.status(400).json({
      error: 'Please describe your decision in more detail (at least 20 characters)'
    });
  }

  try {
    const result = await callMLClassifier(decisionText);
    res.json(result);
  } catch (error) {
    res.status(503).json({ error: 'ML service unavailable' });
  }
});

/* ---------- CREATE a new decision ---------- */
router.post('/', requireAuth, async function (req, res) {
  const {
    title,
    category,
    subCategory,          // optional, from ML
    decisionText,
    analysis,
    choice,               // optional
    classificationConfidence, // optional
    userOverrodeClassification // optional boolean
  } = req.body;

  // Build the analysis object (preserve existing fields, add ML meta if provided)
  const analysisObj = analysis || {};
  if (classificationConfidence !== undefined) {
    analysisObj.classification_confidence = classificationConfidence;
  }
  if (subCategory) {
    analysisObj.sub_category = subCategory;
  }
  if (userOverrodeClassification !== undefined) {
    analysisObj.user_overrode_classification = userOverrodeClassification;
  }

  const { data, error } = await supabaseAdmin
    .from('decisions')
    .insert({
      user_id: req.user.id,
      title: title,
      category: category,
      decision_text: decisionText,
      choice: choice || null,
      analysis: analysisObj
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ decision: data });
});

/* ---------- Fetch all decisions ---------- */
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

/* ---------- SCRUM-105: Financial Comparison ---------- */
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

/* ---------- SCRUM-130: Regret Rating ---------- */
router.patch('/:id/regret-rating', requireAuth, async function (req, res) {
  var { regretRating } = req.body;

  if (regretRating === undefined || regretRating === null) {
    return res.status(400).json({ error: 'regretRating is required' });
  }

  if (regretRating < 1 || regretRating > 10) {
    return res.status(400).json({ error: 'regretRating must be between 1 and 10' });
  }

  var { data, error } = await supabaseAdmin
    .from('decisions')
    .update({ regret_rating: regretRating })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Decision not found' });

  res.json({ decision: data });
});

module.exports = router;
