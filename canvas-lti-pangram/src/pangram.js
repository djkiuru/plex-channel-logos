// Thin client for Pangram's v3 text endpoint. https://docs.pangram.com/api-reference/ai-detection
const URL_ = 'https://text.api.pangram.com/v3';

async function detect(text) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { 'x-api-key': process.env.PANGRAM_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(`Pangram ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return {
    fractionAi: j.fraction_ai, fractionAssisted: j.fraction_ai_assisted, fractionHuman: j.fraction_human,
    windows: j.windows || []
  };
}
module.exports = { detect };
