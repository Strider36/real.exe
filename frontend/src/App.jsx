import { useEffect, useState } from 'react'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    fetch('http://localhost:8000/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (active) setHealth(data)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-lg space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-white">REALITY.EXE</h1>
        <p className="text-slate-300">Stage 0 frontend scaffold</p>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm">
          <div className="text-slate-400 mb-1">Backend Health (/api/health)</div>
          {health ? (
            <p className="font-mono text-emerald-400">
              status: {health.status} | project: {health.project}
            </p>
          ) : error ? (
            <p className="font-mono text-rose-400">Error: {error}</p>
          ) : (
            <p className="font-mono text-amber-400">Checking backend...</p>
          )}
        </div>
      </div>
    </main>
  )
}

export default App
