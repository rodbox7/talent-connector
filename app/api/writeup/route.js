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
You are a senior legal recruiter at a top national staffing firm.
Write a concise, client-facing summary of a candidate in 1–2 short paragraphs.

Tone:
- Professional but approachable
- Focused on value to the client
- Avoid fluff and buzzwords
- Avoid any languaage the talks about race, religion, age or other protected categories

Here is an example of the exact style and structure I want:

Example Candidate Data:
- Title: Senior Commercial Litigation Attorney
- Location: New York, NY
- Experience: 12+ years
- Background: AmLaw 50 and boutique firm experience; first-chair trial work; manages teams on large-scale document review; comfortable in fast-paced environments.
- Key Skills: Commercial litigation, case strategy, team leadership, client communication, motion practice.

Example Write-Up (TARGET STYLE):
"New York attorney with 12 plus years of relevant practice experience. Most recently, they functioned as Compliance Counsel with CMB Regional Centers in New York and have held roles ranging from Senior Counsel to Associate General Counsel. Most comfortable working on commercial contracts (NDAs, MSAs, vendor agreements, SOWs, etc.), compliance matters, real estate leases, operating agreements, and regulatory concerns. In their Mortgage Services position, they improved their contract review processes by establishing a risk tolerance index, which reduced average turnaround times from 30 days to 5-7 days. They also spent time at CMB developing training materials on critical contract terms and coordinating with SMEs on compliance obligations."

Now, using the SAME tone and structure as the Example Write-Up above,
write a summary for this candidate:

Candidate Data:
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
