import React, { useState, useEffect } from 'react';
import { FloorPlan } from './FloorPlan';

interface Resource {
  id: string;
  name: string;
  zone: string;
  equipment?: string[];
  capacity?: number;
  amenities?: string[];
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
  checkedInAt?: string | null;
  releasedAt?: string | null;
  isRecurring?: boolean;
  recurringPattern?: string | null;
  title?: string;
}

interface BookingPanelProps {
  desks: Resource[];
  rooms: Resource[];
  bookings: Booking[];
  currentUserId: string;
  onNewBooking: (bookingData: any) => Promise<void>;
  onCheckIn: (bookingId: string) => Promise<void>;
  onCheckOut: (bookingId: string) => Promise<void>;
  onCancelBooking: (bookingId: string) => Promise<void>;
}

// Live Countdown Timer for check-in
const CheckInTimer: React.FC<{ startTime: string; status: string; onTimeout: () => void }> = ({
  startTime,
  status,
  onTimeout
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (status !== 'pending-check-in') return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const deadline = start + 15 * 60 * 1000; // 15 minutes check-in window
      const remaining = deadline - now;

      if (remaining <= 0) {
        onTimeout();
        return 0;
      }
      return remaining;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, status]);

  if (status !== 'pending-check-in') return null;
  if (timeLeft <= 0) {
    return <span style={{ color: 'var(--accent-rose)', fontWeight: 'bold' }}>Releasing...</span>;
  }

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);

  return (
    <span style={{ color: 'var(--accent-amber)', fontWeight: '700', fontSize: '0.8rem', fontFamily: 'monospace' }}>
      ⏱️ Auto-release in {mins}:{secs < 10 ? '0' : ''}{secs}
    </span>
  );
};

