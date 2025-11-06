// app/api/writeup/route.js
export async function POST(req) {
  try {
    const { candidate } = await req.json();

    if (!candidate || !candidate.name) {
      return new Response(
        JSON.stringify({ message: 'Missing candidate data' }),
        { status: 400 }
      );
    }

    const prompt = `
Write a concise, recruiter-style summary of this legal candidate for a client.
Include practice area, experience, and relevant highlights.
Candidate details:
${JSON.stringify(candidate, null, 2)}
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert legal recruiter writing client-ready summaries.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('OpenAI error:', text);
      return new Response(
        JSON.stringify({ message: `OpenAI API error: ${response.statusText}` }),
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || '';

    return new Response(JSON.stringify({ result: text }), { status: 200 });
  } catch (err) {
    console.error('Route error:', err);
    return new Response(
      JSON.stringify({ message: err?.message || 'Server error' }),
      { status: 500 }
    );
  }
}

// Simple GET handler to confirm the route loads (optional)
export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, route: 'writeup', method: 'GET' }),
    { status: 200 }
  );
}
