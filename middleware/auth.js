var supabaseAdmin = require('../config/supabaseAdmin');

async function requireAuth(req, res, next) {
  var authHeader = req.headers.authorization || '';
  var token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  var { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = data.user;
  next();
}

module.exports = { requireAuth };