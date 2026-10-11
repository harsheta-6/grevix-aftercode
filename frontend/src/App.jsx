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

const TS_COLOR = { verified: '#16a34a', corrected: '#d97706', unverified: '#dc2626' }
const TS_NOTE = {
  timestamp_in_future: 'Camera clock is ahead of real time.',
  clock_reset_date: 'Camera clock looks reset to a default date.',
  recorded_after_file_was_written: 'Timestamp is later than the file itself.',
  conflicts_with_declared_date: 'Camera date disagrees with the date you entered.',
  user_declared_date: 'Date taken from what you entered.',
  batch_offset: 'Corrected using the clock error found on an earlier clip in this batch.',
  older_than_max_age: 'Clip is old. Enter the recording date to confirm.',
  no_timestamp_found: 'No timestamp found in this video.',
  timestamp_check_failed: 'Timestamp check failed; date not verified.',
  camera_sources_disagree: 'Metadata and file name disagree; the plausible one was used.',
}

function TimeBadge({ t, recheck }) {
  const fmt = (d) => new Date(d).toLocaleString('en-IN')
  const when = t.effective
    ? fmt(t.effective)
    : `Recording date unknown${t.latest_possible ? ` (no later than ${fmt(t.latest_possible)})` : ''}`
  const res = t.effective && t.resolution === 'day' ? ' (accurate to the day only)' : ''
  const reasons = [t.reason, ...t.notes].filter((r) => TS_NOTE[r])
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <span style={{ background: TS_COLOR[t.status], color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 14 }}>
        Date {t.status}
      </span>
      <span style={{ marginLeft: 12 }}>{when}{res}</span>
      {reasons.map((r) => <div key={r}><small>• {TS_NOTE[r]}</small></div>)}
      {recheck && <p style={{ color: '#b45309', marginBottom: 0 }}>
        ⚠ Severe condition but unverified date. Confirm the date or re-survey before scheduling.
      </p>}
    </div>
  )
}

const pretty = (s) => s.replaceAll('_', ' ')

function Result({ data }) {
  const { assessment: a, diagnosis: d } = data
  const flagged = a.confidence < 0.6 ||
    Object.values(a.observations).filter((v) => v === 'cannot_tell').length >= 3

  return (
    <div style={{ marginTop: 20, maxWidth: 640 }}>
    <TimeBadge t={data.timestamp} recheck={data.needs_recheck} />
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
  const [recorded, setRecorded] = useState('')
  const [batch] = useState(() => crypto.randomUUID())

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const form = new FormData()
      form.append('video', file)
      form.append('last_modified', String(file.lastModified))
      form.append('batch', batch)
      if (recorded) form.append('recorded_date', recorded)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (err) {
      setError('Upload failed.')
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