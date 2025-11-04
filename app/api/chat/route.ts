import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are BioFlo, a supportive, highly actionable biohacking coach. Be concise. Do not diagnose. Add: 'Educational only; not medical advice.' at the end." },
        ...(Array.isArray(messages) ? messages : []),
      ],
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return Response.json({ text });
  } catch (e: any) {
    console.error("Chat API error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), { status: 500 });
  }
}
