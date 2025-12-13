import Link from "next/link";

export default function Page() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: 0 }}>Connected</h1>
      <p style={{ marginTop: 8 }}>
        Scaffold ready. Next: auth, feed, brief, and practice.
      </p>
      <p style={{ marginTop: 12 }}>
        <Link href="/feed">Go to Feed</Link>
      </p>
      <p style={{ marginTop: 12 }}>
        <Link href="/brief">Go to Today’s Brief</Link>
      </p>
      <p style={{ marginTop: 12 }}>
        <Link href="/login">Login</Link>
      </p>
      <p style={{ marginTop: 12 }}>
        <Link href="/practice">Practice</Link>
      </p>
      <p style={{ marginTop: 12 }}>
        <Link href="/learning-path">Learning Path</Link>
      </p>
      <p style={{ marginTop: 12 }}>
        <Link href="/mascot">Mascot Advisor</Link>
      </p>
    </main>
  );
}
