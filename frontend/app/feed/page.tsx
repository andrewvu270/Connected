import { supabase } from "../../src/lib/supabaseClient";

export default async function FeedPage() {
  const { data, error } = await supabase
    .from("news_feed_cards")
    .select("id, category, card, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ margin: 0 }}>Feed</h1>
        <p style={{ marginTop: 8 }}>Error: {error.message}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: 0 }}>Feed</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Rolling updates (latest 50)
      </p>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {(data ?? []).map((row: any) => {
          const card = row.card as any;
          return (
            <article
              key={row.id}
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
                padding: 12
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {row.category}
              </div>
              <div style={{ fontWeight: 600, marginTop: 6 }}>
                {card?.title ?? "Untitled"}
              </div>
              <div style={{ marginTop: 8, opacity: 0.9 }}>
                {card?.what_happened ?? ""}
              </div>
              {Array.isArray(card?.sources) && card.sources[0]?.url ? (
                <a
                  href={card.sources[0].url}
                  style={{ display: "inline-block", marginTop: 10 }}
                >
                  Source
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}
