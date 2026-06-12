import { useState, useEffect } from 'react';
import { BookingPanel } from './components/BookingPanel';
import { TechBackpack } from './components/TechBackpack';
import { AdminDashboard } from './components/AdminDashboard';
import { Homepage } from './components/Homepage';

const API_BASE = 'http://localhost:5050/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
}

export default function App() {
  // Navigation & Mock Auth Role Switcher
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'bookings' | 'backpack' | 'admin'>('home');

  // Business Data
  const [desks, setDesks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [assets, setAssets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Loading / Error UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch System Core Data
  const fetchData = async () => {
    try {
      const [usersRes, bookingsRes, assetsRes, ticketsRes, desksRes, roomsRes] = await Promise.all([
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/bookings`),
        fetch(`${API_BASE}/assets`),
        fetch(`${API_BASE}/assets/tickets`),
        fetch(`${API_BASE}/desks`),
        fetch(`${API_BASE}/rooms`)
      ]);

      if (!usersRes.ok || !bookingsRes.ok || !assetsRes.ok || !ticketsRes.ok || !desksRes.ok || !roomsRes.ok) {
        throw new Error('Failed to fetch backend services. Make sure backend is running.');
      }

      const usersData = await usersRes.json();
      const bookingsData = await bookingsRes.json();
      const assetsData = await assetsRes.json();
      const ticketsData = await ticketsRes.json();
      const desksData = await desksRes.json();
      const roomsData = await roomsRes.json();

      setUsers(usersData);
      setBookings(bookingsData);
      setAssets(assetsData);
      setTickets(ticketsData);
      setDesks(desksData);
      setRooms(roomsData);

      // Default login to first user (Jane Doe) if not set
      if (usersData.length > 0 && !currentUser) {
        setCurrentUser(usersData[0]);
      }

      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connecting to backend API failed.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Analytics (Admin)
  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    }
  };

  // Run on mount
  useEffect(() => {
    fetchData();
    
    // Poll data every 10 seconds for real-time check-in updates
    const pollInterval = setInterval(() => {
      fetchData();
      fetchAnalytics();
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [currentUser]);

  // Load analytics when admin tab becomes active
  useEffect(() => {
    if (activeTab === 'admin') {
      fetchAnalytics();
    }
  }, [activeTab, bookings]);

  // --- API Handlers ---

  // 1. Create a booking
  const handleNewBooking = async (bookingData: any) => {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });

    if (!res.ok) {
      const err = await res.json();
      throw err;
    }

    await fetchData();
    await fetchAnalytics();
  };

  // 2. Booking Check-In
  const handleCheckIn = async (bookingId: string) => {
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/check-in`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Check-in failed');
        return;
      }

      await fetchData();
      await fetchAnalytics();
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Booking Check-Out (Release early)
  const handleCheckOut = async (bookingId: string) => {
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/check-out`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Check-out failed');
        return;
      }

      await fetchData();
      await fetchAnalytics();
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Cancel failed');
        return;
      }

      await fetchData();
      await fetchAnalytics();
    } catch (err) {
      console.error(err);
    }
  };

  // 5. IT Acknowledge asset receipt
  const handleAcknowledgeAsset = async (assetId: string) => {
    try {
      const res = await fetch(`${API_BASE}/assets/${assetId}/acknowledge`, {
        method: 'POST'
      });

      if (!res.ok) {
        throw new Error('Acknowledgment failed');
      }

      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // 6. IT Report device issue
  const handleReportIssue = async (assetId: string, description: string) => {
    if (!currentUser) return;

    const res = await fetch(`${API_BASE}/assets/${assetId}/report-problem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, userId: currentUser.id })
    });

    if (!res.ok) {
      throw new Error('Failed to submit ticket');
    }

    await fetchData();
  };

  // 7. Admin Assign Asset
  const handleAssignAsset = async (assetId: string, userId: string) => {
    const res = await fetch(`${API_BASE}/assets/${assetId}/handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!res.ok) {
      throw new Error('Failed to assign asset');
    }

    await fetchData();
  };

  // 8. Admin Resolve IT ticket
  const handleResolveTicket = async (ticketId: string, returnToStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/assets/tickets/${ticketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnToStatus })
      });

      if (!res.ok) {
        throw new Error('Resolve failed');
      }

      await fetchData();
      await fetchAnalytics();
      alert('Issue resolved! Device returned to storage/employee.');
    } catch (err) {
      console.error(err);
    }
  };

  // 9. Admin HR Offboarding
  const handleOffboardUser = async (userId: string) => {
    const res = await fetch(`${API_BASE}/admin/offboard/${userId}`, {
      method: 'POST'
    });

    if (!res.ok) {
      throw new Error('Offboarding failed');
    }

    return await res.json();
  };

  // 10. Space Designer: Place Desk
  const handleAddDesk = async (deskData: any) => {
    const res = await fetch(`${API_BASE}/desks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deskData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to place desk');
    }
    await fetchData();
  };

  // 11. Space Designer: Delete Desk
  const handleDeleteDesk = async (deskId: string) => {
    const res = await fetch(`${API_BASE}/desks/${deskId}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete desk');
    }
    await fetchData();
  };

  // 12. Space Designer: Create Room
  const handleAddRoom = async (roomData: any) => {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create room');
    }
    await fetchData();
  };

  // 13. Space Designer: Delete Room
  const handleDeleteRoom = async (roomId: string) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete room');
    }
    await fetchData();
  };

  // 14. IT Asset Register
  const handleRegisterAsset = async (assetData: any) => {
    const res = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assetData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register asset');
    }
    await fetchData();
  };

  // 15. IT Asset Decommission
  const handleDecommissionAsset = async (assetId: string) => {
    const res = await fetch(`${API_BASE}/assets/${assetId}/decommission`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to decommission asset');
    }
    await fetchData();
  };

  // 16. IT Asset Update
  const handleUpdateAsset = async (assetId: string, assetData: any) => {
    const res = await fetch(`${API_BASE}/assets/${assetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assetData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update asset');
    }
    await fetchData();
  };

  // Render view
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', color: 'white' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-indigo)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Connecting to Booking & Asset Services...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', color: 'white', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🔌</div>
        <h2 style={{ fontSize: '1.25rem' }}>Backend Connection Required</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '0.85rem' }}>
          {error}. Make sure the Node server is running on port 5050.
        </p>
        <button onClick={fetchData} className="btn btn-primary" style={{ marginTop: '1rem' }}>Retry Connection</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* HEADER */}
      <header className="header glass-panel">
        <div className="logo">
          <span>❖ spaceops</span>
        </div>

        {/* Mock Auth switcher (HR, IT, Employee view mapping) */}
        {currentUser && (
          <div className="role-switcher-container">
            <span className="role-switcher-label">Switch Profile:</span>
            <select
              className="role-select"
              value={currentUser.id}
              onChange={(e) => {
                const selected = users.find(u => u.id === e.target.value);
                if (selected) {
                  setCurrentUser(selected);
                  // Auto redirect if user lacks permission for admin panel
                  if (selected.role !== 'IT Admin' && selected.role !== 'HR Manager' && activeTab === 'admin') {
                    setActiveTab('bookings');
                  }
                }
              }}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role} - {u.title})
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* NAVIGATION TABS */}
      <nav className="nav-tabs">
        <div 
          onClick={() => setActiveTab('home')} 
          className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
        >
          🏠 Home
        </div>
        <div 
          onClick={() => setActiveTab('bookings')} 
          className={`nav-tab ${activeTab === 'bookings' ? 'active' : ''}`}
        >
          🗓️ Booking Engine
        </div>
        <div 
          onClick={() => setActiveTab('backpack')} 
          className={`nav-tab ${activeTab === 'backpack' ? 'active' : ''}`}
        >
          🎒 My Backpack
        </div>
        <div 
          onClick={() => setActiveTab('admin')} 
          className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
        >
          🛡️ Admin Console {currentUser?.role !== 'IT Admin' && currentUser?.role !== 'HR Manager' && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>(Read-Only)</span>}
        </div>
      </nav>

      {/* CORE PAGES VIEWS */}
      <main style={{ marginBottom: '4rem' }}>
        
        {activeTab === 'home' && (
          <Homepage 
            currentUser={currentUser} 
            onNavigate={(tab) => setActiveTab(tab)} 
          />
        )}

        {activeTab === 'bookings' && currentUser && (
          <BookingPanel
            desks={desks}
            rooms={rooms}
            bookings={bookings}
            currentUserId={currentUser.id}
            onNewBooking={handleNewBooking}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onCancelBooking={handleCancelBooking}
          />
        )}

        {activeTab === 'backpack' && currentUser && (
          <TechBackpack
            assets={assets}
            userId={currentUser.id}
            onAcknowledge={handleAcknowledgeAsset}
            onSubmitTicket={handleReportIssue}
          />
        )}

        {activeTab === 'admin' && currentUser && (
          <AdminDashboard
            users={users}
            assets={assets}
            tickets={tickets}
            desks={desks}
            rooms={rooms}
            bookings={bookings}
            currentUserId={currentUser.id}
            analytics={analytics}
            onAssignAsset={handleAssignAsset}
            onResolveTicket={handleResolveTicket}
            onOffboardUser={handleOffboardUser}
            onAddDesk={handleAddDesk}
            onDeleteDesk={handleDeleteDesk}
            onAddRoom={handleAddRoom}
            onDeleteRoom={handleDeleteRoom}
            onRegisterAsset={handleRegisterAsset}
            onDecommissionAsset={handleDecommissionAsset}
            onUpdateAsset={handleUpdateAsset}
            onRefreshData={fetchData}
          />
        )}

      </main>

    </div>
  );
}
