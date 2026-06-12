import React, { useState, useRef } from 'react';

interface Resource {
  id: string;
  name: string;
  zone: string;
  equipment?: string[];
  capacity?: number;
  amenities?: string[];
  cx?: number; // Custom coordinates for desks
  cy?: number;
}

interface Booking {
  id: string;
  resourceId: string;
  resourceType: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface FloorPlanProps {
  desks: Resource[];
  rooms: Resource[];
  bookings: Booking[];
  currentUserId: string;
  selectedResourceId: string | null;
  onSelectResource: (resource: Resource, type: 'desk' | 'room', status: 'available' | 'booked' | 'mine-pending' | 'mine-active') => void;
  filters?: {
    amenity: string;
    capacity: number;
  };
  designerMode?: boolean;
  onGridClick?: (cx: number, cy: number) => void;
  onDeleteResource?: (resourceId: string, type: 'desk' | 'room') => void;
}

export const FloorPlan: React.FC<FloorPlanProps> = ({
  desks,
  rooms,
  bookings,
  currentUserId,
  selectedResourceId,
  onSelectResource,
  filters = { amenity: '', capacity: 0 },
  designerMode = false,
  onGridClick,
  onDeleteResource
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{
    id: string;
    name: string;
    type: 'desk' | 'room';
    details: string;
    status: string;
    x: number;
    y: number;
  } | null>(null);

  // Helper to determine active status
  const getResourceStatus = (resourceId: string) => {
    const now = new Date();
    const activeBooking = bookings.find(
      b =>
        b.resourceId === resourceId &&
        !['cancelled', 'released'].includes(b.status) &&
        new Date(b.startTime) <= now &&
        new Date(b.endTime) >= now
    );

    if (!activeBooking) {
      const upcomingBooking = bookings.find(
        b =>
          b.resourceId === resourceId &&
          !['cancelled', 'released'].includes(b.status) &&
          new Date(b.startTime) > now &&
          new Date(b.startTime).getTime() - now.getTime() <= 15 * 60 * 1000
      );

      if (upcomingBooking) {
        if (upcomingBooking.userId === currentUserId) {
          return { state: 'mine-pending', booking: upcomingBooking };
        }
        return { state: 'booked', booking: upcomingBooking };
      }

      return { state: 'available', booking: null };
    }

    if (activeBooking.userId === currentUserId) {
      return {
        state: activeBooking.status === 'checked-in' ? 'mine-active' : 'mine-pending',
        booking: activeBooking
      };
    }
    return { state: 'booked', booking: activeBooking };
  };

  const matchesFilter = (resource: Resource, type: 'desk' | 'room') => {
    if (designerMode) return true; // Show all in designer mode
    if (type === 'desk') {
      if (filters.amenity && !resource.equipment?.includes(filters.amenity)) {
        return false;
      }
    } else {
      if (filters.capacity && (resource.capacity || 0) < filters.capacity) {
        return false;
      }
      if (filters.amenity && !resource.amenities?.includes(filters.amenity)) {
        return false;
      }
    }
    return true;
  };

  const handleMouseMove = (e: React.MouseEvent, item: Resource, type: 'desk' | 'room', state: string, bookingUser?: string) => {
    if (designerMode) return; // Disable standard tooltips in designer mode

    const rect = e.currentTarget.getBoundingClientRect();
    const svgEl = e.currentTarget.closest('svg');
    if (!svgEl) return;
    const svgRect = svgEl.getBoundingClientRect();

    const x = rect.left - svgRect.left + rect.width / 2;
    const y = rect.top - svgRect.top - 10;

    let details = '';
    if (type === 'desk') {
      details = item.equipment?.join(', ') || 'No equipment';
    } else {
      details = `Capacity: ${item.capacity} | ${item.amenities?.join(', ') || 'None'}`;
    }

    let displayStatus = 'Available';
    if (state === 'booked') displayStatus = `Booked by ${bookingUser || 'Another User'}`;
    if (state === 'mine-pending') displayStatus = 'Your Booking (Pending Check-in)';
    if (state === 'mine-active') displayStatus = 'Your Booking (Active)';

    setHoveredItem({
      id: item.id,
      name: item.name,
      type,
      details,
      status: displayStatus,
      x,
      y
    });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const getStatusColor = (state: string, isFiltered: boolean) => {
    if (!isFiltered) return '#1E293B';
    if (designerMode) return '#6366F1'; // Neutral designer indigo
    switch (state) {
      case 'mine-active':
        return '#10B981';
      case 'mine-pending':
        return '#F59E0B';
      case 'booked':
        return '#EF4444';
      case 'available':
      default:
        return '#0EA5E9';
    }
  };

  // SVG grid coordinate clicks
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!designerMode || !onGridClick || !svgRef.current) return;

    // Check if clicking on an interactive sub-element like a desk or room
    const target = e.target as SVGElement;
    if (target.tagName !== 'svg' && target.getAttribute('id') !== 'floor-grid') {
      // Clicked on a desk or room object, don't place a new desk here
      return;
    }

    const rect = svgRef.current.getBoundingClientRect();
    const xRelative = e.clientX - rect.left;
    const yRelative = e.clientY - rect.top;

    // Map to 800x460 viewBox coordinates
    const cx = Math.round((xRelative / rect.width) * 800);
    const cy = Math.round((yRelative / rect.height) * 460);

    onGridClick(cx, cy);
  };

  // Room coordinates based on slot allocation index
  const getRoomCoordinates = (index: number) => {
    const slots = [
      { rx: 30, ry: 30, rw: 180, rh: 140 },  // Slot 1
      { rx: 230, ry: 30, rw: 150, rh: 100 }, // Slot 2
      { rx: 400, ry: 30, rw: 150, rh: 100 }, // Slot 3
      { rx: 570, ry: 30, rw: 110, rh: 100 }  // Slot 4
    ];
    return slots[index % slots.length];
  };

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      
      {designerMode && (
        <div style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 10, background: 'rgba(99, 102, 241, 0.9)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', pointerEvents: 'none' }}>
          🛠️ DESIGNER MODE: Click anywhere on the grid below to place a desk
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox="0 0 800 460"
        className="glass-panel"
        onClick={handleSvgClick}
        style={{
          width: '100%',
          height: 'auto',
          background: 'rgba(15, 23, 42, 0.45)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '10px'
        }}
      >
        <defs>
          <pattern id="designer-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.035)" strokeWidth="1" />
          </pattern>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
          </pattern>
          <filter id="glow-selected" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Floor Grid (Click target) */}
        <rect 
          id="floor-grid" 
          width="100%" 
          height="100%" 
          fill={designerMode ? "url(#designer-grid)" : "url(#grid)"} 
          rx="12" 
        />

