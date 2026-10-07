// Supabase Edge Function: writes a one-sentence "why you matched" for a squad with Claude.
//
// Privacy: Claude only sees anonymous labels ("Student A"), degree, year, hobbies,
// courses and each person's own "in your words" line — never names or emails.
// The caller must be a member of the squad (checked in get_ai_context via their JWT).
//
// Deploy (Supabase dashboard → Edge Functions → Deploy new function → name "match-reason"),
// then add the secret ANTHROPIC_API_KEY (Edge Functions → Secrets).
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `You write the one-sentence "why you matched" line for Pool, an app that puts shy UNSW students into small study/hobby squads.
Write ONE warm, specific sentence (max 28 words) that tells the squad what they have in common, drawing on how they describe themselves in their own words.
Rules: refer to people as "you all" or "you both" (never by label), no names, no emojis, no hashtags, no quotation marks, don't invent facts, don't mention ratings or AI. Output only the sentence.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { squad_id } = await req.json();
    if (!squad_id) return json({ error: "squad_id required" }, 400);

    // Act as the signed-in user so membership/privacy rules apply.
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: ctx, error } = await supabase.rpc("get_ai_context", { p_squad: squad_id });
    if (error) return json({ error: error.message }, 403);
    if (ctx.ai_reason) return json({ reason: ctx.ai_reason });

    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const response = await client.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(ctx) }],
    });

    if (response.stop_reason === "refusal") return json({ error: "declined" }, 422);
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!text) return json({ error: "empty" }, 502);

    const { data: saved, error: saveError } = await supabase.rpc("set_ai_reason", { p_squad: squad_id, p_text: text });
    if (saveError) return json({ error: saveError.message }, 500);
    return json({ reason: saved });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "ANTHROPIC_API_KEY missing or invalid" }, 500);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "rate limited" }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `Claude API error ${e.status}` }, 502);
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }
});
