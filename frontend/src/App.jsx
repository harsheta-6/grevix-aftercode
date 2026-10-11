import { useState, useEffect } from 'react'

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
  if (!t) return null
  const fmt = (d) => new Date(d).toLocaleString('en-IN')
  const when = t.effective
    ? fmt(t.effective)
    : `Recording date unknown${t.latest_possible ? ` (no later than ${fmt(t.latest_possible)})` : ''}`
  const res = t.effective && t.resolution === 'day' ? ' (accurate to the day only)' : ''
  const reasons = [t.reason, ...(t.notes || [])].filter((r) => TS_NOTE[r])
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12, background: '#f8fafc' }}>
      <span style={{ background: TS_COLOR[t.status] || '#64748b', color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
        Date {t.status}
      </span>
      <span style={{ marginLeft: 12, fontSize: 14 }}>{when}{res}</span>
      {reasons.map((r) => <div key={r}><small style={{ color: '#64748b' }}>• {TS_NOTE[r]}</small></div>)}
      {recheck && <p style={{ color: '#b45309', marginBottom: 0, marginTop: 6, fontWeight: 500, fontSize: 13 }}>
        ⚠ Severe condition but unverified date. Confirm the date or re-survey before scheduling.
      </p>}
    </div>
  )
}

const pretty = (s) => (s || '').replaceAll('_', ' ')