        {/* Layout Partition Walls */}
        <line x1="20" y1="200" x2="780" y2="200" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="3" strokeDasharray="8 4" />
        <line x1="390" y1="200" x2="390" y2="440" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="3" strokeDasharray="8 4" />

        {/* ZONE LABELS */}
        <text x="50" y="225" fill="var(--text-muted)" fontSize="10" fontWeight="700" letterSpacing="1.5">NORTH AREA</text>
        <text x="730" y="225" fill="var(--text-muted)" fontSize="10" fontWeight="700" letterSpacing="1.5" textAnchor="end">EAST AREA</text>
        <text x="50" y="435" fill="var(--text-muted)" fontSize="10" fontWeight="700" letterSpacing="1.5">WEST AREA</text>
        <text x="730" y="435" fill="var(--text-muted)" fontSize="10" fontWeight="700" letterSpacing="1.5" textAnchor="end">SOUTH AREA</text>

        {/* --- MEETING ROOMS --- */}
        {rooms.length === 0 ? (
          <text x="400" y="90" fill="var(--text-muted)" fontSize="12" textAnchor="middle" fontStyle="italic">
            No meeting rooms designed yet. Add one in the Space Designer tab below!
          </text>
        ) : (
          rooms.map((room, idx) => {
            const { state, booking } = getResourceStatus(room.id);
            const isFiltered = matchesFilter(room, 'room');
            const isSelected = selectedResourceId === room.id;
            
            // Allocate preset slot bounds based on database array index
            const { rx, ry, rw, rh } = getRoomCoordinates(idx);
            const color = getStatusColor(state, isFiltered);

            return (
              <g
                key={room.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (designerMode) return;
                  if (isFiltered) onSelectResource(room, 'room', state as any);
                }}
                style={{ cursor: designerMode ? 'default' : isFiltered ? 'pointer' : 'not-allowed' }}
                onMouseMove={(e) => handleMouseMove(e, room, 'room', state, booking?.userName)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Room Shape */}
                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  fill={isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(30, 41, 59, 0.3)'}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 1.5}
                  filter={isSelected ? 'url(#glow-selected)' : undefined}
                  rx="8"
                  style={{ transition: 'var(--transition-smooth)' }}
                />
                
                {/* Table illustration */}
                <rect
                  x={rx + rw / 4}
                  y={ry + rh / 4}
                  width={rw / 2}
                  height={rh / 2}
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  rx="6"
                  opacity="0.25"
                />
                
                {/* Title */}
                <text
                  x={rx + rw / 2}
                  y={ry + rh / 2 + 3}
                  fill={isFiltered ? 'white' : 'var(--text-muted)'}
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {room.name}
                </text>
                
                <text
                  x={rx + rw / 2}
                  y={ry + rh - 12}
                  fill="var(--text-secondary)"
                  fontSize="9"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  Pax: {room.capacity}
                </text>

                {/* Designer delete button */}
                {designerMode && onDeleteResource && (
                  <g 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteResource(room.id, 'room');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx={rx + rw - 12} cy={ry + 12} r="8" fill="rgba(239, 68, 68, 0.85)" />
                    <text x={rx + rw - 12} y={ry + 15} fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">&times;</text>
                  </g>
                )}
              </g>
            );
          })
        )}

