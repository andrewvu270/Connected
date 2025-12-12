export default function Page() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: 0 }}>Connected</h1>
      <p style={{ marginTop: 8 }}>
        Scaffold ready. Next: auth, feed, brief, and practice.
      </p>
      <p style={{ marginTop: 12 }}>
        <a href="/feed">Go to Feed</a>
      </p>
      <p style={{ marginTop: 12 }}>
        <a href="/brief">Go to Today’s Brief</a>
      </p>
      <p style={{ marginTop: 12 }}>
        <a href="/login">Login</a>
      </p>
      <p style={{ marginTop: 12 }}>
        <a href="/practice">Practice</a>
      </p>
    </main>
  );
}
