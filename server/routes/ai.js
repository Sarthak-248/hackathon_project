const express = require('express');
const auth = require('../middleware/auth');
const Groq = require('groq-sdk');
const router = express.Router();

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ─── Fallback rule-based engine (used if GROQ_API_KEY is missing) ──────────────
const MEDICINE_DB = {
  bp: {
    names: ['Amlodipine', 'Losartan', 'Metoprolol', 'Lisinopril', 'Atenolol'],
    schedule: 'morning',
    precautions: 'Take at the same time daily. Avoid grapefruit. Monitor blood pressure regularly. May cause dizziness – stand up slowly.',
    category: 'Blood Pressure'
  },
  diabetes: {
    names: ['Metformin', 'Glimepiride', 'Sitagliptin', 'Insulin', 'Gliclazide'],
    schedule: 'before_meals',
    precautions: 'Take with food to reduce stomach upset. Monitor blood sugar levels. Carry glucose tablets for low sugar episodes. Avoid alcohol.',
    category: 'Diabetes'
  },
  cholesterol: {
    names: ['Atorvastatin', 'Rosuvastatin', 'Simvastatin'],
    schedule: 'evening',
    precautions: 'Take in the evening for best effect. Report any muscle pain to doctor. Regular liver function tests recommended.',
    category: 'Cholesterol'
  },
  thyroid: {
    names: ['Levothyroxine', 'Thyronorm'],
    schedule: 'early_morning',
    precautions: 'Take on empty stomach, 30 minutes before food. Do not take with calcium or iron supplements. Regular thyroid tests needed.',
    category: 'Thyroid'
  },
  heart: {
    names: ['Aspirin', 'Clopidogrel', 'Warfarin', 'Ecosprin'],
    schedule: 'morning',
    precautions: 'Take with food to avoid stomach issues. Watch for unusual bleeding or bruising. Regular INR tests if on Warfarin.',
    category: 'Heart / Blood Thinner'
  },
  acid: {
    names: ['Omeprazole', 'Pantoprazole', 'Ranitidine', 'Rabeprazole'],
    schedule: 'before_breakfast',
    precautions: 'Take 30 minutes before meals. Not for long-term use without doctor advice. Report any persistent stomach issues.',
    category: 'Acid Reflux / Stomach'
  },
  pain: {
    names: ['Paracetamol', 'Ibuprofen', 'Diclofenac'],
    schedule: 'as_needed',
    precautions: 'Do not exceed recommended dose. Take with food. Avoid combining multiple pain medications. Not for long-term daily use.',
    category: 'Pain Relief'
  },
  vitamin: {
    names: ['Vitamin D', 'Vitamin B12', 'Calcium', 'Iron', 'Folic Acid'],
    schedule: 'morning',
    precautions: 'Take with meals for better absorption. Calcium and iron should be taken at different times. Stay hydrated.',
    category: 'Vitamins & Supplements'
  }
};

const INTERACTIONS = [
  { drugs: ['Metformin', 'Alcohol'], warning: 'Metformin with alcohol can increase risk of lactic acidosis.' },
  { drugs: ['Warfarin', 'Aspirin'], warning: 'Combining blood thinners increases bleeding risk significantly.' },
  { drugs: ['Lisinopril', 'Potassium'], warning: 'ACE inhibitors with potassium supplements may cause dangerous high potassium.' },
  { drugs: ['Amlodipine', 'Simvastatin'], warning: 'This combination may increase side effects of Simvastatin.' },
  { drugs: ['Levothyroxine', 'Calcium'], warning: 'Take thyroid medicine at least 4 hours apart from calcium supplements.' },
  { drugs: ['Losartan', 'Potassium'], warning: 'This combination may cause dangerously high potassium levels.' },
  { drugs: ['Ibuprofen', 'Aspirin'], warning: 'Taking these together increases risk of stomach bleeding.' },
  { drugs: ['Omeprazole', 'Clopidogrel'], warning: 'Omeprazole may reduce the effectiveness of Clopidogrel.' },
];

function detectCategories(input) {
  const lower = input.toLowerCase();
  const detected = [];
  const keywordMap = {
    bp: ['bp', 'blood pressure', 'hypertension'],
    diabetes: ['diabetes', 'sugar', 'blood sugar', 'diabetic', 'insulin'],
    cholesterol: ['cholesterol', 'lipid', 'statin'],
    thyroid: ['thyroid', 'tsh', 'levothyroxine'],
    heart: ['heart', 'cardiac', 'blood thinner', 'aspirin'],
    acid: ['acid', 'acidity', 'gerd', 'reflux', 'stomach'],
    pain: ['pain', 'headache', 'painkiller', 'arthritis'],
    vitamin: ['vitamin', 'supplement', 'calcium', 'iron', 'b12']
  };
  for (const [cat, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(k => lower.includes(k))) detected.push(cat);
  }
  return detected;
}

function checkInteractions(medicineNames) {
  const warnings = [];
  for (const interaction of INTERACTIONS) {
    const matches = interaction.drugs.filter(d =>
      medicineNames.some(m => m.toLowerCase().includes(d.toLowerCase()))
    );
    if (matches.length >= 2) warnings.push(interaction.warning);
  }
  return warnings;
}

