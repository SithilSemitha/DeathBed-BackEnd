var express = require('express');
var router = express.Router();
var { requireAuth } = require('../middleware/auth');
var { GoogleGenerativeAI } = require('@google/generative-ai');
var { ChromaClient } = require('chromadb');

var genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
var chroma = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });

/* SCRUM-143 + 144 + 145 */
router.post('/similar-stories', requireAuth, async function (req, res) {
  var { decisionText, category, topN } = req.body;

  if (!decisionText) {
    return res.status(400).json({ error: 'decisionText is required' });
  }

  var limit = topN || 5;

  var embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  var embeddingResult = await embeddingModel.embedContent(decisionText);
  var embedding = embeddingResult.embedding.values;

  if (!embedding || embedding.length === 0) {
    return res.status(500).json({ error: 'Failed to generate embedding' });
  }

  var collection = await chroma.getOrCreateCollection({ name: 'regret_stories' });

  var whereFilter = category ? { category: category } : undefined;

  var results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: limit,
    where: whereFilter
  });

  if (!results || !results.ids || results.ids[0].length === 0) {
    return res.json({ stories: [] });
  }

  var stories = results.ids[0].map(function (id, index) {
    return {
      id: id,
      content: results.documents[0][index],
      metadata: results.metadatas[0][index],
      similarityScore: results.distances
        ? parseFloat((1 - results.distances[0][index]).toFixed(4))
        : null
    };
  });

  stories.sort(function (a, b) { return b.similarityScore - a.similarityScore; });

  res.json({ stories: stories, total: stories.length, query: decisionText });
});

/* Utility: seed a story into ChromaDB */
router.post('/seed-story', requireAuth, async function (req, res) {
  var { content, category, source } = req.body;

  if (!content) return res.status(400).json({ error: 'content is required' });

  var embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  var embeddingResult = await embeddingModel.embedContent(content);
  var embedding = embeddingResult.embedding.values;

  var collection = await chroma.getOrCreateCollection({ name: 'regret_stories' });

  var id = 'story-' + Date.now();

  await collection.add({
    ids: [id],
    embeddings: [embedding],
    documents: [content],
    metadatas: [{ category: category || 'general', source: source || 'manual' }]
  });

  res.json({ message: 'Story seeded successfully', id: id });
});

module.exports = router;