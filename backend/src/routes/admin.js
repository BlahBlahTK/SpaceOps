import express from 'express';
import { getBookings, getAssets, getDesks, getRooms, updateBooking, updateAsset, saveDb } from '../db.js';

const router = express.Router();

// GET /api/admin/analytics - compute utilization analytics
router.get('/analytics', async (req, res) => {
  try {
    const bookings = await getBookings();
    const assets = await getAssets();
    const desks = await getDesks();
    const rooms = await getRooms();

    const now = new Date();

    // 1. Calculate current occupancy
    // Find active bookings (started <= now <= ended, and status is checked-in or pending-check-in)
    const activeBookings = bookings.filter(b => {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return (now >= start && now <= end) && ['checked-in', 'pending-check-in'].includes(b.status);
    });

    const occupiedDesks = new Set(activeBookings.filter(b => b.resourceType === 'desk').map(b => b.resourceId));
    const occupiedRooms = new Set(activeBookings.filter(b => b.resourceType === 'room').map(b => b.resourceId));

    const occupancyStats = {
      desksTotal: desks.length,
      desksOccupied: occupiedDesks.size,
      desksEmpty: desks.length - occupiedDesks.size,
      roomsTotal: rooms.length,
      roomsOccupied: occupiedRooms.size,
      roomsEmpty: rooms.length - occupiedRooms.size
    };

    // 2. Busiest Days (over all bookings)
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
    
    bookings.forEach(b => {
      if (['cancelled', 'released'].includes(b.status) && !b.releasedAt) return; // Ignore early cancels
      const date = new Date(b.startTime);
      const dayName = daysOfWeek[date.getDay()];
      if (dayCounts[dayName] !== undefined) {
        dayCounts[dayName]++;
      }
    });

    const busiestDays = Object.entries(dayCounts).map(([day, count]) => ({ day, count }));

    // 3. Room Popularity (number of bookings per room)
    const roomPopularity = {};
    rooms.forEach(r => { roomPopularity[r.name] = 0; });

    bookings.forEach(b => {
      if (b.resourceType === 'room') {
        const room = rooms.find(r => r.id === b.resourceId);
        if (room) {
          roomPopularity[room.name] = (roomPopularity[room.name] || 0) + 1;
        }
      }
    });

    const popularRooms = Object.entries(roomPopularity).map(([name, count]) => ({ name, count }));

    // 4. Desk equipment distribution (IT metadata)
    const assetConditions = {
      New: assets.filter(a => a.condition === 'New').length,
      Assigned: assets.filter(a => a.condition === 'Assigned').length,
      'In Repair': assets.filter(a => a.condition === 'In Repair').length,
      Decommissioned: assets.filter(a => a.condition === 'Decommissioned').length
    };

    res.json({
      occupancyStats,
      busiestDays,
      popularRooms,
      assetConditions,
      totalBookingsCount: bookings.filter(b => b.status !== 'cancelled').length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/offboard/:userId - HR One-Click Offboarding
router.post('/offboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();

    const bookings = await getBookings();
    const assets = await getAssets();

    // 1. Pull user's assets and return them to storage
    const userAssets = assets.filter(a => a.assignedTo === userId);
    const returnedAssets = [];

    for (const asset of userAssets) {
      await updateAsset(asset.id, {
        status: 'New', // Available in inventory
        assignedTo: null,
        handoverAcknowledged: false,
        condition: 'New' // Refreshed condition
      });
      returnedAssets.push({ id: asset.id, name: asset.name, serialNumber: asset.serialNumber });
    }

    // 2. Cancel all future bookings
    // Future booking: starts after now, or is currently pending check-in and starting today/future
    const userBookings = bookings.filter(b => b.userId === userId && !['cancelled', 'released', 'completed'].includes(b.status));
    const cancelledBookings = [];

    for (const booking of userBookings) {
      const start = new Date(booking.startTime);
      // Cancel bookings starting in the future, or active/pending bookings being cleared
      if (start >= now || booking.status === 'pending-check-in') {
        await updateBooking(booking.id, {
          status: 'cancelled'
        });
        cancelledBookings.push({
          id: booking.id,
          resourceId: booking.resourceId,
          resourceType: booking.resourceType,
          startTime: booking.startTime
        });
      }
    }

    await saveDb();

    res.json({
      message: `Employee offboarded successfully.`,
      returnedAssets,
      cancelledBookings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
