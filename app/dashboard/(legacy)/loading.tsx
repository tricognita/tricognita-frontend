export default function DashboardLoading() {
  return (
    <div
      className="min-h-screen p-8 space-y-8 animate-pulse"
      style={{ background: "var(--ink)", color: "var(--stone-50)" }}
    >
      {/* Title block */}
      <header className="flex flex-col gap-6">
        <div>
          <div
            className="h-8 w-64 rounded mb-2"
            style={{ background: "var(--moss-hi)" }}
          />
          <div
            className="h-4 w-96 rounded"
            style={{ background: "var(--moss-rise)" }}
          />
        </div>
      </header>

      {/* Card skeleton grid */}
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-6 rounded-[var(--radius)] border space-y-4"
            style={{
              borderColor: "var(--sage-soft)",
              background: "var(--moss-rise)",
            }}
          >
            {/* Icon + title row */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg"
                style={{ background: "var(--moss-hi)" }}
              />
              <div className="flex-1">
                <div
                  className="h-4 w-32 rounded mb-1.5"
                  style={{ background: "var(--moss-hi)" }}
                />
                <div
                  className="h-3 w-20 rounded"
                  style={{ background: "var(--moss-rise)" }}
                />
              </div>
            </div>
            {/* Body lines */}
            <div className="space-y-2 mt-4">
              <div
                className="h-3 w-full rounded"
                style={{ background: "var(--moss-rise)", opacity: 0.7 }}
              />
              <div
                className="h-3 w-5/6 rounded"
                style={{ background: "var(--moss-rise)", opacity: 0.7 }}
              />
              <div
                className="h-3 w-4/6 rounded"
                style={{ background: "var(--moss-rise)", opacity: 0.6 }}
              />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
