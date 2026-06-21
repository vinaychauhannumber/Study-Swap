-- Database Schema for StudySwap (Supabase Auth & PostgreSQL Compatible)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Will hold Supabase Auth UUID (TEXT for SQLite, UUID for Postgres)
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- Used for offline SQLite auth fallback
  full_name TEXT NOT NULL,
  college TEXT NOT NULL,
  course TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  bio TEXT,
  skills TEXT, -- Comma-separated list of skills
  profile_picture TEXT,
  handwriting_sample TEXT, -- Path to uploaded handwriting image
  rating REAL DEFAULT 0.0,
  completed_tasks INTEGER DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'client', -- 'client', 'helper', 'admin'
  balance REAL DEFAULT 0.0, -- virtual wallet
  is_suspended INTEGER DEFAULT 0, -- boolean 0 or 1
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  budget REAL NOT NULL,
  deadline TEXT NOT NULL, -- e.g., "2 Days" or ISO Date string
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'bidding', 'in_progress', 'submitted', 'completed', 'cancelled'
  difficulty_level TEXT, -- AI Assessed
  est_time TEXT, -- AI Assessed hours
  est_budget TEXT, -- AI Suggested budget range
  attachments TEXT, -- JSON array of file paths
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  helper_id TEXT NOT NULL,
  amount REAL NOT NULL,
  delivery_hours INTEGER NOT NULL,
  proposal_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (helper_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  is_read INTEGER DEFAULT 0, -- boolean
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  helper_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'revision_requested', 'approved', 'rejected'
  ai_score REAL DEFAULT 0.0,
  ai_grammar TEXT,
  ai_formatting TEXT,
  ai_plagiarism REAL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (helper_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  reviewer_id TEXT NOT NULL,
  reviewee_id TEXT NOT NULL,
  rating INTEGER NOT NULL, -- 1 to 5
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (reviewee_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  client_id TEXT NOT NULL,
  helper_id TEXT,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'escrowed', 'released', 'refunded'
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (helper_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'bid', 'message', 'submission', 'payment', 'system'
  is_read INTEGER DEFAULT 0, -- boolean
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
