const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Native fetch to Gemini API
async function callGemini(prompt, systemInstruction = "") {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured.");
  }

  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: systemInstruction ? `${systemInstruction}\n\nInput:\n${prompt}` : prompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(textResult);
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    throw error;
  }
}

// ----------------------------------------------------
// 1. Task Analyzer: Estimating difficulty, time, budget
// ----------------------------------------------------
async function analyzeTaskDescription(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  // Try calling the Gemini API first
  if (GEMINI_API_KEY) {
    const systemInstruction = `You are an AI Academic Assistant. Analyze the user's task title and description. 
    You must output a JSON object containing:
    {
      "difficulty": "Easy" | "Medium" | "Hard",
      "est_time": "X Hours",
      "est_budget": "₹Min - ₹Max"
    }
    Make estimations based on difficulty. For Easy, ₹300-₹600 and 2-6 Hours. Medium, ₹700-₹1500 and 6-15 Hours. Hard, ₹1500-₹4000 and 15-40 Hours.`;
    
    try {
      return await callGemini(text, systemInstruction);
    } catch (err) {
      console.log("Falling back to local heuristic analyzer due to Gemini error.");
    }
  }

  // Local NLP Heuristic fallback
  let difficulty = "Easy";
  let estTime = "4 Hours";
  let estBudget = "₹300 - ₹500";

  // Score keywords for complexity
  const hardKeywords = ['thesis', 'research paper', 'machine learning', 'deep learning', 'solidworks', 'cad design', 'complex', 'compiler', 'full stack', 'database migration', 'cryptography', 'advanced'];
  const mediumKeywords = ['react', 'node', 'express', 'css styling', 'figma', 'ppt slides', 'essay writing', 'debugging', 'python script', 'sql query', 'excel model', 'wireframe'];
  
  let score = 0;
  hardKeywords.forEach(kw => { if (text.includes(kw)) score += 3; });
  mediumKeywords.forEach(kw => { if (text.includes(kw)) score += 1; });

  if (score >= 4) {
    difficulty = "Hard";
    estTime = "24 Hours";
    estBudget = "₹1500 - ₹2500";
  } else if (score >= 1) {
    difficulty = "Medium";
    estTime = "10 Hours";
    estBudget = "₹700 - ₹1200";
  }

  return { difficulty, est_time: estTime, est_budget: estBudget };
}

// ----------------------------------------------------
// 2. Helper Recommender: Ranks helper users based on criteria
// ----------------------------------------------------
function getHelperRecommendations(taskCategory, taskDescription, helpers) {
  const text = `${taskCategory} ${taskDescription}`.toLowerCase();
  
  const scoredHelpers = helpers.map(helper => {
    let score = 0;
    
    // Skills matching
    const skillsList = helper.skills ? helper.skills.split(',').map(s => s.trim().toLowerCase()) : [];
    skillsList.forEach(skill => {
      if (text.includes(skill)) {
        score += 5; // Direct skill match
      }
    });

    // Rating points
    score += (helper.rating || 0.0) * 3;

    // Completed tasks bonuses
    score += Math.min(helper.completed_tasks || 0, 10) * 0.5;

    return {
      ...helper,
      matching_score: Math.round(score * 10) / 10
    };
  });

  // Sort by score descending
  return scoredHelpers.sort((a, b) => b.matching_score - a.matching_score).slice(0, 3);
}

// ----------------------------------------------------
// 3. AI Quality Checker: Evaluates work submission quality
// ----------------------------------------------------
async function checkSubmissionQuality(submissionComment, taskDescription) {
  if (GEMINI_API_KEY) {
    const prompt = `Task Requirements:\n${taskDescription}\n\nSubmission Details/Explanation:\n${submissionComment}`;
    const systemInstruction = `You are an AI Quality Control Officer. Analyze the submission.
    Rate the work based on completeness, detail, and quality against requirements.
    Output a JSON object containing:
    {
      "ai_score": (number between 0 and 100),
      "ai_grammar": "Good" | "Excellent" | "Fair" | "Needs Correction",
      "ai_formatting": "Clean" | "Needs formatting updates",
      "ai_plagiarism": (plagiarism percentage number, e.g. 5.5)
    }`;
    
    try {
      return await callGemini(prompt, systemInstruction);
    } catch (err) {
      console.log("Falling back to local Quality Checker due to Gemini error.");
    }
  }

  // Local Quality Checker Fallback
  const commentLength = (submissionComment || "").length;
  let score = 70; // baseline
  let grammar = "Good";
  let formatting = "Clean";
  let plagiarism = 4.2; // default safe index

  if (commentLength > 200) {
    score += 15;
  } else if (commentLength < 30) {
    score -= 20;
    grammar = "Fair";
    formatting = "Needs formatting updates";
  }

  // If comment contains keywords indicating quick mock work
  const text = (submissionComment || "").toLowerCase();
  if (text.includes("sorry") || text.includes("could not finish") || text.includes("incomplete")) {
    score -= 30;
    plagiarism += 10.5;
  }

  if (text.includes("github") || text.includes("attached") || text.includes("implemented")) {
    score += 10;
  }

  return {
    ai_score: Math.max(0, Math.min(100, score)),
    ai_grammar: grammar,
    ai_formatting: formatting,
    ai_plagiarism: Math.round(plagiarism * 10) / 10
  };
}

// ----------------------------------------------------
// 4. Scam Detection: Checks for scam, cheating, or external payments
// ----------------------------------------------------
function detectScam(title, description, userEmail) {
  const text = `${title} ${description}`.toLowerCase();
  
  const scamKeywords = [
    'exam bypass', 'cheat in test', 'live exam help', 'whatsapp me directly',
    'pay outside', 'paytm directly', 'google pay number', 'drugs', 'hack system',
    'steal accounts', 'bypass security', 'fake identity'
  ];

  let flagged = false;
  let reason = "";

  for (const kw of scamKeywords) {
    if (text.includes(kw)) {
      flagged = true;
      reason = `Suspicious keyword detected: "${kw}". All negotiations and payments must remain within StudySwap.`;
      break;
    }
  }

  // Check for email sharing inside post descriptions (scammers share contact info to bypass escrow)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(\+91|0)?[6-9]\d{9}/g; // Indian numbers

  if (!flagged && emailRegex.test(text)) {
    flagged = true;
    reason = "Sharing email addresses in description is prohibited. Use the secure in-app chat after task acceptance.";
  }

  if (!flagged && phoneRegex.test(text)) {
    flagged = true;
    reason = "Sharing direct phone numbers in description is prohibited. Use the secure in-app chat after task acceptance.";
  }

  return {
    is_scam: flagged,
    reason: reason
  };
}

module.exports = {
  analyzeTaskDescription,
  getHelperRecommendations,
  checkSubmissionQuality,
  detectScam
};
