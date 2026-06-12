import React, { useState } from 'react';
import { FloorPlan } from './FloorPlan';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
}

interface Asset {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  assignedTo: string | null;
  condition: string;
  warrantyUntil: string;
  handoverAcknowledged: boolean;
}

interface Ticket {
  id: string;
  assetId: string;
  assetName: string;
  serialNumber: string;
  reportedBy: string;
  reportedByName: string;
  description: string;
  status: string;
  createdAt: string;
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

interface Resource {
  id: string;
  name: string;
  zone: string;
  equipment?: string[];
  capacity?: number;
  amenities?: string[];
  cx?: number;
  cy?: number;
}

interface Analytics {
  occupancyStats: {
    desksTotal: number;
    desksOccupied: number;
    desksEmpty: number;
    roomsTotal: number;
    roomsOccupied: number;
    roomsEmpty: number;
  };
  busiestDays: Array<{ day: string; count: number }>;
  popularRooms: Array<{ name: string; count: number }>;
  assetConditions: Record<string, number>;
  totalBookingsCount: number;
}

interface AdminDashboardProps {
  users: User[];
  assets: Asset[];
  tickets: Ticket[];
  desks: Resource[];
  rooms: Resource[];
  bookings: Booking[];
  currentUserId: string;
  analytics: Analytics | null;
  onAssignAsset: (assetId: string, userId: string) => Promise<void>;
  onResolveTicket: (ticketId: string, returnToStatus: string) => Promise<void>;
  onOffboardUser: (userId: string) => Promise<{ returnedAssets: any[]; cancelledBookings: any[] }>;
  onAddDesk: (deskData: any) => Promise<void>;
  onDeleteDesk: (deskId: string) => Promise<void>;
  onAddRoom: (roomData: any) => Promise<void>;
  onDeleteRoom: (roomId: string) => Promise<void>;
  onRegisterAsset: (assetData: any) => Promise<void>;
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  assets,
  tickets,
  desks,
  rooms,
  bookings,
  currentUserId,
  analytics,
  onAssignAsset,
  onResolveTicket,
  onOffboardUser,
  onAddDesk,
  onDeleteDesk,
  onAddRoom,
  onDeleteRoom,
  onRegisterAsset,
  onRefreshData
}) => {
  const [adminSubTab, setAdminSubTab] = useState<'analytics' | 'it-assets' | 'offboarding' | 'designer'>('analytics');
  
  // IT Asset allocation form states
  const [selectedAssetToAssign, setSelectedAssetToAssign] = useState<string>('');
  const [selectedUserForAsset, setSelectedUserForAsset] = useState<string>('');
  const [assigning, setAssigning] = useState<boolean>(false);

  // IT Hardware registration form states
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetSerial, setNewAssetSerial] = useState('');
  const [newAssetCondition, setNewAssetCondition] = useState('New');
  const [newAssetWarrantyYears, setNewAssetWarrantyYears] = useState(2);
  const [registering, setRegistering] = useState(false);

  // HR offboarding receipt states
  const [offboardReceipt, setOffboardReceipt] = useState<{
    employeeName: string;
    returnedAssets: any[];
    cancelledBookings: any[];
  } | null>(null);
  const [offboardingUserId, setOffboardingUserId] = useState<string | null>(null);

  // Seating plan designer modal states
  const [activePlacementCoords, setActivePlacementCoords] = useState<{ cx: number; cy: number } | null>(null);
  const [newDeskName, setNewDeskName] = useState('');
  const [newDeskZone, setNewDeskZone] = useState('North Wing');
  const [selectedDeskEquipment, setSelectedDeskEquipment] = useState<string[]>([]);
  const [addingDesk, setAddingDesk] = useState(false);

  // Meeting Room creator form states
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(6);
  const [newRoomZone, setNewRoomZone] = useState('Central Hub');
  const [selectedRoomAmenities, setSelectedRoomAmenities] = useState<string[]>([]);
  const [addingRoom, setAddingRoom] = useState(false);

  // IT Asset Register Handler
  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim() || !newAssetSerial.trim()) return;

    setRegistering(true);
    const expiry = new Date();
    if (newAssetWarrantyYears === 0.5) {
      expiry.setMonth(expiry.getMonth() + 6);
    } else if (newAssetWarrantyYears === 0) {
      expiry.setDate(expiry.getDate() - 1); // Expired yesterday
    } else {
      expiry.setFullYear(expiry.getFullYear() + newAssetWarrantyYears);
    }

    const assetData = {
      name: newAssetName.trim(),
      serialNumber: newAssetSerial.trim().toUpperCase(),
      condition: newAssetCondition,
      warrantyUntil: expiry.toISOString().split('T')[0]
    };

    try {
      await onRegisterAsset(assetData);
      setNewAssetName('');
      setNewAssetSerial('');
      setNewAssetCondition('New');
      alert('Hardware asset registered successfully in storage!');
    } catch (err: any) {
      alert(err.message || 'Failed to register asset.');
    } finally {
      setRegistering(false);
    }
  };

  // Seating Designer grid click handler
  const handleGridClick = (cx: number, cy: number) => {
    // Determine default desk name suggestions
    const index = desks.length + 1;
    setNewDeskName(`Desk ${index}`);
    setSelectedDeskEquipment([]);
    setActivePlacementCoords({ cx, cy });
  };

  // Desk placement submit handler
  const handleDeskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlacementCoords || !newDeskName.trim()) return;

    setAddingDesk(true);
    const deskData = {
      name: newDeskName.trim(),
      zone: newDeskZone,
      equipment: selectedDeskEquipment,
      cx: activePlacementCoords.cx,
      cy: activePlacementCoords.cy
    };

    try {
      await onAddDesk(deskData);
      setActivePlacementCoords(null);
    } catch (err: any) {
      alert(err.message || 'Failed to add desk.');
    } finally {
      setAddingDesk(false);
    }
  };

  // Meeting Room submit handler
  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    // Check if slot limit of 4 rooms exceeded (for layout rendering)
    if (rooms.length >= 4) {
      alert('Maximum of 4 meeting rooms reached for current CAD floor plan slots layout.');
      return;
    }

    setAddingRoom(true);
    const roomData = {
      name: newRoomName.trim(),
      zone: newRoomZone,
      capacity: newRoomCapacity,
      amenities: selectedRoomAmenities
    };

    try {
      await onAddRoom(roomData);
      setNewRoomName('');
      setSelectedRoomAmenities([]);
      alert('Meeting room created successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to create room.');
    } finally {
      setAddingRoom(false);
    }
  };

  const handleDeleteResource = async (id: string, type: 'desk' | 'room') => {
    const confirmDelete = window.confirm(`Are you sure you want to delete this ${type} (${id})? Any future bookings for it will be cancelled.`);
    if (!confirmDelete) return;

    if (type === 'desk') {
      await onDeleteDesk(id);
    } else {
      await onDeleteRoom(id);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetToAssign || !selectedUserForAsset) return;

    setAssigning(true);
    try {
      await onAssignAsset(selectedAssetToAssign, selectedUserForAsset);
      setSelectedAssetToAssign('');
      setSelectedUserForAsset('');
      alert('Asset successfully assigned! Digital handover triggered.');
    } catch (err) {
      console.error(err);
      alert('Failed to assign asset.');
    } finally {
      setAssigning(false);
    }
  };

  const handleOffboardClick = async (user: User) => {
    const confirmOffboard = window.confirm(`⚠️ WARNING: Are you sure you want to offboard ${user.name}? This will instantly return all assigned IT hardware to inventory and cancel all future office bookings.`);
    if (!confirmOffboard) return;

    setOffboardingUserId(user.id);
    try {
      const data = await onOffboardUser(user.id);
      setOffboardReceipt({
        employeeName: user.name,
        returnedAssets: data.returnedAssets || [],
        cancelledBookings: data.cancelledBookings || []
      });
    } catch (err) {
      console.error(err);
      alert('Failed to offboard employee.');
    } finally {
      setOffboardingUserId(null);
    }
  };

  const toggleEquipmentOption = (option: string) => {
    if (selectedDeskEquipment.includes(option)) {
      setSelectedDeskEquipment(selectedDeskEquipment.filter(item => item !== option));
    } else {
      setSelectedDeskEquipment([...selectedDeskEquipment, option]);
    }
  };

  const toggleRoomAmenityOption = (option: string) => {
    if (selectedRoomAmenities.includes(option)) {
      setSelectedRoomAmenities(selectedRoomAmenities.filter(item => item !== option));
    } else {
      setSelectedRoomAmenities([...selectedRoomAmenities, option]);
    }
  };

  // Find unassigned assets to populate dropdown
  const availableAssets = assets.filter(a => !a.assignedTo && ['New', 'Assigned'].includes(a.status));
  const openTickets = tickets.filter(t => t.status === 'Open');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Admin Sub Navigation */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setAdminSubTab('analytics')}
          className="btn"
          style={{
            padding: '0.5rem 1.25rem',
            fontSize: '0.85rem',
            background: adminSubTab === 'analytics' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: adminSubTab === 'analytics' ? 'white' : 'var(--text-secondary)',
            border: adminSubTab === 'analytics' ? '1px solid var(--accent-indigo)' : 'none'
          }}
        >
          📈 Utilization Analytics
        </button>
        <button
          onClick={() => setAdminSubTab('designer')}
          className="btn"
          style={{
            padding: '0.5rem 1.25rem',
            fontSize: '0.85rem',
            background: adminSubTab === 'designer' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: adminSubTab === 'designer' ? 'white' : 'var(--text-secondary)',
            border: adminSubTab === 'designer' ? '1px solid var(--accent-indigo)' : 'none'
          }}
        >
          🛠️ Space Designer
        </button>
        <button
          onClick={() => setAdminSubTab('it-assets')}
          className="btn"
          style={{
            padding: '0.5rem 1.25rem',
            fontSize: '0.85rem',
            background: adminSubTab === 'it-assets' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: adminSubTab === 'it-assets' ? 'white' : 'var(--text-secondary)',
            border: adminSubTab === 'it-assets' ? '1px solid var(--accent-indigo)' : 'none'
          }}
        >
          💻 IT Assets & Repairs ({openTickets.length} Tickets)
        </button>
        <button
          onClick={() => setAdminSubTab('offboarding')}
          className="btn"
          style={{
            padding: '0.5rem 1.25rem',
            fontSize: '0.85rem',
            background: adminSubTab === 'offboarding' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: adminSubTab === 'offboarding' ? 'white' : 'var(--text-secondary)',
            border: adminSubTab === 'offboarding' ? '1px solid var(--accent-indigo)' : 'none'
          }}
        >
          ⚡ HR Offboarding Portal
        </button>
      </div>

      {/* SUBTAB 1: UTILIZATION ANALYTICS */}
      {adminSubTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {analytics ? (
            <>
              {/* Top Level Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem' }}>Desk Occupancy</div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                    {Math.round((analytics.occupancyStats.desksOccupied / (analytics.occupancyStats.desksTotal || 1)) * 100)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {analytics.occupancyStats.desksOccupied} / {analytics.occupancyStats.desksTotal} booked today
                  </div>
                </div>
                
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem' }}>Room Occupancy</div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-violet)' }}>
                    {Math.round((analytics.occupancyStats.roomsOccupied / (analytics.occupancyStats.roomsTotal || 1)) * 100)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {analytics.occupancyStats.roomsOccupied} / {analytics.occupancyStats.roomsTotal} rooms in use
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem' }}>Devices in Repair</div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-rose)' }}>
                    {analytics.assetConditions['In Repair'] || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Requires IT technician attention
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem' }}>Total Bookings</div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-emerald)' }}>
                    {analytics.totalBookingsCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Bookings recorded in log database
                  </div>
                </div>
              </div>

              {/* Charts section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                
                {/* Chart A: Busiest Days Bar Chart */}
                <div className="glass-panel" style={{ padding: '1.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'white', fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>
                    📅 Busiest Days of the Week
                  </h3>
                  
                  {analytics.busiestDays.length === 0 || analytics.busiestDays.every(d => d.count === 0) ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No booking analytics gathered yet. Make some reservations to view data charts!
                    </div>
                  ) : (
                    <svg viewBox="0 0 500 240" style={{ width: '100%', height: 'auto', background: 'transparent' }}>
                      <line x1="50" y1="30" x2="470" y2="30" stroke="rgba(255,255,255,0.04)" />
                      <line x1="50" y1="90" x2="470" y2="90" stroke="rgba(255,255,255,0.04)" />
                      <line x1="50" y1="150" x2="470" y2="150" stroke="rgba(255,255,255,0.04)" />
                      <line x1="50" y1="210" x2="470" y2="210" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />

                      {analytics.busiestDays.map((item, index) => {
                        const maxCount = Math.max(...analytics.busiestDays.map(d => d.count), 1);
                        const barHeight = (item.count / maxCount) * 160;
                        const bx = 75 + index * 80;
                        const by = 210 - barHeight;

                        return (
                          <g key={item.day}>
                            <defs>
                              <linearGradient id={`cyan-blue-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22D3EE" />
                                <stop offset="100%" stopColor="#0284C7" />
                              </linearGradient>
                            </defs>
                            <rect
                              x={bx}
                              y={by}
                              width="34"
                              height={barHeight}
                              fill={`url(#cyan-blue-${index})`}
                              rx="4"
                              opacity="0.85"
                            />
                            <text x={bx + 17} y={by - 8} fill="white" fontSize="10" fontWeight="700" textAnchor="middle">
                              {item.count}
                            </text>
                            <text x={bx + 17} y="228" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">
                              {item.day.slice(0, 3)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>

                {/* Chart B: Popular Meeting Rooms progress indicators */}
                <div className="glass-panel" style={{ padding: '1.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'white', fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>
                    🚪 Room Booking Volume
                  </h3>
                  
                  {analytics.popularRooms.length === 0 || analytics.popularRooms.every(r => r.count === 0) ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No room bookings recorded. Create rooms and make reservations to populate statistics.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'center', minHeight: '180px' }}>
                      {analytics.popularRooms.map(room => {
                        const maxRoomsCount = Math.max(...analytics.popularRooms.map(r => r.count), 1);
                        const percentage = (room.count / maxRoomsCount) * 100;
                        
                        return (
                          <div key={room.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span style={{ fontWeight: '700', color: 'white' }}>{room.name}</span>
                              <span style={{ color: 'var(--accent-violet)', fontWeight: '700' }}>{room.count} bookings</span>
                            </div>
                            
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                              <div 
                                style={{ 
                                  height: '100%', 
                                  width: `${percentage}%`, 
                                  background: 'var(--grad-primary)', 
                                  borderRadius: '4px',
                                  transition: 'width 0.8s ease-out'
                                }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </>
          ) : (
            <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Gathering operations metrics...
            </div>
          )}

        </div>
      )}

      {/* SUBTAB 2: SPACE DESIGNER (Interactive seating layout and room creation) */}
      {adminSubTab === 'designer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'flex-start' }}>
          
          {/* Seating Map view in design mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'white', fontFamily: 'var(--font-display)' }}>
                  🗺️ Seating & Office Layout Canvas
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Click anywhere on the grid bottom sector to place a desk circle, or click [x] to delete.
                </p>
              </div>
            </div>

            <FloorPlan
              desks={desks}
              rooms={rooms}
              bookings={bookings}
              currentUserId={currentUserId}
              selectedResourceId={null}
              onSelectResource={() => {}}
              designerMode={true}
              onGridClick={handleGridClick}
              onDeleteResource={handleDeleteResource}
            />
          </div>

          {/* Meeting Room Creator Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'white', fontFamily: 'var(--font-display)' }}>
                🚪 Meeting Room Creator
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Define meeting rooms. Created rooms will automatically be allocated one of the 4 layout slots in the top sector.
              </p>
            </div>

            <form onSubmit={handleRoomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className="form-group">
                <label>Room Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Apollo Huddle Room"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Capacity (Pax)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className="form-input"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Office Area</label>
                  <select
                    className="form-input"
                    value={newRoomZone}
                    onChange={(e) => setNewRoomZone(e.target.value)}
                  >
                    <option value="Central Hub">Central Hub</option>
                    <option value="North Wing">North Wing</option>
                    <option value="South Wing">South Wing</option>
                    <option value="East Wing">East Wing</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Available Amenities</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {['Video conferencing screen', 'Whiteboard', 'Speakerphone', 'Ring light'].map(am => {
                    const active = selectedRoomAmenities.includes(am);
                    return (
                      <button
                        type="button"
                        key={am}
                        onClick={() => toggleRoomAmenityOption(am)}
                        className="btn"
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.7rem',
                          background: active ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.01)',
                          border: `1px solid ${active ? 'var(--accent-indigo)' : 'var(--border-light)'}`,
                          color: active ? 'white' : 'var(--text-secondary)'
                        }}
                      >
                        {am}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={addingRoom || !newRoomName.trim()}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {addingRoom ? 'Creating...' : 'Create & Draw Room'}
              </button>
            </form>

            {/* List of current rooms */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 'bold' }}>Designed Rooms</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rooms.length} / 4 Slots used</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto' }}>
                {rooms.map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', fontSize: '0.75rem' }}>
                    <span style={{ color: 'white' }}>{r.name} (Pax: {r.capacity})</span>
                    <button
                      onClick={() => handleDeleteResource(r.id, 'room')}
                      style={{ background: 'transparent', border: 'none', color: '#F87171', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUBTAB 3: IT ASSETS & REPAIRS */}
      {adminSubTab === 'it-assets' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'flex-start' }}>
          
          {/* Repair Tickets */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'white', fontFamily: 'var(--font-display)' }}>
                🛠️ Open IT Repair Tickets
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Repair requests submitted directly by employees.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '450px', overflowY: 'auto' }}>
              {openTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  🎉 No open hardware issues! All assets are fully functional.
                </div>
              ) : (
                openTickets.map(ticket => (
                  <div 
                    key={ticket.id}
                    style={{
                      background: 'rgba(239, 68, 68, 0.03)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ color: 'white', fontSize: '0.9rem', fontWeight: '700' }}>{ticket.assetName}</h4>
                        <code style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>S/N: {ticket.serialNumber}</code>
                      </div>
                      <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>Open</span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '4px' }}>
                      "{ticket.description}"
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Reported by: <strong>{ticket.reportedByName}</strong>
                      </span>
                      
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => onResolveTicket(ticket.id, 'New')}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px' }}
                        >
                          Send to Storage
                        </button>
                        <button
                          onClick={() => onResolveTicket(ticket.id, 'Assigned')}
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px', background: 'var(--grad-success)' }}
                        >
                          Return to Employee
                        </button>
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

          {/* IT Assignment & Registration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* IT Allocation */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'white', fontFamily: 'var(--font-display)' }}>
                  📥 Digital Handover Assignment
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Assign an in-storage hardware device to an employee.
                </p>
              </div>

              <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Select Hardware Device</label>
                  <select
                    className="form-input"
                    value={selectedAssetToAssign}
                    onChange={(e) => setSelectedAssetToAssign(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Asset from Inventory --</option>
                    {availableAssets.map(asset => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} (S/N: {asset.serialNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Assign to Employee</label>
                  <select
                    className="form-input"
                    value={selectedUserForAsset}
                    onChange={(e) => setSelectedUserForAsset(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={assigning || !selectedAssetToAssign || !selectedUserForAsset}
                  className="btn btn-primary"
                  style={{ width: '100%', background: 'var(--grad-violet)' }}
                >
                  {assigning ? 'Assigning...' : 'Assign Hardware & Trigger Handover'}
                </button>
              </form>
            </div>

            {/* Asset Register Form */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'white', fontFamily: 'var(--font-display)' }}>
                  💾 Register Hardware Asset
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Add a brand new computer, monitor or accessory to the company's IT inventory.
                </p>
              </div>

              <form onSubmit={handleRegisterAsset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Device Name / Model</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder='e.g. MacBook Pro 16" M3 Max'
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Serial Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. MBP-9821-X"
                    value={newAssetSerial}
                    onChange={(e) => setNewAssetSerial(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Initial Condition</label>
                    <select
                      className="form-input"
                      value={newAssetCondition}
                      onChange={(e) => setNewAssetCondition(e.target.value)}
                    >
                      <option value="New">New</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                      <option value="Refurbished">Refurbished</option>
                      <option value="In Repair">In Repair</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Warranty Years</label>
                    <select
                      className="form-input"
                      value={newAssetWarrantyYears}
                      onChange={(e) => setNewAssetWarrantyYears(Number(e.target.value))}
                    >
                      <option value={0}>No Warranty / Expired</option>
                      <option value={0.5}>6 Months</option>
                      <option value={1}>1 Year</option>
                      <option value={2}>2 Years</option>
                      <option value={3}>3 Years</option>
                      <option value={4}>4 Years</option>
                      <option value={5}>5 Years</option>
                      <option value={99}>Lifetime Warranty</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={registering || !newAssetName.trim() || !newAssetSerial.trim()}
                  className="btn btn-secondary"
                  style={{ width: '100%', color: 'white', borderColor: 'rgba(99, 102, 241, 0.3)' }}
                >
                  {registering ? 'Registering...' : 'Register Device in Storage'}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* SUBTAB 4: HR OFFBOARDING PORTAL */}
      {adminSubTab === 'offboarding' && (
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', color: 'white', fontFamily: 'var(--font-display)' }}>
              ⚡ HR Employee Offboarding
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              One-click offboarding. Returns all assigned hardware back into storage and cancels all future desk/room bookings.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Employee Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role/Title</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assigned Hardware</th>
                  <th style={{ padding: '0.75rem 1rem', textAnchor: 'end' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const userHardware = assets.filter(a => a.assignedTo === user.id);
                  
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', color: 'white' }}>
                      <td style={{ padding: '1rem', fontWeight: '700' }}>{user.name}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ display: 'block' }}>{user.title}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.role}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {userHardware.length === 0 ? (
                          <span style={{ color: 'var(--text-muted)' }}>None</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {userHardware.map(h => (
                              <span key={h.id} style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                                💻 {h.name} (S/N: {h.serialNumber})
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <button
                          onClick={() => handleOffboardClick(user)}
                          disabled={offboardingUserId === user.id}
                          className="btn btn-danger"
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            background: 'var(--accent-rose)'
                          }}
                        >
                          {offboardingUserId === user.id ? 'Processing...' : 'One-Click Offboard'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Offboarding Receipt Confirmation Modal */}
          {offboardReceipt && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem'
              }}
            >
              <div 
                className="glass-panel animate-fade-in" 
                style={{ 
                  maxWidth: '550px', 
                  width: '100%', 
                  padding: '2.25rem',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
                  border: '1px solid rgba(16, 185, 129, 0.4)'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚡</div>
                  <h3 style={{ fontSize: '1.3rem', color: 'white', fontFamily: 'var(--font-display)' }}>
                    Offboarding Complete
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Successfully offboarded employee: <strong style={{ color: 'white' }}>{offboardReceipt.employeeName}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'white', fontWeight: '700', marginBottom: '0.5rem' }}>
                      📥 IT Hardware Returned ({offboardReceipt.returnedAssets.length})
                    </h4>
                    {offboardReceipt.returnedAssets.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No assets were assigned to this user.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {offboardReceipt.returnedAssets.map(a => (
                          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ color: 'white' }}>{a.name}</span>
                            <span style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>S/N: {a.serialNumber}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'white', fontWeight: '700', marginBottom: '0.5rem' }}>
                      📆 Cancelled Desk & Room Bookings ({offboardReceipt.cancelledBookings.length})
                    </h4>
                    {offboardReceipt.cancelledBookings.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No future bookings were scheduled.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto' }}>
                        {offboardReceipt.cancelledBookings.map(b => (
                          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: 'white', textTransform: 'capitalize' }}>
                              {b.resourceType} ({b.resourceId})
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {new Date(b.startTime).toLocaleDateString()} {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setOffboardReceipt(null);
                    onRefreshData();
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', background: 'var(--grad-success)' }}
                >
                  Close & Acknowledge
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Desk Placement Detail Modal */}
      {activePlacementCoords && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div className="glass-panel animate-fade-in" style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'white', fontFamily: 'var(--font-display)' }}>
                📍 Place Workspace Desk
              </h3>
              <button 
                onClick={() => setActivePlacementCoords(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleDeskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Desk Label Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Desk A1"
                  value={newDeskName}
                  onChange={(e) => setNewDeskName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Zone / Wing Section</label>
                <select
                  className="form-input"
                  value={newDeskZone}
                  onChange={(e) => setNewDeskZone(e.target.value)}
                >
                  <option value="North Wing">North Wing</option>
                  <option value="East Wing">East Wing</option>
                  <option value="South Wing">South Wing</option>
                  <option value="West Wing">West Wing</option>
                </select>
              </div>

              <div className="form-group">
                <label>Equipment Package</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {['Standing desk', 'Dual monitors', 'Single monitor', 'Mechanical keyboard', 'Ergonomic chair', 'Video conferencing screen'].map(eq => {
                    const active = selectedDeskEquipment.includes(eq);
                    return (
                      <button
                        type="button"
                        key={eq}
                        onClick={() => toggleEquipmentOption(eq)}
                        className="btn"
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.7rem',
                          background: active ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.01)',
                          border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border-light)'}`,
                          color: active ? 'white' : 'var(--text-secondary)'
                        }}
                      >
                        {eq}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Coordinates: cx={activePlacementCoords.cx}, cy={activePlacementCoords.cy}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActivePlacementCoords(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDesk || !newDeskName.trim()}
                  className="btn btn-cyan"
                  style={{ flex: 2 }}
                >
                  {addingDesk ? 'Placing...' : 'Confirm Placement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
