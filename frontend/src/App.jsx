import { useState } from 'react'

export default function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    const form = new FormData()
    form.append('video', file)
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    setResult(await res.json())
    setLoading(false)
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Road Triage</h1>
      <input type="file" accept="video/*" onChange={handleUpload} />
      {loading && <p>Processing...</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  )
}