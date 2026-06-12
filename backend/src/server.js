import express from 'express';
import cors from 'cors';
import { getBookings, updateBooking, getUsers, saveDb } from './db.js';

import bookingRoutes from './routes/bookings.js';
import assetRoutes from './routes/assets.js';
import adminRoutes from './routes/admin.js';
import resourceRoutes from './routes/resources.js';

const app = express();
const PORT = process.env.PORT || 5050;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Inject routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', resourceRoutes);

// General User list endpoint (for frontend User Switcher)
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root check endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'running', timestamp: new Date().toISOString() });
});

// --- Background Auto-Release Worker ---
// Runs every 30 seconds to clean up "ghost bookings"
async function checkGhostBookings() {
  try {
    const bookings = await getBookings();
    const now = new Date();
    let hasChanges = false;

    for (const booking of bookings) {
      if (booking.status === 'pending-check-in') {
        const start = new Date(booking.startTime);
        const diffMins = (now.getTime() - start.getTime()) / (60 * 1000);

        // If booking started more than 15 minutes ago and hasn't checked in, auto-release it
        if (diffMins > 15) {
          console.log(`[Auto-Release] Releasing ghost booking ${booking.id} (${booking.resourceType} ${booking.resourceId}) assigned to ${booking.userName}. Missed check-in window.`);
          booking.status = 'released';
          booking.releasedAt = now.toISOString();
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await saveDb();
    }
  } catch (err) {
    console.error('[Auto-Release Error]', err);
  }
}

// Start background task
const AUTO_RELEASE_INTERVAL = 30000; // 30 seconds
setInterval(checkGhostBookings, AUTO_RELEASE_INTERVAL);

// Start server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`SpaceOps Booking Engine & IT Asset API server running on port ${PORT}`);
  console.log(`Ghost Booking check running every 30 seconds...`);
  console.log(`=======================================================`);
});
