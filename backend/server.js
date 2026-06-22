const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

const db = require('./database/db');
const authMiddleware = require('./middleware/auth');
const aiService = require('./services/aiService');
const socketHandler = require('./sockets/socketHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Setup socket.io
socketHandler(io);

const PORT = process.env.PORT || 5005;
const JWT_SECRET = process.env.JWT_SECRET || 'studyswap_jwt_secret_key_2026_super_secure';

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.path} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Multer Storage Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper: Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ----------------------------------------------------
// 1. Authentication Router
// ----------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName, college, course, academicYear, role } = req.body;

  if (!email || !password || !fullName || !college || !course || !academicYear || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const supabaseClient = authMiddleware.supabaseClient;

  if (supabaseClient) {
    // Supabase Auth Integration Mode
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });

      if (error || !data.user) {
        return res.status(400).json({ error: error?.message || 'Registration failed via Supabase Auth.' });
      }

      // Check if user is in auth but not profile, create profile
      await db.run(
        `INSERT INTO users (id, email, full_name, college, course, academic_year, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.user.id, email, fullName, college, course, academicYear, role]
      );

      const user = await db.get('SELECT id, email, full_name, role, college, balance FROM users WHERE id = ?', [data.user.id]);
      const sessionToken = data.session?.access_token || '';

      if (!sessionToken) {
        return res.status(201).json({ 
          message: 'Registration successful. Email verification required.', 
          requiresConfirmation: true 
        });
      }

      res.status(201).json({ user, token: sessionToken });
    } catch (err) {
      if (err.message.includes('UNIQUE') || err.message.includes('unique constraint')) {
        return res.status(400).json({ error: 'Email address already registered in platform database.' });
      }
      res.status(500).json({ error: err.message });
    }
  } else {
    // Local Offline JWT Fallback
    try {
      const passwordHash = bcrypt.hashSync(password, 10);
      const tempId = 'local_' + Date.now(); // local mock ID
      await db.run(
        `INSERT INTO users (id, email, password_hash, full_name, college, course, academic_year, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [tempId, email, passwordHash, fullName, college, course, academicYear, role]
      );

      const user = await db.get('SELECT id, email, full_name, role, college, balance FROM users WHERE id = ?', [tempId]);
      const token = generateToken(user);

      res.status(201).json({ user, token });
    } catch (err) {
      if (err.message.includes('UNIQUE') || err.message.includes('unique constraint')) {
        return res.status(400).json({ error: 'Email address already registered.' });
      }
      res.status(500).json({ error: err.message });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Allow seeded demo users to log in directly via local JWT even in Supabase mode
  const isDemoUser = [
    'priya@college.edu', 
    'rohan@college.edu', 
    'amit@college.edu', 
    'sneha@college.edu', 
    'admin@studyswap.com'
  ].includes(email.toLowerCase());

  if (isDemoUser && password === 'password123') {
    try {
      let dbUser = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
      
      if (!dbUser) {
        console.log(`Demo profile missing for ${email}. Auto-creating seeded profile...`);
        const templates = {
          'admin@studyswap.com': {
            id: '11111111-1111-1111-1111-111111111111',
            full_name: 'Admin Moderator',
            college: 'StudySwap HQ',
            course: 'Administration',
            academic_year: 'Staff',
            bio: 'Platform Administrator',
            skills: '',
            role: 'admin',
            balance: 0.0,
            rating: 5.0,
            completed_tasks: 0
          },
          'priya@college.edu': {
            id: '22222222-2222-2222-2222-222222222222',
            full_name: 'Priya Sharma',
            college: 'Delhi Technological University',
            course: 'Computer Science',
            academic_year: '3rd Year',
            bio: 'Web dev enthusiast needing assistance on graphics and research tasks.',
            skills: '',
            role: 'client',
            balance: 5000.0,
            rating: 4.8,
            completed_tasks: 0
          },
          'rohan@college.edu': {
            id: '33333333-3333-3333-3333-333333333333',
            full_name: 'Rohan Mehta',
            college: 'IIT Bombay',
            course: 'Mechanical Engineering',
            academic_year: '4th Year',
            bio: 'Focusing on thesis, looking for help with report formatting and slides layout.',
            skills: '',
            role: 'client',
            balance: 3500.0,
            rating: 4.5,
            completed_tasks: 0
          },
          'amit@college.edu': {
            id: '44444444-4444-4444-4444-444444444444',
            full_name: 'Amit Patel',
            college: 'BITS Pilani',
            course: 'Software Engineering',
            academic_year: '4th Year',
            bio: 'Full-stack developer. Expert in React.js, Node.js, and Python projects. Fast delivery guaranteed.',
            skills: 'React.js, Node.js, Express, Python, SQL, Git',
            role: 'helper',
            balance: 0.0,
            rating: 4.9,
            completed_tasks: 12
          },
          'sneha@college.edu': {
            id: '55555555-5555-5555-5555-555555555555',
            full_name: 'Sneha Iyer',
            college: 'NIFT Delhi',
            course: 'Graphic Design',
            academic_year: '2nd Year',
            bio: 'Freelance UI/UX designer. I create stunning presentation slides, Figma mockups, and report graphics.',
            skills: 'Graphic Design, PowerPoint, Figma, UI/UX, Content Writing',
            role: 'helper',
            balance: 0.0,
            rating: 4.7,
            completed_tasks: 8
          }
        };

        const tmpl = templates[email.toLowerCase()];
        if (tmpl) {
          await db.run(
            `INSERT INTO users (id, email, full_name, college, course, academic_year, bio, skills, role, balance, rating, completed_tasks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tmpl.id, email.toLowerCase(), tmpl.full_name, tmpl.college, tmpl.course, tmpl.academic_year, tmpl.bio, tmpl.skills, tmpl.role, tmpl.balance, tmpl.rating, tmpl.completed_tasks]
          );
          dbUser = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        }
      }

      if (dbUser) {
        if (dbUser.is_suspended) {
          return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
        }
        const safeUser = {
          id: dbUser.id,
          email: dbUser.email,
          full_name: dbUser.full_name,
          role: dbUser.role,
          college: dbUser.college,
          course: dbUser.course,
          academic_year: dbUser.academic_year,
          bio: dbUser.bio,
          skills: dbUser.skills,
          profile_picture: dbUser.profile_picture,
          handwriting_sample: dbUser.handwriting_sample,
          rating: dbUser.rating,
          completed_tasks: dbUser.completed_tasks,
          balance: dbUser.balance
        };
        const localToken = jwt.sign(
          { id: dbUser.id, email: dbUser.email, role: dbUser.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        return res.json({ user: safeUser, token: localToken });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const supabaseClient = authMiddleware.supabaseClient;

  if (supabaseClient) {
    // Supabase Auth Integration Mode
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data.user) {
        return res.status(400).json({ error: error?.message || 'Authentication failed via Supabase Auth.' });
      }

      let user = await db.get('SELECT * FROM users WHERE id = ?', [data.user.id]);
      
      // Fallback to checking by email for users registered before Supabase integration
      if (!user) {
        user = await db.get('SELECT * FROM users WHERE email = ?', [data.user.email]);
      }

      if (!user) {
        console.log(`Profile missing for authenticated user ${data.user.email}. Auto-creating profile...`);
        const fullName = data.user.user_metadata?.full_name || data.user.email.split('@')[0];
        await db.run(
          `INSERT INTO users (id, email, full_name, college, course, academic_year, role)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [data.user.id, data.user.email, fullName, 'Delhi Technological University', 'Computer Science', '3rd Year', 'client']
        );
        user = await db.get('SELECT * FROM users WHERE id = ?', [data.user.id]);
      }

      if (user.is_suspended) {
        return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
      }

      const safeUser = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        college: user.college,
        course: user.course,
        academic_year: user.academic_year,
        bio: user.bio,
        skills: user.skills,
        profile_picture: user.profile_picture,
        handwriting_sample: user.handwriting_sample,
        rating: user.rating,
        completed_tasks: user.completed_tasks,
        balance: user.balance
      };
      
      const sessionToken = data.session?.access_token || '';
      res.json({ user: safeUser, token: sessionToken });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    // Local Offline JWT Fallback
    try {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(400).json({ error: 'Invalid email or password.' });
      }

      if (user.is_suspended) {
        return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
      }

      const safeUser = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        college: user.college,
        course: user.course,
        academic_year: user.academic_year,
        bio: user.bio,
        skills: user.skills,
        profile_picture: user.profile_picture,
        handwriting_sample: user.handwriting_sample,
        rating: user.rating,
        completed_tasks: user.completed_tasks,
        balance: user.balance
      };
      const token = generateToken(safeUser);

      res.json({ user: safeUser, token });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email, redirectTo } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const supabaseClient = authMiddleware.supabaseClient;
  if (!supabaseClient) {
    return res.status(501).json({ error: 'Password reset is only supported when Supabase Auth is enabled.' });
  }

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || req.headers.origin || 'http://localhost:5173'
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json({ message: 'Password reset email sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { access_token, new_password } = req.body;
  if (!access_token || !new_password) {
    return res.status(400).json({ error: 'Access token and new password are required.' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    
    // We update the password by calling Supabase Auth REST API with the user's access token using native https
    const https = require('https');
    const url = new URL(`${supabaseUrl}/auth/v1/user`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
        'apikey': anonKey
      }
    };

    const reqPost = https.request(options, (resPost) => {
      let data = '';
      resPost.on('data', (chunk) => { data += chunk; });
      resPost.on('end', () => {
        const parsedData = data ? JSON.parse(data) : {};
        if (resPost.statusCode < 200 || resPost.statusCode >= 300) {
          return res.status(400).json({ error: parsedData.msg || parsedData.message || 'Failed to update password.' });
        }
        res.json({ message: 'Password updated successfully.' });
      });
    });

    reqPost.on('error', (e) => {
      res.status(500).json({ error: e.message });
    });

    reqPost.write(JSON.stringify({ password: new_password }));
    reqPost.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const user = await db.get('SELECT id, email, full_name, role, college, course, academic_year, bio, skills, profile_picture, handwriting_sample, rating, completed_tasks, balance, is_suspended FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. User Profiles & Wallets
// ----------------------------------------------------

app.get('/api/users/profile/:id', async (req, res) => {
  try {
    const user = await db.get('SELECT id, email, full_name, role, college, course, academic_year, bio, skills, profile_picture, handwriting_sample, rating, completed_tasks FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    
    // Get helper reviews
    const reviews = await db.all(
      `SELECT r.*, u.full_name as reviewer_name, u.profile_picture as reviewer_pic 
       FROM reviews r 
       JOIN users u ON r.reviewer_id = u.id 
       WHERE r.reviewee_id = ? 
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json({ user, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/profile', authMiddleware.authenticateToken, async (req, res) => {
  const { fullName, bio, skills, college, course, academicYear } = req.body;
  try {
    await db.run(
      `UPDATE users 
       SET full_name = ?, bio = ?, skills = ?, college = ?, course = ?, academic_year = ? 
       WHERE id = ?`,
      [fullName, bio, skills, college, course, academicYear, req.user.id]
    );
    const updatedUser = await db.get('SELECT id, email, full_name, role, college, course, academic_year, bio, skills, profile_picture, handwriting_sample, rating, completed_tasks, balance FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Switch role endpoint
app.put('/api/users/switch-role', authMiddleware.authenticateToken, async (req, res) => {
  const { role } = req.body;
  console.log(`[SWITCH-ROLE] User ${req.user?.id} (${req.user?.email}, current role: ${req.user?.role}) switching to: ${role}`);
  if (role !== 'client' && role !== 'helper') {
    console.log(`[SWITCH-ROLE] Rejected: Invalid role: ${role}`);
    return res.status(400).json({ error: 'Role must be client or helper.' });
  }
  try {
    const updateResult = await db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.user.id]);
    console.log(`[SWITCH-ROLE] Update completed. Row changes: ${updateResult.changes}`);
    const updatedUser = await db.get('SELECT id, email, full_name, role, college, course, academic_year, bio, skills, profile_picture, handwriting_sample, rating, completed_tasks, balance FROM users WHERE id = ?', [req.user.id]);
    console.log(`[SWITCH-ROLE] Database verify: User ID ${updatedUser?.id} role is now: ${updatedUser?.role}`);
    
    // Generate new token so the role payload inside the token remains updated
    const token = generateToken(updatedUser);
    res.json({ user: updatedUser, token });
  } catch (err) {
    console.error(`[SWITCH-ROLE] Database update failed:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Upload profile picture or handwriting sample
app.post('/api/users/upload-sample', authMiddleware.authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const uploadType = req.body.type; // 'profile_picture' or 'handwriting_sample'

  try {
    if (uploadType === 'profile_picture') {
      await db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [fileUrl, req.user.id]);
    } else {
      await db.run('UPDATE users SET handwriting_sample = ? WHERE id = ?', [fileUrl, req.user.id]);
    }
    
    const user = await db.get('SELECT id, email, full_name, role, college, course, academic_year, bio, skills, profile_picture, handwriting_sample, rating, completed_tasks, balance FROM users WHERE id = ?', [req.user.id]);
    res.json({ user, fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulated wallet deposit (Mimicking Razorpay success callback)
app.post('/api/users/wallet/deposit', authMiddleware.authenticateToken, async (req, res) => {
  const { amount, paymentMethod } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount.' });
  }

  try {
    await db.transaction(async () => {
      // 1. Update wallet balance
      await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, req.user.id]);
      
      // 2. Create local payment log
      await db.run(
        `INSERT INTO payments (task_id, client_id, amount, status, razorpay_order_id, razorpay_payment_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [0, req.user.id, amount, 'completed', 'deposit_order_' + Date.now(), 'deposit_pay_' + Date.now()]
      );
    });

    const updatedUser = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
    
    // Send immediate socket alert
    io.sendNotification(req.user.id, {
      title: 'Wallet Deposited',
      message: `₹${amount} has been successfully added to your wallet via ${paymentMethod || 'UPI'}.`,
      type: 'payment'
    });

    res.json({ balance: updatedUser.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. Task Management & Marketplace
// ----------------------------------------------------

app.get('/api/tasks', async (req, res) => {
  const { search, category, status, minBudget, maxBudget, sortBy } = req.query;
  
  let query = `
    SELECT t.*, u.full_name as client_name, u.college as client_college, u.profile_picture as client_pic,
    (SELECT COUNT(*) FROM bids b WHERE b.task_id = t.id) as bid_count
    FROM tasks t
    JOIN users u ON t.client_id = u.id
    WHERE t.status != 'completed'
  `;
  const params = [];

  if (search) {
    query += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    query += ` AND t.category = ?`;
    params.push(category);
  }

  if (status) {
    query += ` AND t.status = ?`;
    params.push(status);
  }

  if (minBudget) {
    query += ` AND t.budget >= ?`;
    params.push(Number(minBudget));
  }

  if (maxBudget) {
    query += ` AND t.budget <= ?`;
    params.push(Number(maxBudget));
  }

  if (sortBy === 'budget_desc') {
    query += ` ORDER BY t.budget DESC`;
  } else if (sortBy === 'deadline_soon') {
    query += ` ORDER BY t.deadline ASC`;
  } else {
    query += ` ORDER BY t.created_at DESC`; // Default newest
  }

  try {
    const tasks = await db.all(query, params);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get client posted tasks or helper active tasks
app.get('/api/tasks/my-tasks', authMiddleware.authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    let tasks;
    if (role === 'client') {
      tasks = await db.all(
        `SELECT t.*, 
         (SELECT COUNT(*) FROM bids b WHERE b.task_id = t.id) as bid_count
         FROM tasks t 
         WHERE t.client_id = ? 
         ORDER BY t.created_at DESC`,
        [userId]
      );
    } else {
      // Helper: get tasks where helper placed a bid, or is assigned
      tasks = await db.all(
        `SELECT DISTINCT t.*, b.status as bid_status, b.amount as bid_amount,
         u.full_name as client_name, u.college as client_college,
         (SELECT COUNT(*) FROM bids WHERE task_id = t.id) as bid_count
         FROM tasks t
         JOIN bids b ON t.id = b.task_id
         JOIN users u ON t.client_id = u.id
         WHERE b.helper_id = ?
         ORDER BY t.created_at DESC`,
        [userId]
      );
    }
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:id', async (req, res) => {
  try {
    const task = await db.get(
      `SELECT t.*, u.full_name as client_name, u.college as client_college, u.profile_picture as client_pic, u.rating as client_rating,
              (SELECT helper_id FROM bids WHERE task_id = t.id AND status = 'accepted') as accepted_helper_id
       FROM tasks t
       JOIN users u ON t.client_id = u.id
       WHERE t.id = ?`,
      [req.params.id]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create task with AI features (Scam Detection + Difficulty/Budget Estimation)
app.post('/api/tasks', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('client'), upload.array('attachments'), async (req, res) => {
  const { title, description, category, budget, deadline } = req.body;

  if (!title || !description || !category || !budget || !deadline) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // 1. AI Scam detection check
  const scamCheck = aiService.detectScam(title, description, req.user.email);
  if (scamCheck.is_scam) {
    return res.status(400).json({ error: `Task blocked by AI Moderation. Reason: ${scamCheck.reason}` });
  }

  const attachmentUrls = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

  try {
    // 2. AI Budget & Difficulty Analyzer
    const aiAnalysis = await aiService.analyzeTaskDescription(title, description);

    // 3. Save to database
    const result = await db.run(
      `INSERT INTO tasks (client_id, title, description, category, budget, deadline, difficulty_level, est_time, est_budget, attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title,
        description,
        category,
        Number(budget),
        deadline,
        aiAnalysis.difficulty,
        aiAnalysis.est_time,
        aiAnalysis.est_budget,
        JSON.stringify(attachmentUrls)
      ]
    );

    const newTask = await db.get('SELECT * FROM tasks WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI analysis helper endpoint (Pre-submit advice for Task Posters)
app.post('/api/tasks/analyze-prepost', authMiddleware.authenticateToken, async (req, res) => {
  const { title, description } = req.body;
  try {
    const analysis = await aiService.analyzeTaskDescription(title || "", description || "");
    const scam = aiService.detectScam(title || "", description || "", req.user.email);
    res.json({ analysis, scam });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Client edits their own task
app.put('/api/tasks/:id', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('client'), async (req, res) => {
  const { title, description, category, budget, deadline } = req.body;
  
  try {
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (task.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to edit this task.' });
    }

    if (task.status !== 'open' && task.status !== 'bidding') {
      return res.status(400).json({ error: 'Cannot edit a task that is in progress or completed.' });
    }

    if (!title || !description || !category || !budget || !deadline) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    await db.run(
      `UPDATE tasks SET title = ?, description = ?, category = ?, budget = ?, deadline = ? WHERE id = ?`,
      [title, description, category, Number(budget), deadline, req.params.id]
    );

    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const task = await db.get('SELECT client_id, status FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (task.client_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this task.' });
    }

    if (task.status !== 'open' && task.status !== 'bidding' && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Cannot delete a task that is currently in progress or completed.' });
    }

    await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. Bidding System
// ----------------------------------------------------

app.get('/api/tasks/:taskId/bids', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const bids = await db.all(
      `SELECT b.*, u.full_name as helper_name, u.college as helper_college, u.rating as helper_rating, u.profile_picture as helper_pic, u.completed_tasks as helper_tasks
       FROM bids b
       JOIN users u ON b.helper_id = u.id
       WHERE b.task_id = ?
       ORDER BY b.created_at DESC`,
      [req.params.taskId]
    );
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bids', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('helper'), async (req, res) => {
  const { taskId, amount, deliveryHours, proposalMessage } = req.body;

  if (!taskId || !amount || !deliveryHours || !proposalMessage) {
    return res.status(400).json({ error: 'All bidding fields are required.' });
  }

  try {
    const task = await db.get('SELECT status, client_id FROM tasks WHERE id = ?', [taskId]);
    if (!task || task.status !== 'open') {
      return res.status(400).json({ error: 'Task is no longer open for bidding.' });
    }

    // Check if helper has already bid
    const existingBid = await db.get('SELECT id FROM bids WHERE task_id = ? AND helper_id = ?', [taskId, req.user.id]);
    if (existingBid) {
      return res.status(400).json({ error: 'You have already placed a bid on this task.' });
    }

    const result = await db.run(
      `INSERT INTO bids (task_id, helper_id, amount, delivery_hours, proposal_message)
       VALUES (?, ?, ?, ?, ?)`,
      [taskId, req.user.id, Number(amount), Number(deliveryHours), proposalMessage]
    );

    // Automatically send a SYSTEM_PROPOSAL message to the chat thread!
    const bidId = result.lastInsertRowid;
    const proposalContent = `SYSTEM_PROPOSAL:{"bidId":${bidId},"amount":${amount},"deliveryHours":${deliveryHours},"proposalMessage":${JSON.stringify(proposalMessage)}}`;
    await db.run(
      `INSERT INTO messages (task_id, sender_id, receiver_id, content)
       VALUES (?, ?, ?, ?)`,
      [taskId, req.user.id, task.client_id, proposalContent]
    );

    // Notify client
    io.sendNotification(task.client_id, {
      title: 'New Bid Received',
      message: `${req.user.full_name} has placed a bid of ₹${amount} on your task.`,
      type: 'bid'
    });

    res.status(201).json({ id: bidId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Client accepts bid -> Proposal Acceptance
app.post('/api/bids/:id/accept', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('client'), async (req, res) => {
  const bidId = req.params.id;

  try {
    const bid = await db.get('SELECT * FROM bids WHERE id = ?', [bidId]);
    if (!bid || bid.status !== 'pending') {
      return res.status(404).json({ error: 'Bid not found or already processed.' });
    }

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [bid.task_id]);
    if (!task || task.status !== 'open') {
      return res.status(400).json({ error: 'Task is not open.' });
    }

    if (task.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    await db.transaction(async () => {
      // 1. Create local payment log for history
      await db.run(
        `INSERT INTO payments (task_id, client_id, helper_id, amount, status)
         VALUES (?, ?, ?, ?, ?)`,
        [task.id, req.user.id, bid.helper_id, bid.amount, 'escrowed']
      );

      // 2. Update accepted bid status, reject others
      await db.run("UPDATE bids SET status = 'accepted' WHERE id = ?", [bidId]);
      await db.run("UPDATE bids SET status = 'rejected' WHERE id != ? AND task_id = ?", [bidId, task.id]);

      // 3. Update task status to in progress
      await db.run("UPDATE tasks SET status = 'in_progress', budget = ? WHERE id = ?", [bid.amount, task.id]);
    });

    // Notify Helper
    io.sendNotification(bid.helper_id, {
      title: 'Bid Accepted!',
      message: `Your bid of ₹${bid.amount} has been accepted. Please start the work.`,
      type: 'bid'
    });

    res.json({ message: 'Bid accepted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject a bid
app.post('/api/bids/:id/reject', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('client'), async (req, res) => {
  const bidId = req.params.id;
  try {
    const bid = await db.get('SELECT * FROM bids WHERE id = ?', [bidId]);
    if (!bid || bid.status !== 'pending') {
      return res.status(404).json({ error: 'Bid not found or already processed.' });
    }

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [bid.task_id]);
    if (!task || task.status !== 'open') {
      return res.status(400).json({ error: 'Task is not open.' });
    }

    if (task.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    await db.run('UPDATE bids SET status = ? WHERE id = ?', ['rejected', bidId]);

    // Notify Helper
    io.sendNotification(bid.helper_id, {
      title: 'Bid Declined',
      message: `Your bid of ₹${bid.amount} has been declined.`,
      type: 'bid'
    });

    res.json({ message: 'Bid rejected successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get status of a bid
app.get('/api/bids/status/:id', authMiddleware.authenticateToken, async (req, res) => {
  const bidId = req.params.id;
  try {
    const bid = await db.get('SELECT status, amount, delivery_hours, task_id FROM bids WHERE id = ?', [bidId]);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found.' });
    }
    res.json(bid);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper cancels/withdraws their own bid
app.post('/api/bids/:id/cancel', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('helper'), async (req, res) => {
  const bidId = req.params.id;
  try {
    const bid = await db.get('SELECT * FROM bids WHERE id = ?', [bidId]);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found.' });
    }

    if (bid.helper_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only cancel your own bids.' });
    }

    if (bid.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending bids can be cancelled.' });
    }

    // Delete the bid
    await db.run('DELETE FROM bids WHERE id = ?', [bidId]);

    // Also delete the SYSTEM_PROPOSAL message from chat
    await db.run(
      `DELETE FROM messages WHERE task_id = ? AND sender_id = ? AND content LIKE '%SYSTEM_PROPOSAL%' AND content LIKE '%"bidId":${bidId}%'`,
      [bid.task_id, req.user.id]
    );

    // Notify client
    const task = await db.get('SELECT client_id, title FROM tasks WHERE id = ?', [bid.task_id]);
    if (task) {
      io.sendNotification(task.client_id, {
        title: 'Bid Withdrawn',
        message: `${req.user.full_name} has withdrawn their bid of ₹${bid.amount} on "${task.title}".`,
        type: 'bid'
      });
    }

    res.json({ message: 'Bid cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ----------------------------------------------------
// 5. Chat History API
// ----------------------------------------------------

app.get('/api/chat/conversations', authMiddleware.authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const messages = await db.all(
      `SELECT m.*, t.title as task_title, t.status as task_status,
              (SELECT helper_id FROM bids WHERE task_id = t.id AND status = 'accepted') as accepted_helper_id,
              u.full_name as partner_name, u.profile_picture as partner_pic, u.role as partner_role
       FROM messages m
       JOIN tasks t ON m.task_id = t.id
       JOIN users u ON u.id = (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END)
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.created_at DESC`,
      [userId, userId, userId]
    );

    const conversationsMap = new Map();

    for (const msg of messages) {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const key = `${msg.task_id}_${partnerId}`;
      
      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          taskId: msg.task_id,
          taskTitle: msg.task_title,
          taskStatus: msg.task_status,
          acceptedHelperId: msg.accepted_helper_id,
          partnerId,
          partnerName: msg.partner_name,
          partnerPic: msg.partner_pic,
          partnerRole: msg.partner_role,
          lastMessage: msg.content || (msg.file_url ? 'Sent a file.' : ''),
          lastMessageTime: msg.created_at,
          lastSenderId: msg.sender_id,
          unreadCount: 0
        });
      }
      
      if (msg.receiver_id === userId && !msg.is_read) {
        conversationsMap.get(key).unreadCount += 1;
      }
    }

    res.json(Array.from(conversationsMap.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chat/:taskId/history', authMiddleware.authenticateToken, async (req, res) => {
  const taskId = req.params.taskId;
  const userId = req.user.id;
  const partnerId = req.query.partnerId;

  try {
    let query = `
      SELECT m.*, u.full_name as sender_name, u.profile_picture as sender_pic 
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.task_id = ?
    `;
    const params = [taskId];

    if (partnerId) {
      // Secure peer-to-peer query: only get messages exchanged between userId and partnerId
      query += ` AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))`;
      params.push(userId, partnerId, partnerId, userId);
    } else {
      // Fallback: get messages involving userId
      query += ` AND (m.sender_id = ? OR m.receiver_id = ?)`;
      params.push(userId, userId);
    }

    query += ` ORDER BY m.created_at ASC`;
    const messages = await db.all(query, params);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Chat file upload
app.post('/api/chat/upload', authMiddleware.authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  res.json({ 
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname
  });
});

// ----------------------------------------------------
// 6. Submissions & Approvals (Escrow Release)
// ----------------------------------------------------

app.post('/api/submissions', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('helper'), upload.single('submission_file'), async (req, res) => {
  const { taskId, comment } = req.body;

  if (!taskId || !req.file) {
    return res.status(400).json({ error: 'Task ID and completed file are required.' });
  }

  try {
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task || task.status !== 'in_progress') {
      return res.status(400).json({ error: 'Task is not in progress.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;

    // 1. Evaluate AI Quality Check
    const aiReport = await aiService.checkSubmissionQuality(comment || "", task.description);

    let submissionId;
    await db.transaction(async () => {
      // 2. Insert submission record
      const result = await db.run(
        `INSERT INTO submissions (task_id, helper_id, file_url, file_name, comment, ai_score, ai_grammar, ai_formatting, ai_plagiarism)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          req.user.id,
          fileUrl,
          fileName,
          comment || null,
          aiReport.ai_score,
          aiReport.ai_grammar,
          aiReport.ai_formatting,
          aiReport.ai_plagiarism
        ]
      );
      submissionId = result.lastInsertRowid;

      // 3. Update task status
      await db.run("UPDATE tasks SET status = 'submitted' WHERE id = ?", [taskId]);
    });

    // Notify Client
    io.sendNotification(task.client_id, {
      title: 'Work Submitted',
      message: `${req.user.full_name} has submitted the work for "${task.title}". Review is pending.`,
      type: 'submission'
    });

    res.status(201).json({ id: submissionId, aiReport });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get submissions list for task
app.get('/api/tasks/:taskId/submissions', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const submissions = await db.all(
      `SELECT s.*, u.full_name as helper_name
       FROM submissions s
       JOIN users u ON s.helper_id = u.id
       WHERE s.task_id = ?
       ORDER BY s.created_at DESC`,
      [req.params.taskId]
    );
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Client approves submission -> Work Completion
app.post('/api/submissions/:id/approve', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('client'), async (req, res) => {
  const submissionId = req.params.id;

  try {
    const submission = await db.get('SELECT * FROM submissions WHERE id = ?', [submissionId]);
    if (!submission || submission.status !== 'pending') {
      return res.status(404).json({ error: 'Submission not found or already approved.' });
    }

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [submission.task_id]);
    if (task.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    const payment = await db.get("SELECT * FROM payments WHERE task_id = ? AND status = 'escrowed'", [task.id]);

    await db.transaction(async () => {
      // 1. Increment completed tasks count for helper
      await db.run('UPDATE users SET completed_tasks = completed_tasks + 1 WHERE id = ?', [submission.helper_id]);

      // 2. Update escrow record if exists
      if (payment) {
        await db.run("UPDATE payments SET status = 'released' WHERE id = ?", [payment.id]);
      }

      // 3. Mark submission as approved
      await db.run("UPDATE submissions SET status = 'approved' WHERE id = ?", [submissionId]);

      // 4. Update task status to completed
      await db.run("UPDATE tasks SET status = 'completed' WHERE id = ?", [task.id]);
    });

    // Notify Helper
    io.sendNotification(submission.helper_id, {
      title: 'Submission Approved!',
      message: `Your submission for "${task.title}" was approved.`,
      type: 'payment'
    });

    res.json({ message: 'Submission approved successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Client requests revision
app.post('/api/submissions/:id/revision', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('client'), async (req, res) => {
  const submissionId = req.params.id;
  const { revisionComments } = req.body;

  if (!revisionComments) {
    return res.status(400).json({ error: 'Revision feedback is required.' });
  }

  try {
    const submission = await db.get('SELECT * FROM submissions WHERE id = ?', [submissionId]);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [submission.task_id]);
    if (task.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    await db.transaction(async () => {
      await db.run("UPDATE submissions SET status = 'revision_requested', comment = ? WHERE id = ?", [revisionComments, submissionId]);
      await db.run("UPDATE tasks SET status = 'in_progress' WHERE id = ?", [task.id]);
    });

    // Notify Helper
    io.sendNotification(submission.helper_id, {
      title: 'Revision Requested',
      message: `Revision was requested for "${task.title}". Check comments for feedback.`,
      type: 'submission'
    });

    res.json({ message: 'Revision request sent successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper recommendations query API (Based on task details)
app.get('/api/tasks/:id/recommendations', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Get all helpers
    const helpers = await db.all('SELECT id, full_name, college, rating, skills, completed_tasks, profile_picture FROM users WHERE role = "helper"');
    
    // Ranks based on category, descriptions and skills
    const recommendations = aiService.getHelperRecommendations(task.category, task.description, helpers);
    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. Rating & Review System
// ----------------------------------------------------

app.post('/api/reviews', authMiddleware.authenticateToken, async (req, res) => {
  const { taskId, revieweeId, rating, comment } = req.body;

  if (!taskId || !revieweeId || !rating) {
    return res.status(400).json({ error: 'Task ID, reviewer ID, and rating (1-5) are required.' });
  }

  try {
    // Save review
    await db.run(
      `INSERT INTO reviews (task_id, reviewer_id, reviewee_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [taskId, req.user.id, revieweeId, rating, comment]
    );

    // Calculate new rating average for reviewee
    const stats = await db.get('SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewee_id = ?', [revieweeId]);
    await db.run('UPDATE users SET rating = ? WHERE id = ?', [Math.round(stats.avg_rating * 10) / 10, revieweeId]);

    // Send notifications
    io.sendNotification(revieweeId, {
      title: 'New Review Received',
      message: `You received a ${rating}-star review: "${comment || ''}"`,
      type: 'info'
    });

    res.status(201).json({ message: 'Review submitted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. Notifications Router
// ----------------------------------------------------

app.get('/api/notifications', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const notifications = await db.all(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/read-all', authMiddleware.authenticateToken, async (req, res) => {
  try {
    await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. Admin Dashboard Router
// ----------------------------------------------------

app.get('/api/admin/analytics', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('admin'), async (req, res) => {
  try {
    const totalUsersRow = await db.get('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersRow.count;

    const activeTasksRow = await db.get('SELECT COUNT(*) as count FROM tasks WHERE status IN (\'open\', \'bidding\', \'in_progress\', \'submitted\')');
    const activeTasks = activeTasksRow.count;

    const completedTasksRow = await db.get('SELECT COUNT(*) as count FROM tasks WHERE status = \'completed\'');
    const completedTasks = completedTasksRow.count;

    const cancelledTasksRow = await db.get('SELECT COUNT(*) as count FROM tasks WHERE status = \'cancelled\'');
    const cancelledTasks = cancelledTasksRow.count;
    
    // Revenue = 10% commission on released payments
    const revenueRow = await db.get('SELECT SUM(amount * 0.1) as revenue FROM payments WHERE status = \'released\'');
    const totalRevenue = revenueRow.revenue || 0.0;

    const completionRate = () => {
      const denom = completedTasks + cancelledTasks;
      return denom > 0 ? Math.round((completedTasks / denom) * 100) : 0;
    };

    // Category distribution
    const categories = await db.all('SELECT category, COUNT(*) as count FROM tasks GROUP BY category');

    res.json({
      totalUsers,
      activeTasks,
      completedTasks,
      totalRevenue,
      completionRate: completionRate(),
      categories
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('admin'), async (req, res) => {
  try {
    const users = await db.all('SELECT id, email, full_name, role, college, rating, completed_tasks, balance, is_suspended, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id/toggle-suspension', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('admin'), async (req, res) => {
  try {
    const user = await db.get('SELECT is_suspended FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const newSuspensionState = user.is_suspended === 1 ? 0 : 1;
    await db.run('UPDATE users SET is_suspended = ? WHERE id = ?', [newSuspensionState, req.params.id]);

    res.json({ 
      message: `User successfully ${newSuspensionState === 1 ? 'suspended' : 're-activated'}.`,
      is_suspended: newSuspensionState 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Express Error-Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size allowed is 10MB.' });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  res.status(500).json({ error: err.message || 'An unexpected internal server error occurred.' });
});

// Start Express + WebSocket Server
server.listen(PORT, () => {
  console.log(`StudySwap Backend Server running on http://localhost:${PORT}`);
});
