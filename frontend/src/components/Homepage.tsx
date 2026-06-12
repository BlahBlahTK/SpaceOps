import React from 'react';

interface User {
  name: string;
  role: string;
  title: string;
}

interface HomepageProps {
  currentUser: User | null;
  onNavigate: (tab: 'bookings' | 'backpack' | 'admin') => void;
}

export const Homepage: React.FC<HomepageProps> = ({ currentUser, onNavigate }) => {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', padding: '1rem 0' }}>
      
      {/* Hero Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '3.5rem 2.5rem', 
          textAlign: 'center', 
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.4) 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glowing background highlights */}
        <div style={{ position: 'absolute', top: '-20%', left: '30%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '20%', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', filter: 'blur(50px)', pointerEvents: 'none' }} />

        <h1 
          style={{ 
            fontSize: '3.5rem', 
            fontWeight: '800', 
            background: 'linear-gradient(to right, #22D3EE, #8B5CF6, #EC4899)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.03em'
          }}
        >
          Welcome to SpaceOps
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
          Your unified headquarters for real-time desk bookings, IT hardware asset tracking, and workplace optimization.
        </p>

        {currentUser && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1.25rem', borderRadius: '30px', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            Logged in as <strong style={{ color: 'white' }}>{currentUser.name}</strong> ({currentUser.title})
          </div>
        )}
      </div>

      {/* Grid Menu Options */}
      <div>
        <h2 style={{ fontSize: '1.35rem', color: 'white', fontFamily: 'var(--font-display)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Operations Portal
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          
          {/* Card 1: Booking Engine */}
          <div 
            onClick={() => onNavigate('bookings')}
            className="glass-panel" 
            style={{ 
              padding: '2.5rem 2rem', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.25rem',
              minHeight: '260px'
            }}
          >
            <div style={{ fontSize: '2.5rem' }}>🗓️</div>
            <div>
              <h3 style={{ fontSize: '1.35rem', color: 'white', fontWeight: '700', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
                Desk & Room Booking
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                Access the interactive 2D office blueprint map to book standing desks, huddle spaces, and boardroom meeting rooms. Includes check-in countdown releases.
              </p>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontWeight: '700', fontSize: '0.85rem' }}>
              Launch Engine &rarr;
            </div>
          </div>

          {/* Card 2: Tech Backpack */}
          <div 
            onClick={() => onNavigate('backpack')}
            className="glass-panel" 
            style={{ 
              padding: '2.5rem 2rem', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.25rem',
              minHeight: '260px'
            }}
          >
            <div style={{ fontSize: '2.5rem' }}>🎒</div>
            <div>
              <h3 style={{ fontSize: '1.35rem', color: 'white', fontWeight: '700', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
                Employee Tech Backpack
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                View your assigned IT hardware and warranty states. Acknowledge digital handovers for paper trail compliance, or report a device issue to IT.
              </p>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-violet)', fontWeight: '700', fontSize: '0.85rem' }}>
              Open Backpack &rarr;
            </div>
          </div>

          {/* Card 3: Admin Dashboard */}
          <div 
            onClick={() => onNavigate('admin')}
            className="glass-panel" 
            style={{ 
              padding: '2.5rem 2rem', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.25rem',
              minHeight: '260px'
            }}
          >
            <div style={{ fontSize: '2.5rem' }}>🛡️</div>
            <div>
              <h3 style={{ fontSize: '1.35rem', color: 'white', fontWeight: '700', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
                Unified Admin Console
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                View workspace occupancy graphs, resolve hardware tickets, trigger HR employee offboard cancellations, and access the interactive Seating Plan Designer.
              </p>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EC4899', fontWeight: '700', fontSize: '0.85rem' }}>
              Enter Console &rarr;
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
