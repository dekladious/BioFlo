import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const input = [
      { role: "system", content: "You are BioFlo, a supportive, highly actionable biohacking coach. Be concise. Do not diagnose. Add: 'Educational only; not medical advice.' at the end." },
      ...(Array.isArray(messages) ? messages : []),
    ];

    const resp = await client.responses.create({
      model: "gpt-4o",             // switch to "gpt-5" when your account has access
      input,
      temperature: 0.7
    } as any);

    const out: any[] = (resp as any).output ?? [];
    const text =
      out.map((o:any) => o?.content?.[0]?.text).filter(Boolean).join("\n").trim()
      || "Sorry, I couldn't generate a response.";

    return Response.json({ text });
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), { status: 500 });
  }
}
