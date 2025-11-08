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

    // === Standardized prompt (copy exactly) ===
    const prompt = `
Write a polished, professional, and client-ready summary of this legal candidate. These writeups should be honest but at the same time are made to get interest from hiring managers. Writeups can never have information about race, gender, religion, etc.
Match the tone and structure of the following example:

"Certified corporate paralegal and executive assistant with a proven track record of working directly with senior tech executives and managing partners at international law firms. Adept in legal document management and the implementation of innovative legal solutions. Highly skilled in utilizing a multitude of software programs and facilitating effective cross-team coordination, significantly enhancing operational efficiency. Expertise in legal research and contract management, demonstrating exceptional attention to detail and problem-solving abilities, with a background also in Artificial Intelligence."

Guidelines:
• 4–5 sentences total.
• Focus on professional credibility, skills, and achievements.
• Do NOT include headers or labels like “Summary:”.
• Use confident, recruiter-style language — avoid clichés and filler.
• Keep it objective, concise, and tailored for a client presentation.

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
          {
            role: 'system',
            content:
              'You are a senior recruiter writing professional, client-ready summaries for legal candidates.'
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3, // consistent tone
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
    const text =
      data?.choices?.[0]?.message?.content?.trim()?.replace(/\s+$/,'') || '';

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
