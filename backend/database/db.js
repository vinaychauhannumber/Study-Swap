const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { AsyncLocalStorage } = require('async_hooks');

const transactionStorage = new AsyncLocalStorage();

const usePostgres = !!process.env.DATABASE_URL;
let pool = null;
let sqliteDb = null;

// Mock UUIDs for seeding consistent user records
const MOCK_UUIDS = {
  admin: '11111111-1111-1111-1111-111111111111',
  priya: '22222222-2222-2222-2222-222222222222',
  rohan: '33333333-3333-3333-3333-333333333333',
  amit:  '44444444-4444-4444-4444-444444444444',
  sneha: '55555555-5555-5555-5555-555555555555'
};

// Helper to translate SQLite ? placeholders to PostgreSQL $1, $2...
function translateSql(sql) {
  let paramIndex = 1;
  let converted = sql.replace(/\?/g, () => `$${paramIndex++}`);
  
  // Convert standard sqlite functions/keywords if any
  converted = converted.replace(/LIKE \?/gi, () => `ILIKE $${paramIndex - 1}`); // case insensitive matching
  
  // Emulate SQLite INSERT lastInsertRowid using RETURNING id
  if (converted.trim().toUpperCase().startsWith('INSERT INTO') && !converted.toUpperCase().includes('RETURNING')) {
    converted += ' RETURNING id';
  }
  return converted;
}

// Convert schema.sql SQLite dialect to PostgreSQL UUID/timestamp dialects
function translateSchema(schemaSql) {
  return schemaSql
    .replace(/id TEXT PRIMARY KEY/gi, 'id UUID PRIMARY KEY')
    .replace(/client_id TEXT/gi, 'client_id UUID')
    .replace(/helper_id TEXT/gi, 'helper_id UUID')
    .replace(/sender_id TEXT/gi, 'sender_id UUID')
    .replace(/receiver_id TEXT/gi, 'receiver_id UUID')
    .replace(/reviewer_id TEXT/gi, 'reviewer_id UUID')
    .replace(/reviewee_id TEXT/gi, 'reviewee_id UUID')
    .replace(/user_id TEXT/gi, 'user_id UUID')
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
}

if (usePostgres) {
  console.log('Database Mode: Supabase PostgreSQL Detected.');
  
  // Parse DATABASE_URL manually to handle Supabase's dotted username correctly
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const dbUrlObj = new URL(process.env.DATABASE_URL);
  
  const dbUser = decodeURIComponent(dbUrlObj.username);
  const dbHost = dbUrlObj.hostname;
  const dbPort = parseInt(dbUrlObj.port) || 5432;
  
  pool = new Pool({
    user: dbUser,
    password: decodeURIComponent(dbUrlObj.password),
    host: dbHost,
    port: dbPort,
    database: dbUrlObj.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });
  
  console.log(`Connecting to PostgreSQL at ${dbHost}:${dbPort} as ${dbUser}`);
} else {
  console.log('Database Mode: Local SQLite Fallback.');
  const dbPath = path.resolve(__dirname, '../studyswap.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');
}

// Initialize tables schema
async function initializeSchema() {
  const schemaSql = fs.readFileSync(path.resolve(__dirname, './schema.sql'), 'utf8');
  
  if (usePostgres) {
    const pgSchema = translateSchema(schemaSql);
    try {
      // Postgres schema init
      await pool.query(pgSchema);
      console.log('Supabase PostgreSQL tables synchronized successfully.');
    } catch (err) {
      console.error('Error synchronizing Supabase PostgreSQL schema:', err.message);
    }
  } else {
    try {
      // Local SQLite init
      sqliteDb.exec(schemaSql);
      console.log('SQLite local tables synchronized successfully.');
    } catch (err) {
      console.error('Error synchronizing SQLite schema:', err.message);
    }
  }
}

