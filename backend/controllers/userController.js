const ScannedUser = require('../models/User');

async function getUsers(req, res, next) {
  try {
    const users = await ScannedUser.find().sort({ lastSync: -1 }).lean();
    res.json({ status: 'success', count: users.length, data: users });
  } catch (error) { next(error); }
}

async function syncUsers(req, res, next) {
  try {
    const { clients, sourceDeviceTag } = req.body;
    if (!Array.isArray(clients) || !sourceDeviceTag) {
      return res.status(400).json({ status: 'fail', message: 'clients array and sourceDeviceTag are required.' });
    }
    for (const [index, client] of clients.entries()) {
      if (!client.username || !client.assignedIP || !client.macAddress) {
        return res.status(400).json({ status: 'fail', message: `Client at index ${index} is missing username, assignedIP or macAddress.` });
      }
    }
    const operations = clients.map(client => ({
      updateOne: {
        filter: { macAddress: String(client.macAddress).toUpperCase() },
        update: { $set: {
          username: client.username,
          assignedIP: client.assignedIP,
          macAddress: String(client.macAddress).toUpperCase(),
          sourceDeviceTag,
          status: client.status || 'Active',
          lastSync: new Date()
        }},
        upsert: true
      }
    }));
    if (operations.length) await ScannedUser.bulkWrite(operations, { ordered: false });
    res.json({ status: 'success', syncedCount: clients.length, source: sourceDeviceTag });
  } catch (error) { next(error); }
}

module.exports = { getUsers, syncUsers };
