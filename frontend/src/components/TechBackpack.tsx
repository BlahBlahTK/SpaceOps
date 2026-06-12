import React, { useState } from 'react';

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

interface TechBackpackProps {
  assets: Asset[];
  userId: string;
  onAcknowledge: (assetId: string) => Promise<void>;
  onSubmitTicket: (assetId: string, description: string) => Promise<void>;
}

export const TechBackpack: React.FC<TechBackpackProps> = ({
  assets,
  userId,
  onAcknowledge,
  onSubmitTicket
}) => {
  const [reportingAsset, setReportingAsset] = useState<Asset | null>(null);
  const [problemDescription, setProblemDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter items in my backpack
  const myAssets = assets.filter(a => a.assignedTo === userId && a.status !== 'Decommissioned');

  // Helper to calculate days to warranty expiration
  const getWarrantyCountdown = (dateString: string) => {
    const today = new Date();
    const expiry = new Date(dateString);
    const timeDiff = expiry.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) {
      return { text: 'Expired', color: '#EF4444', days: daysDiff };
    } else if (daysDiff <= 90) {
      return { text: `${daysDiff} days left (Expiring soon)`, color: '#F59E0B', days: daysDiff };
    } else {
      return { text: `${daysDiff} days left`, color: '#10B981', days: daysDiff };
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingAsset || !problemDescription.trim()) return;

    setSubmitting(true);
    try {
      await onSubmitTicket(reportingAsset.id, problemDescription);
      setReportingAsset(null);
      setProblemDescription('');
    } catch (err) {
      console.error(err);
      alert('Failed to report issue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Pending Handovers Notification Banner */}
      {myAssets.some(a => !a.handoverAcknowledged) && (
        <div 
          className="pulse-glow" 
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            padding: '1.25rem 2rem',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h4 style={{ color: 'white', fontWeight: '800', marginBottom: '0.25rem', fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>
              📥 New Hardware Assigned!
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              IT has assigned new device(s) to you. Please acknowledge receipt to create your digital paper trail.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {myAssets.filter(a => !a.handoverAcknowledged).map(asset => (
              <button
                key={asset.id}
                onClick={() => onAcknowledge(asset.id)}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', background: 'var(--grad-violet)' }}
              >
                Acknowledge {asset.name} (S/N: {asset.serialNumber})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Backpack Inventory */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'white', fontFamily: 'var(--font-display)' }}>
              🎒 Your Tech Backpack
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              These are the hardware assets assigned to you by IT.
            </p>
          </div>
          <span className="badge badge-info" style={{ padding: '0.4rem 1rem' }}>
            {myAssets.length} Assets
          </span>
        </div>

        {myAssets.length === 0 ? (
          <div 
            className="glass-panel" 
            style={{ 
              textAlign: 'center', 
              padding: '4rem 2rem', 
              color: 'var(--text-secondary)',
              fontSize: '0.95rem'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            Your backpack is currently empty. Contact IT to assign hardware.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {myAssets.map(asset => {
              const warranty = getWarrantyCountdown(asset.warrantyUntil);
              return (
                <div key={asset.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', color: 'white', fontWeight: '700', marginBottom: '0.25rem' }}>
                        {asset.name}
                      </h3>
                      <code style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        S/N: {asset.serialNumber}
                      </code>
                    </div>
                    
                    {asset.handoverAcknowledged ? (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Acknowledged</span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Pending Receipt</span>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Condition:</span>
                      <span style={{ color: 'white', fontWeight: '600' }}>{asset.condition}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Warranty Status:</span>
                      <span style={{ color: warranty.color, fontWeight: '600' }}>{warranty.text}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                    {!asset.handoverAcknowledged && (
                      <button
                        onClick={() => onAcknowledge(asset.id)}
                        className="btn btn-primary"
                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.55rem 1rem' }}
                      >
                        Confirm Receipt
                      </button>
                    )}
                    <button
                      onClick={() => setReportingAsset(asset)}
                      className="btn btn-secondary"
                      style={{ 
                        flex: asset.handoverAcknowledged ? 1 : 'none', 
                        fontSize: '0.8rem', 
                        padding: '0.55rem 1rem', 
                        borderColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#F87171' 
                      }}
                    >
                      Report a Problem
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Problem Modal Overlay */}
      {reportingAsset && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.8)',
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
              maxWidth: '500px', 
              width: '100%', 
              padding: '2rem',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'white', fontFamily: 'var(--font-display)' }}>
                🛠️ Report a Device Problem
              </h3>
              <button 
                onClick={() => setReportingAsset(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Device Name</label>
                <input type="text" className="form-input" value={reportingAsset.name} disabled style={{ opacity: 0.7 }} />
              </div>

              <div className="form-group">
                <label>Serial Number (Pre-filled)</label>
                <input type="text" className="form-input" value={reportingAsset.serialNumber} disabled style={{ opacity: 0.7, fontFamily: 'monospace' }} />
              </div>

              <div className="form-group">
                <label>Describe the Problem</label>
                <textarea
                  className="form-input"
                  required
                  rows={4}
                  placeholder="Describe the issue you're experiencing with this hardware (e.g. key is sticky, display is flickering, battery draining fast)..."
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setReportingAsset(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !problemDescription.trim()}
                  className="btn btn-danger"
                  style={{ flex: 2, background: 'var(--accent-rose)' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Repair Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
