function Skel({ height, width = '100%', radius = 'var(--radius)' }: { height: number | string; width?: number | string; radius?: string }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius }} />
}

export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg0)' }}>
      {/* Sidebar skeleton */}
      <aside style={{
        width: 64, background: 'var(--bg1)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '20px 0', gap: 8, flexShrink: 0,
      }}>
        <Skel height={32} width={32} radius="8px" />
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skel key={i} height={40} width={40} radius="8px" />
          ))}
        </div>
      </aside>

      <main style={{ flex: 1, padding: '32px 32px 56px', minWidth: 0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Header skeleton */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, gap: 20 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <Skel height={28} width={280} />
              <Skel height={14} width={360} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Skel height={20} width={140} />
              <Skel height={28} width={80} radius="999px" />
            </div>
          </div>

          {/* Row 1: 3 cols */}
          <section style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr 0.9fr', gap: 16, marginBottom: 16 }} className="db-row1">
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28 }}>
              <div style={{ display: 'grid', gap: 14 }}>
                <Skel height={14} width={120} />
                <Skel height={56} width={180} />
                <Skel height={14} width={220} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Skel height={38} width="50%" />
                  <Skel height={38} width="30%" />
                </div>
                <Skel height={10} radius="999px" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <Skel height={56} />
                  <Skel height={56} />
                  <Skel height={56} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Skel height={104} radius="var(--radius-lg)" />
                <Skel height={104} radius="var(--radius-lg)" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Skel height={104} radius="var(--radius-lg)" />
                <Skel height={104} radius="var(--radius-lg)" />
              </div>
            </div>

            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
              <Skel height={14} width={100} />
              <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                <Skel height={100} width={100} radius="50%" />
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skel key={i} height={20} />
                ))}
              </div>
            </div>
          </section>

          {/* Row 2: table + monitor */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, marginBottom: 16 }} className="db-row2">
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <div style={{ marginBottom: 18 }}>
                <Skel height={14} width={90} />
                <div style={{ marginTop: 8 }}><Skel height={20} width={180} /></div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skel key={i} height={36} />
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <Skel height={14} width={100} />
              <div style={{ marginTop: 16 }}><Skel height={240} /></div>
            </div>
          </section>

          {/* Row 3: 2 cols */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Skel height={280} radius="var(--radius-lg)" />
            <Skel height={280} radius="var(--radius-lg)" />
          </section>

          {/* CTA banner */}
          <Skel height={110} radius="var(--radius-lg)" />
          <div style={{ height: 16 }} />

          {/* Bottom */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Skel height={150} radius="var(--radius-lg)" />
            <Skel height={150} radius="var(--radius-lg)" />
          </section>
        </div>
      </main>
    </div>
  )
}
