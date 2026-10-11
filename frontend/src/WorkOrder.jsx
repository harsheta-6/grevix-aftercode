const pretty = (s) => (s || '').replaceAll('_', ' ')

const CAUSE_NAME = {
  drainage: 'Drainage Failure',
  edge_failure: 'Edge Breakdown',
  overloading: 'Overloading Wear',
  surface_wear: 'Surface Wear',
  none_detected: 'No Defect Detected',
}

export default function WorkOrder({ rankedData, budget, recordedDate, onClose }) {
  if (!rankedData) return null

  const { ranked_list, summary } = rankedData
  const approvedList = ranked_list.filter((s) => s.funded)
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const seed = (summary.total_segments * 137 + Math.round(summary.allocated_spend)) % 9000 + 1000
  const workOrderNo = `WO-${new Date().getFullYear()}-${seed}`

  function handlePrint() {
    window.print()
  }

  return (
    <div className="work-order-modal" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16,
      overflowY: 'auto'
    }}>
      {/* Modal Actions / Outer Container */}
      <div style={{
        maxWidth: 820,
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        background: '#fff',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Modal Toolbar (hidden during print) */}
        <div className="no-print" style={{
          padding: '12px 20px',
          background: '#0f172a',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            One-Page Contractor Work Order Preview
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handlePrint}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#334155',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* The Printable One-Page Document */}
        <div className="printable-work-order" style={{
          padding: '32px 36px',
          background: '#fff',
          color: '#0f172a',
          fontFamily: 'var(--font-sans)',
          overflowY: 'auto',
          fontSize: 13,
          lineHeight: 1.45
        }}>
          {/* Header */}
          <div style={{
            borderBottom: '2px solid #0f172a',
            paddingBottom: 12,
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
                Public Works & Road Maintenance Division
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '2px 0 0', color: '#0f172a' }}>
                CONTRACTOR REPAIR WORK ORDER
              </h2>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                Prioritized Maintenance Schedule & Bill of Quantities (BoQ)
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: 12 }}>
              <div><b>Order No:</b> <span style={{ fontFamily: 'var(--font-mono)' }}>{workOrderNo}</span></div>
              <div><b>Date Issued:</b> {today}</div>
              {recordedDate && <div><b>Survey Date:</b> {recordedDate}</div>}
              <div><b>Budget Ceiling:</b> ₹{budget?.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Scope & Contract Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 16
          }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Approved Sections</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                {approvedList.length} <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>of {summary.total_segments}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Contract Value</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                ₹{summary.allocated_spend?.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Survey Corridor</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                Sector-A Carriageway
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Execution Window</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                14 Calendar Days
              </div>
            </div>
          </div>

          {/* Engineering Execution Directive */}
          <div style={{
            fontSize: 12,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 16,
            color: '#166534'
          }}>
            <b>Mandatory Sequence:</b> Drainage clearance and edge repairs (Rules R1 & R2) MUST be completed and inspected before asphalt resurfacing or pothole patching begins. Surfacing over waterlogged base is strictly prohibited.
          </div>

          {/* Schedule of Works Table */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Schedule of Approved Repair Works
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '6px 8px', width: 45, textAlign: 'center' }}>Rank</th>
                  <th style={{ padding: '6px 8px' }}>Road Segment / Video</th>
                  <th style={{ padding: '6px 8px' }}>Distress Cause</th>
                  <th style={{ padding: '6px 8px' }}>Required Works in Sequence</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: 90 }}>Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {approvedList.map((seg) => (
                  <tr key={seg.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>
                      #{seg.rank}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ fontWeight: 600 }}>{seg.filename}</div>
                      <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                        ID: {seg.id} {seg.coordinates && `(${seg.coordinates.lat}, ${seg.coordinates.lng})`}
                      </div>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ fontWeight: 500 }}>{CAUSE_NAME[seg.diagnosis?.cause] || seg.diagnosis?.cause}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Rule: {seg.diagnosis?.rule}</div>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <ol style={{ margin: 0, paddingLeft: 14 }}>
                        {seg.diagnosis?.works_detail?.map((w, idx) => (
                          <li key={idx} style={{ marginBottom: 2 }}>
                            <b>{pretty(w.work)}</b>
                            {w.rate > 0 && <span style={{ color: '#475569' }}> ({w.unit})</span>}
                          </li>
                        ))}
                      </ol>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      ₹{seg.cost?.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #0f172a', background: '#f8fafc' }}>
                  <td colSpan={4} style={{ padding: '8px', fontWeight: 700, textAlign: 'right' }}>
                    Total Approved Work Order Value:
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                    ₹{summary.allocated_spend?.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures & Approvals */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 20,
            marginTop: 28,
            paddingTop: 16,
            borderTop: '1px solid #cbd5e1'
          }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 32 }}>Inspected & Prepared by:</div>
              <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 4, fontWeight: 600, fontSize: 11 }}>
                Junior / Site Engineer
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 32 }}>Approved for Tender by:</div>
              <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 4, fontWeight: 600, fontSize: 11 }}>
                Executive Engineer (PWD / Municipality)
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 32 }}>Contractor Acceptance:</div>
              <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 4, fontWeight: 600, fontSize: 11 }}>
                Authorized Signatory & Date
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
