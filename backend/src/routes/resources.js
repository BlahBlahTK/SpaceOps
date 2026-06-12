import express from 'express';
import { getDesks, addDesk, deleteDesk, getRooms, addRoom, deleteRoom } from '../db.js';

const router = express.Router();

// --- DESK ENDPOINTS ---

// GET /api/desks
router.get('/desks', async (req, res) => {
  try {
    const desks = await getDesks();
    res.json(desks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/desks (Seating Plan builder)
router.post('/desks', async (req, res) => {
  try {
    const { name, zone, equipment, cx, cy } = req.body;

    if (!name || !cx || !cy) {
      return res.status(400).json({ error: 'Name, coordinate X (cx) and Y (cy) are required' });
    }

    const deskId = `desk-${Date.now()}`;
    const newDesk = {
      id: deskId,
      name,
      zone: zone || 'Default Zone',
      equipment: equipment || [],
      cx: Number(cx),
      cy: Number(cy)
    };

    const saved = await addDesk(newDesk);
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/desks/:id
router.delete('/desks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteDesk(id);
    res.json({ message: `Desk ${id} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- ROOM ENDPOINTS ---

// GET /api/rooms
router.get('/rooms', async (req, res) => {
  try {
    const rooms = await getRooms();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rooms
router.post('/rooms', async (req, res) => {
  try {
    const { name, zone, capacity, amenities } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({ error: 'Name and Capacity are required' });
    }

    const roomId = `room-${Date.now()}`;
    const newRoom = {
      id: roomId,
      name,
      zone: zone || 'Default Zone',
      capacity: Number(capacity),
      amenities: amenities || []
    };

    const saved = await addRoom(newRoom);
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/rooms/:id
router.delete('/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteRoom(id);
    res.json({ message: `Room ${id} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
