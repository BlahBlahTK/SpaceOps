import express from 'express';
import { getBookings, addBooking, updateBooking, getUsers } from '../db.js';

const router = express.Router();

// Helper to check for booking conflicts
function hasConflict(existingBookings, newBooking) {
  const newStart = new Date(newBooking.startTime);
  const newEnd = new Date(newBooking.endTime);

  for (const b of existingBookings) {
    // Ignore cancelled or released bookings
    if (['cancelled', 'released'].includes(b.status)) continue;
    
    // Ignore different resource
    if (b.resourceId !== newBooking.resourceId) continue;

    // Parse existing booking dates
    const extStart = new Date(b.startTime);
    const extEnd = new Date(b.endTime);

    // 1. Check for standard overlap (direct collision in time)
    // Overlap formula: (StartA < EndB) and (EndA > StartB)
    const isOverlapping = (newStart < extEnd) && (newEnd > extStart);

    // 2. Check for recurring collision
    if (b.isRecurring || newBooking.isRecurring) {
      // If either booking is recurring, check day of week conflict
      const newDay = newStart.getDay();
      const extDay = extStart.getDay();

      if (b.isRecurring && newBooking.isRecurring) {
        // Both recurring: conflict if they land on same day/time pattern
        if (b.recurringDay === newBooking.recurringDay) {
          // Compare only time components of start/end
          const newStartMins = newStart.getHours() * 60 + newStart.getMinutes();
          const newEndMins = newEnd.getHours() * 60 + newEnd.getMinutes();
          const extStartMins = extStart.getHours() * 60 + extStart.getMinutes();
          const extEndMins = extEnd.getHours() * 60 + extEnd.getMinutes();

          if ((newStartMins < extEndMins) && (newEndMins > extStartMins)) {
            return true;
          }
        }
      } else if (b.isRecurring) {
        // Existing is recurring, new is single instance
        if (b.recurringDay === newDay) {
          const newStartMins = newStart.getHours() * 60 + newStart.getMinutes();
          const newEndMins = newEnd.getHours() * 60 + newEnd.getMinutes();
          const extStartMins = extStart.getHours() * 60 + extStart.getMinutes();
          const extEndMins = extEnd.getHours() * 60 + extEnd.getMinutes();

          if ((newStartMins < extEndMins) && (newEndMins > extStartMins)) {
            return true;
          }
        }
      } else {
        // Existing is single, new is recurring
        if (newBooking.recurringDay === extDay) {
          const newStartMins = newStart.getHours() * 60 + newStart.getMinutes();
          const newEndMins = newEnd.getHours() * 60 + newEnd.getMinutes();
          const extStartMins = extStart.getHours() * 60 + extStart.getMinutes();
          const extEndMins = extEnd.getHours() * 60 + extEnd.getMinutes();

          if ((newStartMins < extEndMins) && (newEndMins > extStartMins)) {
            return true;
          }
        }
      }
    } else {
      // Both are single instance
      if (isOverlapping) return true;
    }
  }

  return false;
}

// GET /api/bookings - get all bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await getBookings();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings - create a booking
router.post('/', async (req, res) => {
  try {
    const {
      resourceId,
      resourceType,
      userId,
      startTime,
      endTime,
      isRecurring,
      recurringPattern,
      title
    } = req.body;

    if (!resourceId || !resourceType || !userId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const startDate = new Date(startTime);
    const recurringDay = isRecurring ? startDate.getDay() : null;

    const newBooking = {
      id: `booking-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      resourceId,
      resourceType,
      userId,
      userName: user.name,
      startTime,
      endTime,
      status: 'pending-check-in',
      checkedInAt: null,
      releasedAt: null,
      isRecurring: !!isRecurring,
      recurringPattern: isRecurring ? (recurringPattern || 'weekly') : null,
      recurringDay,
      title: title || `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Booking`
    };

    const bookings = await getBookings();
    if (hasConflict(bookings, newBooking)) {
      return res.status(409).json({ error: 'This time slot is already booked for this resource' });
    }

    const saved = await addBooking(newBooking);
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings/:id/check-in - check in to booking
router.post('/:id/check-in', async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'pending-check-in') {
      return res.status(400).json({ error: `Cannot check in. Booking status is ${booking.status}` });
    }

    // Check if within check-in window (started <= 15 mins ago, and hasn't ended yet)
    const now = new Date();
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);

    // If current time is past booking end, it's expired
    if (now > end) {
      return res.status(400).json({ error: 'Booking has already ended' });
    }

    // Relaxed check: can check in early or within 15 minutes of start.
    // If start is in the future, we allow early check-in (great for UX).
    // If start is in the past, verify it is within 15 minutes.
    const diffMins = (now.getTime() - start.getTime()) / (60 * 1000);
    if (diffMins > 15) {
      // Releasing booking because check-in window missed
      await updateBooking(id, { status: 'released', releasedAt: now.toISOString() });
      return res.status(400).json({ error: 'Check-in window (15 mins) exceeded. Booking released.' });
    }

    const updated = await updateBooking(id, {
      status: 'checked-in',
      checkedInAt: now.toISOString()
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings/:id/check-out - check out (release early)
router.post('/:id/check-out', async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!['pending-check-in', 'checked-in'].includes(booking.status)) {
      return res.status(400).json({ error: 'Booking is not active' });
    }

    const now = new Date();
    const updated = await updateBooking(id, {
      status: 'released',
      releasedAt: now.toISOString(),
      endTime: now.toISOString() // End booking now to make resource available
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/bookings/:id - cancel a booking
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updated = await updateBooking(id, { status: 'cancelled' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
