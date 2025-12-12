import { supabase } from "../../src/lib/supabaseClient";

export default async function BriefPage() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("news_daily_briefs")
    .select("brief")
    .eq("brief_date", today)
    .eq("audience", "global")
    .limit(1)
    .maybeSingle();

  if (error) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ margin: 0 }}>Today’s Brief</h1>
        <p style={{ marginTop: 8 }}>Error: {error.message}</p>
      </main>
    );
  }

  const brief = (data as any)?.brief;
  const items = Array.isArray(brief?.items) ? brief.items : [];

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: 0 }}>Today’s Brief</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        {brief?.overview ?? ""}
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {items.map((it: any, idx: number) => (
          <article
            key={idx}
            style={{
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 12,
              padding: 12
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>{it.category}</div>
            <div style={{ fontWeight: 600, marginTop: 6 }}>{it.title}</div>
            <div style={{ marginTop: 8, opacity: 0.9 }}>{it.what_happened}</div>
          </article>
        ))}
      </div>
    </main>
  );
}
