import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'

const CAUSE_NAME = {
  drainage: 'Drainage Failure',
  edge_failure: 'Edge Breakdown',
  overloading: 'Overloading Wear',
  surface_wear: 'Surface Wear',
  none_detected: 'No Defect Detected',
}

// Helper component to center and fit bounds when selected segment or segment list changes
function MapController({ selectedCoords, allCoords }) {
  const map = useMap()

  useEffect(() => {
    if (selectedCoords && selectedCoords.lat && selectedCoords.lng) {
      map.setView([selectedCoords.lat, selectedCoords.lng], 15, { animate: true })
    } else if (allCoords && allCoords.length > 0) {
      if (allCoords.length === 1) {
        map.setView([allCoords[0].lat, allCoords[0].lng], 14)
      } else {
        const bounds = allCoords.map((c) => [c.lat, c.lng])
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
      }
    }
  }, [selectedCoords, allCoords, map])

  return null
}

export default function PriorityMap({ segments, selectedSegmentId, onSelectSegment }) {
  if (!segments || segments.length === 0) return null

  // Ensure every segment has coordinates (fallback if missing)
  const segmentsWithCoords = segments.map((seg, idx) => {
    const lat = seg.coordinates?.lat || (12.9716 + idx * 0.005)
    const lng = seg.coordinates?.lng || (77.5946 + idx * 0.007)
    return {
      ...seg,
      coordinates: { lat, lng }
    }
  })

  const selectedSegment = segmentsWithCoords.find((s) => s.id === selectedSegmentId)
  const defaultCenter = selectedSegment?.coordinates || segmentsWithCoords[0].coordinates

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* Map Header / Legend */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        background: 'var(--bg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
            Priority Segment Map
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            ({segmentsWithCoords.length} surveyed sections)
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            <span>Approved / High BCR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
            <span>Exceeds Budget</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
            <span>No Action</span>
          </div>
        </div>
      </div>

      {/* Leaflet Map Container */}
      <div style={{ height: 360, width: '100%', position: 'relative' }}>
        <MapContainer
          center={[defaultCenter.lat, defaultCenter.lng]}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController
            selectedCoords={selectedSegment?.coordinates}
            allCoords={segmentsWithCoords.map((s) => s.coordinates)}
          />

          {segmentsWithCoords.map((seg) => {
            const isSelected = seg.id === selectedSegmentId
            const isFunded = seg.funded
            const isNoAction = seg.status === 'no_action_needed'
            
            // Color based on funding priority status
            const color = isFunded
              ? '#16a34a'
              : isNoAction
              ? '#94a3b8'
              : '#dc2626'

            return (
              <CircleMarker
                key={seg.id}
                center={[seg.coordinates.lat, seg.coordinates.lng]}
                radius={isSelected ? 10 : 7}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: isSelected ? 0.95 : 0.75,
                  color: isSelected ? '#0f172a' : '#ffffff',
                  weight: isSelected ? 3 : 1.5,
                }}
                eventHandlers={{
                  click: () => onSelectSegment(seg.id),
                }}
              >
                <Popup>
                  <div style={{ fontSize: 12, lineHeight: 1.5, minWidth: 160 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                      #{seg.rank || '-'} {seg.filename}
                    </div>
                    <div><b>Condition:</b> Level {seg.assessment?.overall_condition || 1}/5</div>
                    <div><b>Diagnosis:</b> {CAUSE_NAME[seg.diagnosis?.cause] || seg.diagnosis?.cause}</div>
                    <div><b>Estimated Cost:</b> ₹{seg.cost?.toLocaleString('en-IN')}</div>
                    <div><b>BCR:</b> {seg.bcr}</div>
                    <div style={{
                      marginTop: 6,
                      fontWeight: 600,
                      color: isFunded ? '#16a34a' : isNoAction ? '#64748b' : '#dc2626'
                    }}>
                      {isFunded ? '✓ Approved for Works' : isNoAction ? 'No defect action' : '✕ Exceeds Budget'}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}
