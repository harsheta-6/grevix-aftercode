import { useState, useEffect } from 'react'
import PriorityMap from './PriorityMap.jsx'
import WorkOrder from './WorkOrder.jsx'

const CAUSE_NAME = {
  drainage: 'Drainage Failure',
  edge_failure: 'Edge Breakdown',
  overloading: 'Overloading Wear',
  surface_wear: 'Surface Wear',
  none_detected: 'No Defect Detected',
}

const pretty = (s) => (s || '').replaceAll('_', ' ')

export default function App() {
  const [segments, setSegments] = useState([])
  const [rankedData, setRankedData] = useState(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)
  const [showWorkOrder, setShowWorkOrder] = useState(false)
  const [budget, setBudget] = useState(50000)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [recordedDate, setRecordedDate] = useState('')
  const [batch] = useState(() => crypto.randomUUID())

  // Initial load of processed segments
  useEffect(() => {
    let active = true
    fetch('/api/segments')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.segments) {
          setSegments(data.segments)
          if (data.segments.length > 0) {
            setSelectedSegmentId(data.segments[0].id)
          }
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Dynamic ranking recalculation on segment list or budget change
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
        // fail silently on background poll
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

    if (file.size === 0) {
      setError('The selected video file is empty (0 bytes).')
      e.target.value = ''
      return
    }

    setLoading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('video', file)
      form.append('last_modified', String(file.lastModified))
      form.append('batch', batch)
      if (recordedDate) form.append('recorded_date', recordedDate)

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setSegments((prev) => [...prev, data])
        setSelectedSegmentId(data.id)
      }
    } catch {
      setError('Could not connect to the backend server. Verify port 8000 is active.')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(id) {
    try {
      await fetch(`/api/segments/${id}`, { method: 'DELETE' })
    } catch {
      // ignore network err for optimistic delete
    }
    setSegments((prev) => prev.filter((s) => s.id !== id))
    if (selectedSegmentId === id) {
      const remaining = segments.filter((s) => s.id !== id)
      setSelectedSegmentId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  async function handleClearAll() {
    if (!window.confirm('Remove all segments from the current survey session?')) return
    try {
      await fetch('/api/segments', { method: 'DELETE' })
    } catch {
      // ignore
    }
    setSegments([])
    setSelectedSegmentId(null)
    setRankedData(null)
  }

  const selectedSegment = segments.find((s) => s.id === selectedSegmentId)
  const summary = rankedData?.summary

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '36px 24px', width: '100%' }}>
      {/* Clean Header */}
      <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Road Triage
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Video inspection & budget-ranked repair prioritisation.
          </p>
        </div>

        {segments.length > 0 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowWorkOrder(true)}
              style={{
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              📄 Contractor Work Order
            </button>
            <button
              onClick={handleClearAll}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 13,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Clear all ({segments.length})
            </button>
          </div>
        )}
      </header>

      {/* Control Bar: Upload & Budget Input */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 20,
        alignItems: 'center'
      }}>
        {/* File Upload Button */}
        <div>
          <label
            htmlFor="video-input"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: loading ? 'var(--text-muted)' : 'var(--primary)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Analysing video...' : 'Upload road clip'}
          </label>
          <input
            id="video-input"
            type="file"
            accept="video/*"
            onChange={handleUpload}
            disabled={loading}
            style={{ display: 'none' }}
          />
        </div>

        {/* Survey Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            Survey date:
          </label>
          <input
            type="date"
            value={recordedDate}
            onChange={(e) => setRecordedDate(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 13,
              background: 'var(--bg)',
              color: 'var(--text-main)'
            }}
          />
        </div>

        {/* Budget Setting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            Budget (₹):
          </label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            min="0"
            step="5000"
            style={{
              padding: '6px 10px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 13,
              width: 120,
              background: 'var(--bg)',
              fontWeight: 600,
              color: 'var(--text-main)'
            }}
          />
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fee2e2',
          borderRadius: 6,
          color: '#991b1b',
          fontSize: 13,
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {segments.length === 0 ? (
        /* Minimal Empty State */
        <div style={{
          border: '1px dashed var(--border)',
          borderRadius: 8,
          padding: '64px 24px',
          textAlign: 'center',
          background: 'var(--surface)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px', color: 'var(--text-main)' }}>
            No road clips added
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, maxWidth: 420, marginInline: 'auto' }}>
            Upload short 10–30 second dashcam or phone clips. Segments will automatically be diagnosed and prioritized by Benefit-Cost Ratio.
          </p>
        </div>
      ) : (
        <div>
          {/* Subtle Stats Row */}
          {summary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              marginBottom: 24
            }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Approved / Total</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>
                  {summary.approved_segments} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>/ {summary.total_segments} sections</span>
                </div>
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Cost Required</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>
                  ₹{summary.total_estimated_cost.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Allocated Spend</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2, color: summary.allocated_spend <= summary.total_budget ? '#15803d' : '#b91c1c' }}>
                  ₹{summary.allocated_spend.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Budget Remaining</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2, color: summary.remaining_budget >= 0 ? 'var(--text-main)' : '#b91c1c' }}>
                  ₹{summary.remaining_budget.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          )}

          {/* Map of Priority Segments */}
          <PriorityMap
            segments={rankedData?.ranked_list || segments}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={(id) => setSelectedSegmentId(id)}
          />

          {/* Ranked Table */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: 24
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px', width: 50, fontWeight: 500 }}>Rank</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Segment</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Condition</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Diagnosis</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500, textAlign: 'right' }}>Cost</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500, textAlign: 'right' }}>BCR</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '10px 14px', width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {(rankedData?.ranked_list || segments).map((item, idx) => {
                  const isSelected = item.id === selectedSegmentId
                  const cond = item.assessment?.overall_condition || 1
                  const isFunded = item.funded

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedSegmentId(item.id)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isSelected ? '#f8fafc' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.1s ease'
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        #{item.rank || idx + 1}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{item.filename}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-light)', fontFamily: 'var(--font-mono)' }}>{item.id}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 500,
                          background: cond >= 4 ? '#fef2f2' : cond >= 3 ? '#fffbeb' : '#f0fdf4',
                          color: cond >= 4 ? '#991b1b' : cond >= 3 ? '#92400e' : '#166534'
                        }}>
                          Grade {cond}/5
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-main)' }}>
                        <div>{CAUSE_NAME[item.diagnosis?.cause] || item.diagnosis?.cause}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rule {item.diagnosis?.rule}</div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                        ₹{item.cost?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--accent)', fontWeight: 500 }}>
                        {item.bcr}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: isFunded ? '#15803d' : item.status === 'no_action_needed' ? 'var(--text-muted)' : '#b91c1c'
                        }}>
                          {isFunded ? 'Approved' : item.status === 'no_action_needed' ? 'No action' : 'Exceeds budget'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(item.id)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-light)',
                            cursor: 'pointer',
                            fontSize: 14,
                            padding: '4px'
                          }}
                          title="Remove section"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Clean Segment Inspector Card */}
          {selectedSegment && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '20px 24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                    Details: {selectedSegment.filename}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    AI Confidence: {Math.round((selectedSegment.assessment?.confidence || 0) * 100)}% · 
                    Status: {selectedSegment.timestamp?.status || 'unverified'} date
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>₹{selectedSegment.cost?.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Estimated repair cost</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                {/* Recommended works */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Recommended Works Sequence
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                    {selectedSegment.diagnosis?.works_detail?.map((w, i) => (
                      <li key={i}>
                        <span style={{ fontWeight: 500 }}>{pretty(w.work)}</span>
                        {w.rate > 0 && <span style={{ color: 'var(--text-muted)' }}> — ₹{w.rate.toLocaleString('en-IN')} {w.unit}</span>}
                      </li>
                    ))}
                  </ol>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    Reason: {selectedSegment.diagnosis?.why}
                  </p>
                </div>

                {/* AI observations */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Visual Observations
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: 'var(--text-main)' }}>
                    {selectedSegment.assessment?.visible_evidence?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>

                  {selectedSegment.needs_recheck && (
                    <div style={{ marginTop: 12, fontSize: 12, color: '#92400e', background: '#fffbeb', padding: '6px 10px', borderRadius: 4 }}>
                      Note: Severe condition detected with unverified video date. Verify on-site prior to tender.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contractor One-Page Work Order Modal */}
      {showWorkOrder && rankedData && (
        <WorkOrder
          rankedData={rankedData}
          budget={budget}
          recordedDate={recordedDate}
          onClose={() => setShowWorkOrder(false)}
        />
      )}
    </div>
  )
}