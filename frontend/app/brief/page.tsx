export default async function BriefPage() {
  const aiUrl = process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000";
  const res = await fetch(`${aiUrl}/news/brief?audience=global`, { cache: "no-store" });
  if (!res.ok) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ margin: 0 }}>Today’s Brief</h1>
        <p style={{ marginTop: 8 }}>Error: {res.status}</p>
      </main>
    );
  }

  const json = (await res.json()) as { brief?: any };
  const brief = json?.brief;
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