export const BookingPanel: React.FC<BookingPanelProps> = ({
  desks,
  rooms,
  bookings,
  currentUserId,
  onNewBooking,
  onCheckIn,
  onCheckOut,
  onCancelBooking
}) => {
  const [activeTab, setActiveTab] = useState<'desks' | 'rooms'>('desks');
  const [selectedResource, setSelectedResource] = useState<{ resource: Resource; type: 'desk' | 'room'; status: string } | null>(null);
  
  // Filter states
  const [selectedAmenity, setSelectedAmenity] = useState<string>('');
  const [selectedCapacity, setSelectedCapacity] = useState<number>(0);

  // Booking form states
  const [bookingHours, setBookingHours] = useState<number>(2);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringPattern, setRecurringPattern] = useState<string>('weekly');
  const [bookingTitle, setBookingTitle] = useState<string>('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Triggered when a resource is clicked on the SVG Floor plan
  const handleSelectResource = (resource: Resource, type: 'desk' | 'room', status: string) => {
    setSelectedResource({ resource, type, status });
    setBookingTitle(type === 'room' ? 'Team Sync' : '');
    setBookingError(null);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;

    setSubmitting(true);
    setBookingError(null);

    const now = new Date();
    const startTime = now.toISOString();
    const endTime = new Date(now.getTime() + bookingHours * 60 * 60 * 1000).toISOString();

    const bookingData = {
      resourceId: selectedResource.resource.id,
      resourceType: selectedResource.type,
      userId: currentUserId,
      startTime,
      endTime,
      isRecurring,
      recurringPattern: isRecurring ? recurringPattern : null,
      title: bookingTitle.trim() || undefined
    };

    try {
      await onNewBooking(bookingData);
      setSelectedResource(null); // Close modal
      setIsRecurring(false);
    } catch (err: any) {
      console.error(err);
      setBookingError(err.response?.data?.error || err.message || 'Time slot conflict. This resource is already booked.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeout = () => {
    // Local refresh can happen dynamically
  };

  // Get active/upcoming bookings to display in side list
  const sortedBookings = [...bookings]
    .filter(b => b.userId === currentUserId && !['cancelled', 'released'].includes(b.status))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Aggregate desk equipment and room amenities for filter lists
  const allDeskEquipment = Array.from(new Set(desks.flatMap(d => d.equipment || [])));
  const allRoomAmenities = Array.from(new Set(rooms.flatMap(r => r.amenities || [])));

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'flex-start' }}>
      
      {/* Left side: Interactive Map and Filter Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Filters Panel */}
        <div className="glass-panel" style={{ padding: '1.25rem 2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.4)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <button 
              onClick={() => { setActiveTab('desks'); setSelectedAmenity(''); }} 
              className="btn" 
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: activeTab === 'desks' ? 'var(--grad-cyan)' : 'transparent', color: 'white' }}
            >
              🖥️ Desks
            </button>
            <button 
              onClick={() => { setActiveTab('rooms'); setSelectedAmenity(''); }} 
              className="btn" 
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: activeTab === 'rooms' ? 'var(--grad-primary)' : 'transparent', color: 'white' }}
            >
              🚪 Meeting Rooms
            </button>
          </div>

          {activeTab === 'desks' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Equipment:</span>
              <select 
                className="form-input" 
                value={selectedAmenity} 
                onChange={(e) => setSelectedAmenity(e.target.value)}
                style={{ padding: '0.4rem 0.8rem', width: '180px', fontSize: '0.8rem' }}
              >
                <option value="">All Equipment</option>
                {allDeskEquipment.map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Amenity:</span>
                <select 
                  className="form-input" 
                  value={selectedAmenity} 
                  onChange={(e) => setSelectedAmenity(e.target.value)}
                  style={{ padding: '0.4rem 0.8rem', width: '160px', fontSize: '0.8rem' }}
                >
                  <option value="">All Amenities</option>
                  {allRoomAmenities.map(am => (
                    <option key={am} value={am}>{am}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Min Capacity:</span>
                <select 
                  className="form-input" 
                  value={selectedCapacity} 
                  onChange={(e) => setSelectedCapacity(Number(e.target.value))}
                  style={{ padding: '0.4rem 0.8rem', width: '100px', fontSize: '0.8rem' }}
                >
                  <option value={0}>Any</option>
                  <option value={2}>2+ Pax</option>
                  <option value={4}>4+ Pax</option>
                  <option value={8}>8+ Pax</option>
                  <option value={12}>12 Pax</option>
                </select>
              </div>
            </div>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            💡 <span style={{ color: 'white', fontWeight: 'bold' }}>Click</span> any blue node on the map to book it.
          </div>
        </div>

        {/* SVG Floor Map Component */}
        <FloorPlan
          desks={desks}
          rooms={rooms}
          bookings={bookings}
          currentUserId={currentUserId}
          selectedResourceId={selectedResource?.resource.id || null}
          onSelectResource={handleSelectResource}
          filters={{ amenity: selectedAmenity, capacity: selectedCapacity }}
        />

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '600' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0EA5E9' }} /> Available
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} /> Booked
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} /> Pending Check-In
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} /> Checked In
          </div>
        </div>

      </div>

      {/* Right side: Bookings sidebar (active reservations & booking action form) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Dynamic Booking/Info Sidebar Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          {selectedResource ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'white', fontFamily: 'var(--font-display)' }}>
                  📅 Book {selectedResource.resource.name}
                </h3>
                <button 
                  onClick={() => setSelectedResource(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>

              {bookingError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  ⚠️ {bookingError}
                </div>
              )}

              {selectedResource.status === 'available' ? (
                <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {selectedResource.type === 'room' && (
                    <div className="form-group">
                      <label>Meeting Title</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Project Sync"
                        value={bookingTitle} 
                        onChange={(e) => setBookingTitle(e.target.value)} 
                        required
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Duration (Hours)</label>
                    <select 
                      className="form-input"
                      value={bookingHours} 
                      onChange={(e) => setBookingHours(Number(e.target.value))}
                    >
                      <option value={1}>1 Hour</option>
                      <option value={2}>2 Hours</option>
                      <option value={4}>4 Hours</option>
                      <option value={8}>Full Day (8 Hours)</option>
                    </select>
                  </div>

                  {/* Recurring booking selection */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'white', fontWeight: '600' }}>
                      <input 
                        type="checkbox" 
                        checked={isRecurring} 
                        onChange={(e) => setIsRecurring(e.target.checked)} 
                        style={{ cursor: 'pointer' }}
                      />
                      🔁 Make Recurring booking
                    </label>
                    
                    {isRecurring && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pattern:</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            type="button" 
                            onClick={() => setRecurringPattern('weekly')}
                            className="btn" 
                            style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: recurringPattern === 'weekly' ? 'rgba(99,102,241,0.2)' : 'transparent', border: '1px solid var(--border-light)', color: 'white' }}
                          >
                            Weekly (Tuesdays)
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setRecurringPattern('monthly')}
                            className="btn" 
                            style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: recurringPattern === 'monthly' ? 'rgba(99,102,241,0.2)' : 'transparent', border: '1px solid var(--border-light)', color: 'white' }}
                          >
                            Monthly Sync
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="btn btn-cyan" 
                    style={{ marginTop: '0.5rem' }}
                  >
                    {submitting ? 'Booking...' : `Confirm Booking Now`}
                  </button>
                </form>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p>This resource is currently occupied.</p>
                  {selectedResource.status.includes('Your') && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <p style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>This is your booking!</p>
                      {selectedResource.status === 'mine-pending' && (
                        <button 
                          onClick={() => {
                            const myBk = bookings.find(b => b.resourceId === selectedResource.resource.id && !['cancelled','released'].includes(b.status));
                            if (myBk) onCheckIn(myBk.id);
                            setSelectedResource(null);
                          }} 
                          className="btn btn-primary"
                        >
                          Check-In Now
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          const myBk = bookings.find(b => b.resourceId === selectedResource.resource.id && !['cancelled','released'].includes(b.status));
                          if (myBk) onCheckOut(myBk.id);
                          setSelectedResource(null);
                        }} 
                        className="btn btn-secondary" 
                        style={{ color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      >
                        Release Early (Check-Out)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📍</div>
              <p style={{ fontSize: '0.85rem' }}>Select a resource on the floor map to book or check details.</p>
            </div>
          )}
        </div>

        {/* Personal Bookings List (Check-In Portal) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'white', fontFamily: 'var(--font-display)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            📆 Your Active Bookings
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({sortedBookings.length})</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {sortedBookings.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '2rem 0' }}>
                You have no active bookings today.
              </div>
            ) : (
              sortedBookings.map(bk => {
                const resourceName = bk.resourceType === 'desk' 
                  ? desks.find(d => d.id === bk.resourceId)?.name 
                  : rooms.find(r => r.id === bk.resourceId)?.name;

                return (
                  <div 
                    key={bk.id} 
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      border: '1px solid var(--border-light)', 
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: 'white', fontWeight: '700', fontSize: '0.85rem' }}>
                          {resourceName || bk.resourceId}
                        </div>
                        {bk.title && (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                            "{bk.title}"
                          </div>
                        )}
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {new Date(bk.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(bk.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {bk.isRecurring && <span style={{ color: 'var(--accent-violet)' }}> (Weekly)</span>}
                        </div>
                      </div>
                      
                      {bk.status === 'checked-in' ? (
                        <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Active</span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Pending</span>
                      )}
                    </div>

                    {/* Timer & Controls inside card */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem' }}>
                      <CheckInTimer startTime={bk.startTime} status={bk.status} onTimeout={handleTimeout} />
                      
                      <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
                        {bk.status === 'pending-check-in' && (
                          <button
                            onClick={() => onCheckIn(bk.id)}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          >
                            Check-In
                          </button>
                        )}
                        <button
                          onClick={() => bk.status === 'checked-in' ? onCheckOut(bk.id) : onCancelBooking(bk.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px', color: '#F87171', borderColor: 'rgba(239,68,68,0.1)' }}
                        >
                          {bk.status === 'checked-in' ? 'Check-Out' : 'Cancel'}
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