function fallbackSchedule(input) {
  const categories = detectCategories(input);
  if (categories.length === 0) {
    return {
      success: false,
      message: "I couldn't identify specific medicine categories. Try mentioning conditions like 'BP', 'diabetes', 'cholesterol', 'thyroid', etc.",
      disclaimer: '⚕️ This is informational only. Please consult your doctor.'
    };
  }
  const schedule = { morning: [], afternoon: [], evening: [], beforeBed: [] };
  const allPrecautions = [];
  const allMedicines = [];
  for (const cat of categories) {
    const info = MEDICINE_DB[cat];
    if (!info) continue;
    const medicine = { name: info.names[0], category: info.category, dosage: '1 tablet', frequency: 'daily' };
    allMedicines.push(medicine.name);
    allPrecautions.push({ category: info.category, precaution: info.precautions });
    switch (info.schedule) {
      case 'early_morning':
      case 'before_breakfast':
        schedule.morning.push({ ...medicine, time: '07:00', note: 'Before breakfast, empty stomach' }); break;
      case 'morning':
      case 'before_meals':
        schedule.morning.push({ ...medicine, time: '08:00', note: 'With breakfast' }); break;
      case 'evening':
        schedule.evening.push({ ...medicine, time: '20:00', note: 'After dinner' }); break;
      case 'as_needed':
        schedule.afternoon.push({ ...medicine, time: 'As needed', note: 'Only when required' }); break;
      default:
        schedule.morning.push({ ...medicine, time: '08:00', note: 'With meals' });
    }
  }
  const interactions = checkInteractions(allMedicines);
  return {
    success: true,
    schedule,
    precautions: allPrecautions,
    interactions: interactions.length > 0
      ? interactions.map(w => `⚠️ ${w}`)
      : ['✅ No major interactions detected between suggested medicines.'],
    reasoning: categories.map(cat => {
      const info = MEDICINE_DB[cat];
      return `${info.category}: Scheduled in the ${info.schedule.replace('_', ' ')} for optimal effectiveness.`;
    }),
    detectedCategories: categories.map(c => MEDICINE_DB[c]?.category),
    disclaimer: '⚕️ This is informational only. Please consult your doctor before starting, stopping, or changing any medication.',
    interactionWarning: interactions.length > 0 ? '🚨 Please consult your doctor/pharmacist before combining these medicines.' : null
  };
}

// ─── Groq-powered schedule suggestion ─────────────────────────────────────────
async function groqSchedule(input) {
  const systemPrompt = `You are an expert medical schedule assistant helping patients manage their medicines safely.
You can handle ANY disease, condition, symptom, or medicine the user mentions — common or rare.

Examples you must handle: viral fever, dengue, malaria, typhoid, cold & flu, migraine, asthma, COPD,
kidney disease, liver disease, arthritis, anxiety, depression, skin infections, eye drops, ear drops,
post-surgery recovery, cancer supportive care, pediatric conditions, and anything else.

STRICT SAFETY RULES:
- Suggest only well-known, commonly used generic medicines for the condition
- Never diagnose — only suggest typical medicines used for the described condition
- Always include a doctor consultation reminder
- Flag any potential drug interactions
- Use simple language suitable for all patients
- If a condition is serious or unclear, still provide general supportive medicines and strongly urge doctor visit

You must respond with ONLY valid JSON — no markdown fences, no extra text, no explanation outside the JSON.
Use exactly this structure:
{
  "success": true,
  "detectedCategories": ["Viral Fever", "Flu"],
  "schedule": {
    "morning": [
      { "name": "Paracetamol", "dosage": "500mg", "time": "08:00", "note": "After breakfast, for fever and body pain", "category": "Viral Fever", "frequency": "daily" }
    ],
    "afternoon": [
      { "name": "Cetirizine", "dosage": "10mg", "time": "14:00", "note": "After lunch, for cold and runny nose", "category": "Viral Fever", "frequency": "daily" }
    ],
    "evening": [],
    "beforeBed": [
      { "name": "Paracetamol", "dosage": "500mg", "time": "21:00", "note": "Before bed if fever persists", "category": "Viral Fever", "frequency": "as_needed" }
    ]
  },
  "precautions": [
    { "category": "Viral Fever", "precaution": "Stay hydrated. Rest well. Monitor temperature every 4 hours. Visit doctor if fever exceeds 103°F or lasts more than 3 days." }
  ],
  "interactions": ["✅ No major interactions detected between suggested medicines."],
  "interactionWarning": null,
  "reasoning": [
    "Paracetamol: Used to reduce fever and relieve body aches — safest first-line medicine for viral fever.",
    "Cetirizine: Helps with cold symptoms like runny nose and sneezing common in viral infections."
  ],
  "disclaimer": "⚕️ This is informational only. Please consult your doctor before starting, stopping, or changing any medication."
}

Always return success: true and suggest appropriate medicines for whatever condition is described.
Only return success: false if the input is completely unrelated to health (e.g. random gibberish).`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create a medicine schedule for: ${input}` }
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const raw = completion.choices[0].message.content.trim();

  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  // Ensure interactions always has a message
  if (parsed.success && (!parsed.interactions || parsed.interactions.length === 0)) {
    parsed.interactions = ['✅ No major interactions detected between suggested medicines.'];
  }

  return parsed;
}

// ─── Route handler ─────────────────────────────────────────────────────────────
router.post('/suggest-schedule', auth, async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: 'Please describe your medicines or conditions' });

    const hasKey = process.env.GROQ_API_KEY &&
                   process.env.GROQ_API_KEY !== 'your-groq-api-key-here';

    if (hasKey) {
      try {
        // Always send to Groq — it handles ANY disease or condition
        const result = await groqSchedule(input);
        return res.json(result);
      } catch (aiErr) {
        console.error('Groq API error, falling back to rule-based engine:', aiErr.message);
        // Fall through to rule-based fallback
      }
    }

    // Fallback: rule-based engine (only used if no API key is set)
    return res.json(fallbackSchedule(input));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
