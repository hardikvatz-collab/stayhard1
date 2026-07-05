export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64, mediaType } = req.body || {};
  if (!base64) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = "Identify the food in this photo and estimate its nutrition. The person is vegetarian and does not eat eggs, so factor that into what you think the dish is. Respond with ONLY raw JSON, no markdown fences, no commentary, in exactly this shape: {\"name\": \"short dish description\", \"calories\": number, \"protein\": number, \"carbs\": number, \"fat\": number}. Numbers are grams for protein/carbs/fat and kcal for calories, estimated for the visible portion.";

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mediaType || 'image/jpeg', data: base64 } }
          ]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

    return res.status(200).json({
      name: parsed.name || 'Unknown food',
      calories: Math.round(parsed.calories || 0),
      protein: Math.round(parsed.protein || 0),
      carbs: Math.round(parsed.carbs || 0),
      fat: Math.round(parsed.fat || 0)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to analyze image: ' + err.message });
  }
}
