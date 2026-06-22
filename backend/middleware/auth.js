const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'studyswap_jwt_secret_key_2026_super_secure';

const useSupabaseAuth = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
let supabase = null;

if (useSupabaseAuth) {
  console.log('Authentication Mode: Supabase Auth Enabled.');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
} else {
  console.log('Authentication Mode: Local JWT Fallback.');
}

// Middleware to authenticate JWT token
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  if (useSupabaseAuth) {
    try {
      let payload = null;
      let isLocalJwt = false;

      try {
        payload = jwt.verify(token, JWT_SECRET);
        isLocalJwt = true;
      } catch (e) {
        // Proceed with Supabase Auth check
      }

      if (isLocalJwt && payload) {
        const dbUser = await db.get('SELECT id, email, full_name, role FROM users WHERE id = ?', [payload.id]);
        if (dbUser) {
          req.user = dbUser;
          return next();
        }
      }

      // Validate token against Supabase Auth
      let user = null;
      let authError = null;
      try {
        const { data, error } = await supabase.auth.getUser(token);
        user = data?.user;
        authError = error;
      } catch (err) {
        console.warn("Supabase Auth API fetch failed. Using local token decode fallback...");
        try {
          const decoded = jwt.decode(token);
          if (decoded && decoded.sub) {
            const dbUser = await db.get('SELECT id, email, full_name, role FROM users WHERE id = ?', [decoded.sub]);
            if (dbUser) {
              req.user = dbUser;
              return next();
            }
          }
        } catch (e) {
          console.error("Local decode fallback failed:", e.message);
        }
        return res.status(500).json({ error: 'Supabase Auth connection timed out: ' + err.message });
      }

      if (authError || !user) {
        return res.status(403).json({ error: 'Invalid or expired Supabase Auth token.' });
      }

      // Fetch corresponding platform database profile
      let dbUser = await db.get('SELECT id, email, full_name, role FROM users WHERE id = ?', [user.id]);
      
      // Fallback to checking by email for users registered before Supabase integration
      if (!dbUser && user.email) {
        dbUser = await db.get('SELECT id, email, full_name, role FROM users WHERE email = ?', [user.email]);
      }

      if (!dbUser) {
        console.log(`Profile missing in middleware for ${user.email}. Auto-creating profile...`);
        const fullName = user.user_metadata?.full_name || user.email.split('@')[0];
        await db.run(
          `INSERT INTO users (id, email, full_name, college, course, academic_year, role)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [user.id, user.email, fullName, 'Delhi Technological University', 'Computer Science', '3rd Year', 'client']
        );
        dbUser = await db.get('SELECT id, email, full_name, role FROM users WHERE id = ?', [user.id]);
      }

      req.user = dbUser;
      next();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Local JWT Fallback
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      req.user = verified;
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
  }
}

// Middleware to authorize specific roles
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access forbidden. Requires one of these roles: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  supabaseClient: supabase
};
