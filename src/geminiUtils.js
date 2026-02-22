const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export function isGeminiConfigured() {
  return Boolean(GEMINI_API_KEY);
}

function extractGeminiText(responseBody) {
  const parts = responseBody?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

export async function getGeminiCoachingTip({ playerName, weekRange, activityLines, leaderboardLines }) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini is not configured. Set VITE_GEMINI_API_KEY in your environment.');
  }

  const prompt = [
    'You are a concise fitness coach for a friendly 2-player competition.',
    `Player: ${playerName}`,
    `Current week: ${weekRange}`,
    'Activity totals:',
    ...activityLines,
    'Leaderboard snapshot:',
    ...leaderboardLines,
    'Write a short plan with: (1) one praise, (2) three action bullets for next 7 days, (3) one caution.',
    'Keep it under 130 words.',
  ].join('\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 240,
        },
      }),
    }
  );

  const body = await response.json();
  if (!response.ok) {
    const apiMessage = body?.error?.message || `Gemini request failed (${response.status})`;
    throw new Error(apiMessage);
  }

  const text = extractGeminiText(body);
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }
  return text;
}