        {/* --- DYNAMIC DESKS --- */}
        {desks.length === 0 ? (
          <text x="400" y="320" fill="var(--text-muted)" fontSize="12" textAnchor="middle" fontStyle="italic">
            No desk spaces placed yet. Place desks dynamically by clicking the grid area!
          </text>
        ) : (
          desks.map(desk => {
            const { state, booking } = getResourceStatus(desk.id);
            const isFiltered = matchesFilter(desk, 'desk');
            const isSelected = selectedResourceId === desk.id;

            // Coordinates saved in database
            const cx = desk.cx || 400;
            const cy = desk.cy || 300;

            const color = getStatusColor(state, isFiltered);

            return (
              <g
                key={desk.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (designerMode) return;
                  if (isFiltered) onSelectResource(desk, 'desk', state as any);
                }}
                style={{ cursor: designerMode ? 'default' : isFiltered ? 'pointer' : 'not-allowed' }}
                onMouseMove={(e) => handleMouseMove(e, desk, 'desk', state, booking?.userName)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Selection Ring */}
                {isSelected && (
                  <circle cx={cx} cy={cy} r="25" fill="none" stroke="var(--accent-indigo)" strokeWidth="2" filter="url(#glow-selected)" />
                )}
                
                {/* Desk circle shape */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="16"
                  fill={isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(30, 41, 59, 0.5)'}
                  stroke={color}
                  strokeWidth="2"
                  style={{ transition: 'var(--transition-smooth)' }}
                />
                
                {/* Backrest Indicator */}
                <path
                  d={`M ${cx - 9} ${cy + 13} Q ${cx} ${cy + 10} ${cx + 9} ${cy + 13}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                />
                
                {/* Desk Surface rect */}
                <rect
                  x={cx - 20}
                  y={cy - 23}
                  width="40"
                  height="8"
                  fill="none"
                  stroke={isFiltered ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}
                  strokeWidth="1.2"
                  rx="1.5"
                />

                {/* Desk label */}
                <text
                  x={cx}
                  y={cy + 3}
                  fill={isFiltered ? 'white' : 'var(--text-muted)'}
                  fontSize="8"
                  fontWeight="700"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {desk.name}
                </text>

                {/* Designer delete button */}
                {designerMode && onDeleteResource && (
                  <g 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteResource(desk.id, 'desk');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx={cx + 14} cy={cy - 14} r="7" fill="rgba(239, 68, 68, 0.85)" />
                    <text x={cx + 14} y={cy - 11} fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">&times;</text>
                  </g>
                )}
              </g>
            );
          })
        )}
      </svg>

      {/* HOVER TOOLTIP */}
      {hoveredItem && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            left: `${hoveredItem.x}px`,
            top: `${hoveredItem.y}px`,
            transform: 'translate(-50%, -100%)',
            background: '#0B0F19',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7), 0 0 10px rgba(99, 102, 241, 0.2)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            zIndex: 1000,
            pointerEvents: 'none',
            minWidth: '180px',
            textAlign: 'left'
          }}
        >
          <div style={{ fontWeight: '800', color: 'white', marginBottom: '4px', fontSize: '0.85rem' }}>
            {hoveredItem.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            {hoveredItem.details}
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: hoveredItem.status.includes('Available')
                ? '#10B981'
                : hoveredItem.status.includes('Your')
                ? '#F59E0B'
                : '#EF4444'
            }}
          >
            {hoveredItem.status}
          </div>
        </div>
      )}
    </div>
  );
};