function RankedWorkList({ rankedData, onRemoveSegment }) {
  if (!rankedData || !rankedData.ranked_list || rankedData.ranked_list.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
        <h4 style={{ margin: '0 0 8px', color: '#334155', fontSize: 18 }}>No Road Segments Added Yet</h4>
        <p style={{ color: '#64748b', maxWidth: 520, margin: '0 auto', fontSize: 14 }}>
          Upload your smartphone or dashcam road video clips using the form above. Once processed, your segments will automatically be analyzed, cost-estimated, and prioritized here based on highest Benefit-per-Cost.
        </p>
      </div>
    )
  }

  const { ranked_list, summary } = rankedData

  return (
    <div style={{ marginTop: 24 }}>
      {/* Summary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Segments</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{summary.total_segments}</div>
          <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2, fontWeight: 500 }}>
            {summary.approved_segments} funded / approved
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Estimated Need</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>₹{summary.total_estimated_cost.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>across all road sections</div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Allocated Spend</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: summary.allocated_spend <= (summary.total_budget || Infinity) ? '#16a34a' : '#dc2626' }}>
            ₹{summary.allocated_spend.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {summary.total_budget ? `of ₹${summary.total_budget.toLocaleString('en-IN')} budget` : 'unlimited budget'}
          </div>
        </div>

        {summary.total_budget !== null && summary.total_budget !== undefined && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Remaining Budget</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: summary.remaining_budget >= 0 ? '#16a34a' : '#dc2626' }}>
              ₹{summary.remaining_budget.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {summary.remaining_budget >= 0 ? 'Surplus unallocated' : 'Budget deficit'}
            </div>
          </div>
        )}
      </div>

      {/* Prioritization Guide */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
        💡 <b>Prioritization Logic:</b> Drainage fixes (Rule R1) and edge reinforcements (Rule R2) are given precedence over simple resurfacing to prevent repetitive failures. Segments are sorted by <b>BCR (Benefit-Cost Ratio)</b> so you fix the most urgent distress per Rupee spent.
      </div>

      {/* Ranked Work List Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 14px', width: 60, textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '12px 14px' }}>Segment / Video</th>
              <th style={{ padding: '12px 14px' }}>Condition</th>
              <th style={{ padding: '12px 14px' }}>Diagnosis</th>
              <th style={{ padding: '12px 14px' }}>Benefit Score</th>
              <th style={{ padding: '12px 14px' }}>Cost</th>
              <th style={{ padding: '12px 14px' }}>BCR</th>
              <th style={{ padding: '12px 14px' }}>Status</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {ranked_list.map((seg) => {
              const cond = seg.assessment?.overall_condition || 1
              const cause = seg.diagnosis?.cause || 'none_detected'
              const isApproved = seg.funded
              const statusBg = isApproved
                ? '#dcfce7'
                : seg.status === 'no_action_needed'
                ? '#f1f5f9'
                : '#fee2e2'
              const statusColor = isApproved
                ? '#166534'
                : seg.status === 'no_action_needed'
                ? '#475569'
                : '#991b1b'

              return (
                <tr key={seg.id} style={{ borderBottom: '1px solid #e2e8f0', background: isApproved ? '#fff' : '#fcfcfc' }}>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, fontSize: 16 }}>
                    #{seg.rank}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600 }}>{seg.filename}</div>
                    <small style={{ color: '#64748b' }}>ID: {seg.id}</small>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background: cond >= 4 ? '#fee2e2' : cond >= 3 ? '#fef3c7' : '#dcfce7',
                      color: cond >= 4 ? '#991b1b' : cond >= 3 ? '#92400e' : '#166534'
                    }}>
                      Level {cond}/5
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      background: CAUSE_COLOR[cause] || '#64748b',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      display: 'inline-block'
                    }}>
                      {CAUSE_LABEL[cause] || cause}
                    </span>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                      Rule: {seg.diagnosis?.rule}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                    {seg.benefit_score}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                    ₹{seg.cost?.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontWeight: 700, color: '#2563eb' }}>
                      {seg.bcr}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      background: statusBg,
                      color: statusColor,
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {seg.status === 'approved' ? '✓ Approved' : seg.status === 'budget_exceeded' ? '✕ Exceeds Budget' : 'No Action'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <button
                      onClick={() => onRemoveSegment(seg.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        color: '#dc2626',
                        fontSize: 12
                      }}
                      title="Remove segment"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Work Order Breakdown per Segment */}
      <h3 style={{ marginTop: 28, marginBottom: 12 }}>Detailed Work Breakdown for Approved Segments</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {ranked_list.filter(s => s.funded).map(seg => (
          <div key={seg.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                Rank #{seg.rank}: {seg.filename}
              </div>
              <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>₹{seg.cost?.toLocaleString('en-IN')}</span>
            </div>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>{seg.diagnosis?.why}</p>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Works in Sequence:</div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
              {seg.diagnosis?.works_detail?.map((w, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>
                  <b>{pretty(w.work)}</b> {w.rate > 0 && <>— ₹{w.rate.toLocaleString('en-IN')} {w.unit}</>}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResultDetail({ data }) {
  const { assessment: a, diagnosis: d } = data
  const flagged = a.confidence < 0.6 ||
    Object.values(a.observations).filter((v) => v === 'cannot_tell').length >= 3

  return (
    <div style={{ marginTop: 20, maxWidth: 640 }}>
      <TimeBadge t={data.timestamp} recheck={data.needs_recheck} />
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, background: '#fff' }}>
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
          <p style={{ color: '#b45309', marginTop: 8, marginBottom: 0 }}>
            ⚠ Low confidence or unclear frames. Please check this segment manually.
          </p>
        )}

        <h3 style={{ marginBottom: 4, marginTop: 14 }}>Why</h3>
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
          <summary style={{ cursor: 'pointer', color: '#2563eb' }}>Raw observations</summary>
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
          <p style={{ marginTop: 8 }}><small>Image issues: {a.image_quality_issues.join(', ')}</small></p>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [segments, setSegments] = useState([])
  const [rankedData, setRankedData] = useState(null)
  const [activeTab, setActiveTab] = useState('ranking') // 'ranking' | 'latest'
  const [latestResult, setLatestResult] = useState(null)
  const [budget, setBudget] = useState(50000)
  const [loading, setLoading] = useState(false)
  const [uploadProgressText, setUploadProgressText] = useState('')
  const [errorDetails, setErrorDetails] = useState(null) // { title, message, suggestion }
  const [recorded, setRecorded] = useState('')
  const [batch] = useState(() => crypto.randomUUID())

  // Load existing segments on mount
  useEffect(() => {
    let ignore = false
    fetch('/api/segments')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.segments) {
          setSegments(data.segments)
        }
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  // Recalculate ranking when segments or budget changes
  useEffect(() => {
    let active = true
    async function updateRanking() {
      if (segments.length === 0) {
        if (active) setRankedData(null)
        return
      }
      try {
        const res = await fetch('/api/rank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segments, budget }),
        })
        const data = await res.json()
        if (active) setRankedData(data)
      } catch {
        // Failed to rank
      }
    }
    updateRanking()
    return () => {
      active = false
    }
  }, [segments, budget])

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    // Pre-validation checks on client
    if (file.size === 0) {
      setErrorDetails({
        title: 'Empty File Selected',
        message: `The selected file "${file.name}" is 0 bytes.`,
        suggestion: 'Please verify the video was transferred and recorded completely before uploading.'
      })
      e.target.value = ''
      return
    }

    if (file.size > 250 * 1024 * 1024) {
      setErrorDetails({
        title: 'Video Exceeds Recommended Size',
        message: `Selected file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Files over 250 MB may exceed browser upload limits.`,
        suggestion: 'For optimal analysis, short 10-to-60 second clips of specific road stretches are recommended.'
      })
      e.target.value = ''
      return
    }

    setLoading(true)
    setErrorDetails(null)
    setUploadProgressText('Uploading video clip to server...')

    try {
      const form = new FormData()
      form.append('video', file)
      form.append('last_modified', String(file.lastModified))
      form.append('batch', batch)
      if (recorded) form.append('recorded_date', recorded)
      
      setUploadProgressText('Extracting frames and running AI road diagnosis...')
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Server returned HTTP ${res.status}: ${errText || res.statusText}`)
      }

      const data = await res.json()
      
      if (data.error) {
        setErrorDetails({
          title: 'Video Processing Error',
          message: data.error,
          suggestion: 'Ensure the video is playable, contains clear footage of the carriageway, and is in MP4, MOV, WebM, or AVI format.'
        })
      } else {
        setLatestResult(data)
        setSegments((prev) => [...prev, data])
        setActiveTab('ranking')
      }
    } catch (err) {
      setErrorDetails({
        title: 'Upload Failed',
        message: err.message || 'Network connection failed or backend server unreachable.',
        suggestion: 'Please check that the backend FastAPI server is running on port 8000 and that your network connection is stable.'
      })
    } finally {
      setLoading(false)
      setUploadProgressText('')
      // reset file input
      e.target.value = ''
    }
  }

  async function handleRemoveSegment(id) {
    try {
      await fetch(`/api/segments/${id}`, { method: 'DELETE' })
      const updated = segments.filter((s) => s.id !== id)
      setSegments(updated)
      if (latestResult && latestResult.id === id) {
        setLatestResult(null)
      }
    } catch {
      setSegments(segments.filter((s) => s.id !== id))
    }
  }

  async function handleClearAll() {
    if (!window.confirm('Clear all segments from list?')) return
    try {
      await fetch('/api/segments', { method: 'DELETE' })
    } catch {
      // ignore
    }
    setSegments([])
    setLatestResult(null)
    setRankedData(null)
  }

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'sans-serif', maxWidth: 1100, margin: '0 auto', textAlign: 'left' }}>
      
      {/* Purpose & Overview Header */}
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>🛣️</span>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#0f172a' }}>
            Road Triage & Prioritized Repair Planner
          </h1>
        </div>
        <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.6, margin: '0 0 16px' }}>
          A decision-support system for municipal and rural road engineers. Upload smartphone or dashcam video clips of damaged road sections to get automated AI damage assessment, root cause diagnosis, and a budget-optimized <b>Ranked Work List</b> based on public works cost rates.
        </p>

        {/* Informative Guidance Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
          marginTop: 16
        }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>
              📹 1. What to Upload
            </div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Short dashcam or phone video clips (10–60 seconds, <b>MP4 / MOV / AVI / WebM</b>) taken from a vehicle facing the road surface.
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>
              🤖 2. How Analysis Works
            </div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Key frames are extracted and inspected by AI for potholes, cracking, edge breakdown, and blocked drains to determine the primary cause.
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>
              💰 3. Budget Prioritization
            </div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Segments are ranked using <b>Benefit-Cost Ratio (BCR)</b>. Fixes with the highest long-term structural impact (drainage before paving) are funded first.
            </div>
          </div>
        </div>
      </header>

      {/* Upload & Budget Configuration Panel */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: 12,
        padding: 22,
        marginBottom: 24,
      }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 18, color: '#1e293b' }}>
          📤 Add Road Segment & Set Budget
        </h3>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          alignItems: 'flex-end'
        }}>
          <div style={{ flex: '1 1 260px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#334155' }}>
              Select Road Video Clip:
            </label>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/*"
              onChange={handleUpload}
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: 14
              }}
            />
            <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>
              Supported formats: MP4, MOV, WebM, AVI (max 250 MB recommended)
            </small>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#334155' }}>
              Survey Recording Date (Optional):
            </label>
            <input
              type="date"
              value={recorded}
              onChange={(e) => setRecorded(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, background: '#fff' }}
            />
            <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>
              Helps calibrate dashcams with reset clocks
            </small>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#334155' }}>
              Total Budget (₹):
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              min="0"
              step="5000"
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, width: 140, background: '#fff' }}
            />
            <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>
              Auto-allocates across network
            </small>
          </div>

          {segments.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{
                padding: '9px 16px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#dc2626',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13,
                marginBottom: 20
              }}
            >
              Clear All ({segments.length})
            </button>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div style={{
          padding: 18,
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          color: '#1d4ed8',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div>
            <div style={{ fontWeight: 600 }}>Processing Video...</div>
            <div style={{ fontSize: 13, color: '#2563eb', marginTop: 2 }}>
              {uploadProgressText || 'Extracting frames and running AI road diagnosis...'}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Informative Error Message Box */}
      {errorDetails && (
        <div style={{
          padding: 18,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#991b1b',
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            <span>⚠️</span> {errorDetails.title}
          </div>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#7f1d1d' }}>
            {errorDetails.message}
          </p>
          {errorDetails.suggestion && (
            <div style={{ fontSize: 13, color: '#b91c1c', background: '#fee2e2', padding: '6px 10px', borderRadius: 6 }}>
              💡 <b>Tip:</b> {errorDetails.suggestion}
            </div>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('ranking')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'ranking' ? '3px solid #2563eb' : '3px solid transparent',
            background: 'none',
            fontWeight: 600,
            color: activeTab === 'ranking' ? '#2563eb' : '#64748b',
            cursor: 'pointer',
            fontSize: 15
          }}
        >
          📋 Ranked Work List ({segments.length})
        </button>

        {latestResult && (
          <button
            onClick={() => setActiveTab('latest')}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === 'latest' ? '3px solid #2563eb' : '3px solid transparent',
              background: 'none',
              fontWeight: 600,
              color: activeTab === 'latest' ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              fontSize: 15
            }}
          >
            🔍 Latest Segment Inspection
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'ranking' && (
        <RankedWorkList
          rankedData={rankedData}
          onRemoveSegment={handleRemoveSegment}
        />
      )}

      {activeTab === 'latest' && latestResult && (
        <ResultDetail data={latestResult} />
      )}
    </div>
  )
}