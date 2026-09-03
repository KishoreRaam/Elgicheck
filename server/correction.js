import { GoogleGenAI } from '@google/genai';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const TIMEOUT_MS = 3000;

let ai = null;
function client() {
  if (!ai) ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
}

function fallback(violation, payerName) {
  return `The ${violation.field} entered doesn't match ${payerName}'s expected format (${violation.expected}). Please verify this value with the patient's insurance card.`;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

export async function generateSuggestion(violation, payerName) {
  const prompt = `A patient eligibility check failed.
Payer: ${payerName}
Field: ${violation.field}
Rule violated: ${violation.rule_violated}
Expected format: ${violation.expected}
Actual value entered (this is the one that is wrong): ${violation.actual}

Write a 1-2 sentence instruction for front-desk staff explaining what's wrong with the actual value entered relative to the expected format, and what to verify. Be precise about which characters of the actual value violate the expected format — do not reverse which value is correct and which is wrong. Do NOT invent or state a corrected value — only describe the problem and tell staff to verify it against the patient's insurance card or records. No preamble, output the instruction only.`;

  try {
    const res = await withTimeout(
      client().models.generateContent({ model: MODEL, contents: prompt }),
      TIMEOUT_MS
    );
    const text = res.text?.trim();
    if (!text) throw new Error('empty response');
    return text;
  } catch (err) {
    console.error('generateSuggestion failed, using fallback:', err.message);
    return fallback(violation, payerName);
  }
}
