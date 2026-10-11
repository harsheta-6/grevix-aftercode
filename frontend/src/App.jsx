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
      <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
        <p style={{ color: '#64748b' }}>No segments analyzed yet. Upload video clips to generate the ranked work list.</p>
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
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Segments</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{summary.total_segments}</div>
          <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>{summary.approved_segments} funded / approved</div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Estimated Cost</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>₹{summary.total_estimated_cost.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>across all segments</div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Allocated Spend</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: summary.allocated_spend <= (summary.total_budget || Infinity) ? '#16a34a' : '#dc2626' }}>
            ₹{summary.allocated_spend.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {summary.total_budget ? `out of ₹${summary.total_budget.toLocaleString('en-IN')} budget` : 'unlimited budget'}
          </div>
        </div>

        {summary.total_budget && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Remaining Budget</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: summary.remaining_budget >= 0 ? '#16a34a' : '#dc2626' }}>
              ₹{summary.remaining_budget.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {summary.remaining_budget >= 0 ? 'surplus available' : 'budget deficit'}
            </div>
          </div>
        )}
      </div>

      {/* Ranked Work List Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 14px', width: 60, textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '12px 14px' }}>Segment / Video</th>
              <th style={{ padding: '12px 14px' }}>Condition</th>
              <th style={{ padding: '12px 14px' }}>Diagnosis</th>
              <th style={{ padding: '12px 14px' }}>Benefit Score</th>
              <th style={{ padding: '12px 14px' }}>Cost</th>
              <th style={{ padding: '12px 14px' }}>Benefit/Cost (BCR)</th>
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
                <tr key={seg.id} style={{ borderBottom: '1px solid #e2e8f0', background: isApproved ? '#fff' : '#fafafa' }}>
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
  const [error, setError] = useState(null)
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
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('video', file)
      form.append('last_modified', String(file.lastModified))
      form.append('batch', batch)
      if (recorded) form.append('recorded_date', recorded)
      
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setLatestResult(data)
        setSegments((prev) => [...prev, data])
        setActiveTab('ranking')
      }
    } catch {
      setError('Upload failed. Check if backend is running on port 8000.')
    } finally {
      setLoading(false)
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
      // fallback local update
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
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 1080, margin: '0 auto', textAlign: 'left' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 32 }}>Road Triage & Ranked Work List</h1>
        <p style={{ color: '#64748b', fontSize: 16, margin: 0 }}>
          AI-powered road condition assessment and transparent benefit-per-cost budget prioritization.
        </p>
      </header>

      {/* Upload & Budget Configuration Panel */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 20,
        marginBottom: 24,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 20,
        alignItems: 'flex-end'
      }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
            Upload Road Video:
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={handleUpload}
            disabled={loading}
            style={{ fontSize: 14 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
            Recorded Date (Optional):
          </label>
          <input
            type="date"
            value={recorded}
            onChange={(e) => setRecorded(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
            Total Maintenance Budget (₹):
          </label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            min="0"
            step="5000"
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, width: 140 }}
          />
        </div>

        {segments.length > 0 && (
          <button
            onClick={handleClearAll}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#dc2626',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Clear All Segments
          </button>
        )}
      </div>

      {loading && (
        <div style={{ padding: 16, background: '#eff6ff', borderRadius: 8, color: '#1d4ed8', marginBottom: 16 }}>
          ⏳ Analysing video frames and calculating cost-benefit ranking...
        </div>
      )}

      {error && (
        <div style={{ padding: 16, background: '#fee2e2', borderRadius: 8, color: '#b91c1c', marginBottom: 16 }}>
          ✕ {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab('ranking')}
          style={{
            padding: '10px 16px',
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
              padding: '10px 16px',
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