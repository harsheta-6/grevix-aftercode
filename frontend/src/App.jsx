import { useState } from 'react'

const CAUSE_LABEL = {
  drainage: 'Drainage failure',
  edge_failure: 'Edge failure',
  overloading: 'Possible overloading',
  surface_wear: 'Surface wear',
  none_detected: 'No problem detected',
}

const CAUSE_COLOR = {
  drainage: '#1d6fd1',
  edge_failure: '#d97706',
  overloading: '#7c3aed',
  surface_wear: '#6b7280',
  none_detected: '#16a34a',
}

const pretty = (s) => s.replaceAll('_', ' ')

function Result({ data }) {
  const { assessment: a, diagnosis: d } = data
  const flagged = a.confidence < 0.6 ||
    Object.values(a.observations).filter((v) => v === 'cannot_tell').length >= 3

  return (
    <div style={{ marginTop: 20, maxWidth: 640 }}>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <span style={{
          background: CAUSE_COLOR[d.cause], color: '#fff',
          padding: '3px 10px', borderRadius: 12, fontSize: 14,
        }}>
          {CAUSE_LABEL[d.cause] || d.cause}
        </span>
        <span style={{ marginLeft: 12, color: '#555' }}>
          Condition {a.overall_condition}/5 · AI confidence {Math.round(a.confidence * 100)}%
        </span>

        {flagged && (
          <p style={{ color: '#b45309', marginBottom: 0 }}>
            ⚠ Low confidence or unclear frames. Please check this segment manually.
          </p>
        )}

        <h3 style={{ marginBottom: 4 }}>Why</h3>
        <p style={{ marginTop: 0 }}>{d.why} <small>(rule {d.rule})</small></p>

        <h3 style={{ marginBottom: 4 }}>Recommended works (in order)</h3>
        <ol style={{ marginTop: 0 }}>
          {d.works_detail.map((w, i) => (
            <li key={i}>
              {pretty(w.work)}
              {w.rate > 0 && <> — Rs {w.rate.toLocaleString('en-IN')} {w.unit}</>}
            </li>
          ))}
        </ol>

        <h3 style={{ marginBottom: 4 }}>What the AI saw</h3>
        <ul style={{ marginTop: 0 }}>
          {a.visible_evidence.map((e, i) => <li key={i}>{e}</li>)}
        </ul>

        <details>
          <summary>Raw observations</summary>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {Object.entries(a.observations).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ paddingRight: 16 }}>{pretty(k)}</td>
                  <td><b>{pretty(v)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>

        {a.image_quality_issues.length > 0 && (
          <p><small>Image issues: {a.image_quality_issues.join(', ')}</small></p>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const form = new FormData()
      form.append('video', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (err) {
      setError('Upload failed. Is the backend running?')
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Road Triage</h1>
      <input type="file" accept="video/*" onChange={handleUpload} />
      {loading && <p>Analysing frames...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {result && <Result data={result} />}
    </div>
  )
}