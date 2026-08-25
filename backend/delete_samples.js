require('dotenv').config();
const db = require('./database/db');

async function run() {
  console.log('Connecting to db...');
  try {
    const titles = [
      'Technical Report Writing & Formatting',
      'React.js Dynamic Dashboard Assignment',
      'Design PPT Slides for AI Research Proposal'
    ];
    
    for (const title of titles) {
      await db.run('DELETE FROM tasks WHERE title = $1', [title]);
      console.log('Deleted:', title);
    }
    
    // Also might want to delete their dummy users Priya Sharma, Rohan Mehta if no tasks left
    await db.run(`DELETE FROM users WHERE full_name IN ('Priya Sharma', 'Rohan Mehta')`);
    console.log('Deleted dummy users');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setTimeout(run, 1000);
