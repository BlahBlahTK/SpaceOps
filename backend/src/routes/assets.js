import express from 'express';
import { getAssets, updateAsset, addTicket, getTickets, getUsers, addAsset } from '../db.js';

const router = express.Router();

// GET /api/assets - list all assets, optionally filtered by user (Backpack view)
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const assets = await getAssets();
    
    if (userId) {
      // Filter for specific employee's backpack (only assigned and not decommissioned)
      const employeeAssets = assets.filter(a => a.assignedTo === userId && a.status !== 'Decommissioned');
      return res.json(employeeAssets);
    }
    
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/assets - register a new hardware asset in storage
router.post('/', async (req, res) => {
  try {
    const { name, serialNumber, condition, warrantyUntil } = req.body;
    if (!name || !serialNumber) {
      return res.status(400).json({ error: 'Name and Serial Number are required' });
    }
    
    const assets = await getAssets();
    if (assets.some(a => a.serialNumber === serialNumber.toUpperCase())) {
      return res.status(409).json({ error: 'An asset with this serial number already exists' });
    }
    
    const newAsset = {
      id: `asset-${Date.now()}`,
      name,
      serialNumber: serialNumber.toUpperCase(),
      status: 'New',
      assignedTo: null,
      condition: condition || 'New',
      warrantyUntil: warrantyUntil || new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      handoverAcknowledged: false
    };
    
    const saved = await addAsset(newAsset);
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/assets/:id/handover - assign asset to employee (IT flow)
router.post('/:id/handover', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required for handover' });
    }

    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const updated = await updateAsset(id, {
      status: 'Assigned',
      assignedTo: userId,
      handoverAcknowledged: false, // Triggers notification in employee backpack
      condition: 'Assigned'
    });

    if (!updated) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/assets/:id/acknowledge - acknowledge handover receipt (Employee flow)
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const assets = await getAssets();
    const asset = assets.find(a => a.id === id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.handoverAcknowledged) {
      return res.status(400).json({ error: 'Asset receipt already acknowledged' });
    }

    const updated = await updateAsset(id, {
      handoverAcknowledged: true
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/assets/:id/report-problem - file a repair ticket (Employee flow)
router.post('/:id/report-problem', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, userId } = req.body;

    if (!description || !userId) {
      return res.status(400).json({ error: 'Description and User ID are required' });
    }

    const assets = await getAssets();
    const asset = assets.find(a => a.id === id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'Reporter employee not found' });
    }

    // Create ticket
    const newTicket = {
      id: `ticket-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      assetId: asset.id,
      assetName: asset.name,
      serialNumber: asset.serialNumber,
      reportedBy: userId,
      reportedByName: user.name,
      description,
      status: 'Open',
      createdAt: new Date().toISOString()
    };

    const ticket = await addTicket(newTicket);

    // Update asset condition to In Repair and remove assignee (optional, or keep assign but set In Repair)
    await updateAsset(asset.id, {
      condition: 'In Repair',
      status: 'In Repair'
    });

    res.status(201).json({ ticket, asset });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tickets - list all tickets (IT view)
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await getTickets();
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tickets/:id/resolve - resolve ticket (IT flow)
router.post('/tickets/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { returnToStatus } = req.body; // 'Assigned' or 'New' (in storage)

    const tickets = await getTickets();
    const ticketIdx = tickets.findIndex(t => t.id === id);

    if (ticketIdx === -1) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    tickets[ticketIdx].status = 'Resolved';
    tickets[ticketIdx].resolvedAt = new Date().toISOString();

    const ticket = tickets[ticketIdx];
    
    // Put asset back in service
    const status = returnToStatus || 'New';
    const condition = status === 'Assigned' ? 'Assigned' : 'New';
    const assignedTo = status === 'Assigned' ? ticket.reportedBy : null;

    await updateAsset(ticket.assetId, {
      status,
      condition,
      assignedTo,
      handoverAcknowledged: status === 'Assigned' ? true : false
    });

    // Save directly since tickets are part of DB
    const { saveDb } = await import('../db.js');
    await saveDb();

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/assets/:id/decommission - decommission asset
router.post('/:id/decommission', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateAsset(id, {
      status: 'Decommissioned',
      assignedTo: null,
      condition: 'Decommissioned'
    });
    if (!updated) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/assets/:id - edit asset details in storage
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, serialNumber, condition, warrantyUntil } = req.body;
    
    if (!name || !serialNumber) {
      return res.status(400).json({ error: 'Name and Serial Number are required' });
    }

    const assets = await getAssets();
    // Validate serial number uniqueness (exclude current asset)
    if (assets.some(a => a.id !== id && a.serialNumber === serialNumber.toUpperCase())) {
      return res.status(409).json({ error: 'Another asset with this serial number already exists' });
    }

    const updated = await updateAsset(id, {
      name,
      serialNumber: serialNumber.toUpperCase(),
      condition,
      warrantyUntil
    });

    if (!updated) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
