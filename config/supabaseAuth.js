require('dotenv').config();
var { createClient } = require('@supabase/supabase-js');

var supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = supabaseAuth;