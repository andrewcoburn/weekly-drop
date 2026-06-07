export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-cream-50">
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-honey-600 shadow-lg shadow-honey-600/30 mb-4">
            <span className="text-3xl">📸</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-bark-900">Weekly Drop</h1>
          <p className="text-stone-warm-500 mt-1.5 text-sm leading-relaxed">
            Drop a memory every week.<br />The magic happens at deadline.
          </p>
        </div>
        {children}
      </div>
    </main>
  )
}