// Seeding helper function for PostgreSQL
async function seedPostgresData() {
  const checkUsers = await pool.query('SELECT COUNT(*) as count FROM users');
  const userCount = parseInt(checkUsers.rows[0].count);

  if (userCount === 0) {
    console.log('Seeding initial data into Supabase PostgreSQL...');

    // Create Admin
    await pool.query(
      `INSERT INTO users (id, email, full_name, college, course, academic_year, bio, role, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [MOCK_UUIDS.admin, 'admin@studyswap.com', 'Admin Moderator', 'StudySwap HQ', 'Administration', 'Staff', 'Platform Administrator', 'admin', 5.0]
    );

    // Create Clients
    await pool.query(
      `INSERT INTO users (id, email, full_name, college, course, academic_year, bio, role, balance, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [MOCK_UUIDS.priya, 'priya@college.edu', 'Priya Sharma', 'Delhi Technological University', 'Computer Science', '3rd Year', 'Web dev enthusiast needing assistance on graphics and research tasks.', 'client', 5000.0, 4.8]
    );

    await pool.query(
      `INSERT INTO users (id, email, full_name, college, course, academic_year, bio, role, balance, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [MOCK_UUIDS.rohan, 'rohan@college.edu', 'Rohan Mehta', 'IIT Bombay', 'Mechanical Engineering', '4th Year', 'Focusing on thesis, looking for help with report formatting and slides layout.', 'client', 3500.0, 4.5]
    );

    // Create Helpers
    await pool.query(
      `INSERT INTO users (id, email, full_name, college, course, academic_year, bio, skills, role, balance, rating, completed_tasks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [MOCK_UUIDS.amit, 'amit@college.edu', 'Amit Patel', 'BITS Pilani', 'Software Engineering', '4th Year', 'Full-stack developer. Expert in React.js, Node.js, and Python projects. Fast delivery guaranteed.', 'React.js, Node.js, Express, Python, SQL, Git', 'helper', 0.0, 4.9, 12]
    );

    await pool.query(
      `INSERT INTO users (id, email, full_name, college, course, academic_year, bio, skills, role, balance, rating, completed_tasks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [MOCK_UUIDS.sneha, 'sneha@college.edu', 'Sneha Iyer', 'NIFT Delhi', 'Graphic Design', '2nd Year', 'Freelance UI/UX designer. I create stunning presentation slides, Figma mockups, and report graphics.', 'Graphic Design, PowerPoint, Figma, UI/UX, Content Writing', 'helper', 0.0, 4.7, 8]
    );

    // Seed Tasks
    await pool.query(
      `INSERT INTO tasks (client_id, title, description, category, budget, deadline, status, difficulty_level, est_time, est_budget)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [MOCK_UUIDS.priya, 'React.js Dynamic Dashboard Assignment', 'Need a React.js dashboard with interactive charts displaying mock user logs. The UI must be modern (preferably glassmorphism) and responsive. You should use chart.js or recharts. Clean components and proper comments are required.', 'Programming', 1200.0, '3 Days', 'open', 'Medium', '10 Hours', '₹1000 - ₹1500']
    );

    await pool.query(
      `INSERT INTO tasks (client_id, title, description, category, budget, deadline, status, difficulty_level, est_time, est_budget)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [MOCK_UUIDS.priya, 'Design PPT Slides for AI Research Proposal', 'Looking for a professional presentation designer to create 12 slides summarizing my research proposal on Reinforcement Learning. I will provide the raw text notes, and you need to design the layout, select color palettes, and add icons.', 'PPT Design', 600.0, '2 Days', 'open', 'Easy', '4 Hours', '₹500 - ₹800']
    );

    await pool.query(
      `INSERT INTO tasks (client_id, title, description, category, budget, deadline, status, difficulty_level, est_time, est_budget)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [MOCK_UUIDS.rohan, 'Technical Report Writing & Formatting', 'Need someone to review, edit, and format a 15-page mechanical design report. Check for grammatical errors, structure headings, fix bibliography formatting (IEEE style), and clean up schematic diagrams.', 'Research Work', 1500.0, '5 Days', 'open', 'Hard', '15 Hours', '₹1200 - ₹1800']
    );

    // Seed Bids
    await pool.query(
      `INSERT INTO bids (task_id, helper_id, amount, delivery_hours, proposal_message, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [1, MOCK_UUIDS.amit, 1000.0, 48, 'Hi Priya! I am a 4th-year Software Engineering student and have built several production-grade React dashboards. I can implement this within 48 hours using Tailwind CSS and Recharts. Let me know if you want to chat!', 'pending']
    );

    await pool.query(
      `INSERT INTO bids (task_id, helper_id, amount, delivery_hours, proposal_message, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [1, MOCK_UUIDS.sneha, 1100.0, 36, 'I can design a beautiful and highly aesthetic UI for your dashboard. I specialize in Tailwind CSS styling and clean layout patterns.', 'pending']
    );

    // Seed Reviews
    await pool.query(
      `INSERT INTO reviews (task_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [1, MOCK_UUIDS.priya, MOCK_UUIDS.amit, 5, 'Amazing response time. Amit implemented the exact features I requested and explained the logic thoroughly. Highly recommended helper!']
    );

    console.log('Supabase PostgreSQL database seeded successfully.');
  }
}

// Seeding helper function for SQLite
function seedSqliteData() {
  const userCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('Seeding initial data into SQLite...');

    // Seed admin, clients, helpers, tasks, bids, reviews using MOCK_UUIDS
    sqliteDb.prepare(`
      INSERT INTO users (id, email, full_name, college, course, academic_year, bio, role, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(MOCK_UUIDS.admin, 'admin@studyswap.com', 'Admin Moderator', 'StudySwap HQ', 'Administration', 'Staff', 'Platform Administrator', 'admin', 5.0);

    sqliteDb.prepare(`
      INSERT INTO users (id, email, full_name, college, course, academic_year, bio, role, balance, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(MOCK_UUIDS.priya, 'priya@college.edu', 'Priya Sharma', 'Delhi Technological University', 'Computer Science', '3rd Year', 'Web dev enthusiast needing assistance on graphics and research tasks.', 'client', 5000.0, 4.8);

    sqliteDb.prepare(`
      INSERT INTO users (id, email, full_name, college, course, academic_year, bio, role, balance, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(MOCK_UUIDS.rohan, 'rohan@college.edu', 'Rohan Mehta', 'IIT Bombay', 'Mechanical Engineering', '4th Year', 'Focusing on thesis, looking for help with report formatting and slides layout.', 'client', 3500.0, 4.5);

    sqliteDb.prepare(`
      INSERT INTO users (id, email, full_name, college, course, academic_year, bio, skills, role, balance, rating, completed_tasks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(MOCK_UUIDS.amit, 'amit@college.edu', 'Amit Patel', 'BITS Pilani', 'Software Engineering', '4th Year', 'Full-stack developer. Expert in React.js, Node.js, and Python projects. Fast delivery guaranteed.', 'React.js, Node.js, Express, Python, SQL, Git', 'helper', 0.0, 4.9, 12);

    sqliteDb.prepare(`
      INSERT INTO users (id, email, full_name, college, course, academic_year, bio, skills, role, balance, rating, completed_tasks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(MOCK_UUIDS.sneha, 'sneha@college.edu', 'Sneha Iyer', 'NIFT Delhi', 'Graphic Design', '2nd Year', 'Freelance UI/UX designer. I create stunning presentation slides, Figma mockups, and report graphics.', 'Graphic Design, PowerPoint, Figma, UI/UX, Content Writing', 'helper', 0.0, 4.7, 8);

    sqliteDb.prepare(`
      INSERT INTO tasks (client_id, title, description, category, budget, deadline, status, difficulty_level, est_time, est_budget)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(MOCK_UUIDS.priya, 'React.js Dynamic Dashboard Assignment', 'Need a React.js dashboard with interactive charts displaying mock user logs. The UI must be modern (preferably glassmorphism) and responsive. You should use chart.js or recharts. Clean components and proper comments are required.', 'Programming', 1200.0, '3 Days', 'open', 'Medium', '10 Hours', '₹1000 - ₹1500');

    sqliteDb.prepare(`
      INSERT INTO tasks (client_id, title, description, category, budget, deadline, status, difficulty_level, est_time, est_budget)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(MOCK_UUIDS.priya, 'Design PPT Slides for AI Research Proposal', 'Looking for a professional presentation designer to create 12 slides summarizing my research proposal on Reinforcement Learning. I will provide the raw text notes, and you need to design the layout, select color palettes, and add icons.', 'PPT Design', 600.0, '2 Days', 'open', 'Easy', '4 Hours', '₹500 - ₹800');

    sqliteDb.prepare(`
      INSERT INTO tasks (client_id, title, description, category, budget, deadline, status, difficulty_level, est_time, est_budget)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(MOCK_UUIDS.rohan, 'Technical Report Writing & Formatting', 'Need someone to review, edit, and format a 15-page mechanical design report. Check for grammatical errors, structure headings, fix bibliography formatting (IEEE style), and clean up schematic diagrams.', 'Research Work', 1500.0, '5 Days', 'open', 'Hard', '15 Hours', '₹1200 - ₹1800');

    sqliteDb.prepare(`
      INSERT INTO bids (task_id, helper_id, amount, delivery_hours, proposal_message, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(1, MOCK_UUIDS.amit, 1000.0, 48, 'Hi Priya! I am a 4th-year Software Engineering student and have built several production-grade React dashboards. I can implement this within 48 hours using Tailwind CSS and Recharts. Let me know if you want to chat!', 'pending');

    sqliteDb.prepare(`
      INSERT INTO bids (task_id, helper_id, amount, delivery_hours, proposal_message, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(1, MOCK_UUIDS.sneha, 1100.0, 36, 'I can design a beautiful and highly aesthetic UI for your dashboard. I specialize in Tailwind CSS styling and clean layout patterns.', 'pending');

    sqliteDb.prepare(`
      INSERT INTO reviews (task_id, reviewer_id, reviewee_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(1, MOCK_UUIDS.priya, MOCK_UUIDS.amit, 5, 'Amazing response time. Amit implemented the exact features I requested and explained the logic thoroughly. Highly recommended helper!');

    console.log('SQLite database seeded successfully.');
  }
}

// Database initialization
(async () => {
  await initializeSchema();
  if (usePostgres) {
    await seedPostgresData();
  } else {
    seedSqliteData();
  }
})();

// Async Transaction storage hook
async function getExecutor() {
  const client = transactionStorage.getStore();
  return client || pool;
}

module.exports = {
  MOCK_UUIDS,
  
  // Run statement (INSERT, UPDATE, DELETE)
  async run(sql, params = []) {
    if (usePostgres) {
      const pgSql = translateSql(sql);
      const exec = await getExecutor();
      const res = await exec.query(pgSql, params);
      return {
        lastInsertRowid: res.rows[0]?.id || null,
        changes: res.rowCount
      };
    } else {
      const stmt = sqliteDb.prepare(sql);
      const res = stmt.run(...params);
      return {
        lastInsertRowid: res.lastInsertRowid,
        changes: res.changes
      };
    }
  },
  
  // Get single record
  async get(sql, params = []) {
    if (usePostgres) {
      const pgSql = translateSql(sql);
      const exec = await getExecutor();
      const res = await exec.query(pgSql, params);
      return res.rows[0] || null;
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.get(...params) || null;
    }
  },
  
  // Get all records
  async all(sql, params = []) {
    if (usePostgres) {
      const pgSql = translateSql(sql);
      const exec = await getExecutor();
      const res = await exec.query(pgSql, params);
      return res.rows;
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.all(...params);
    }
  },

  // Database transaction helper
  async transaction(fn) {
    if (usePostgres) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await transactionStorage.run(client, async () => {
          return await fn();
        });
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // For sqlite
      const trans = sqliteDb.transaction(fn);
      return trans();
    }
  }
};
