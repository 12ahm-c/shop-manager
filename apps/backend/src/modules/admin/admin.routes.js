const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const Log = require('./log.model');
const Store = require('../stores/store.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const notifController = require('../notifications/notification.controller');
const { addBackupJob } = require('../../jobs/queue.service');

// GET /v1/admin/logs
router.get('/logs', authenticate, requireRole('admin', 'accountant'), async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const cursor = req.query.cursor || null;

    const filter = { storeId };
    if (cursor) {
      filter._id = { $lt: cursor };
    }

    const logs = await Log.find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = logs.length > limit;
    if (hasMore) logs.pop();

    const nextCursor = hasMore ? logs[logs.length - 1]._id : null;

    return sendSuccess(res, logs, { limit, nextCursor, hasMore });
  } catch (error) {
    next(error);
  }
});

// GET /v1/admin/settings
router.get('/settings', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const store = await Store.findById(req.user.storeId).select('settings').lean();
    if (!store) {
      return sendError(res, 'NOT_FOUND', 'Store not found', null, 404);
    }
    return sendSuccess(res, store.settings);
  } catch (error) {
    next(error);
  }
});

// PUT /v1/admin/settings
router.put('/settings', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const allowedFields = ['loyaltyPointsPer100', 'loyaltyRedeemRate', 'vatRate', 'lowStockThresholdPercent'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[`settings.${field}`] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'No valid settings fields provided', null, 400);
    }

    const store = await Store.findByIdAndUpdate(
      req.user.storeId,
      { $set: updates },
      { new: true }
    ).select('settings').lean();

    return sendSuccess(res, store.settings);
  } catch (error) {
    next(error);
  }
});

// GET /v1/admin/stores
router.get('/stores', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const store = await Store.findById(req.user.storeId).lean();
    if (!store) {
      return sendError(res, 'NOT_FOUND', 'Store not found', null, 404);
    }
    return sendSuccess(res, store);
  } catch (error) {
    next(error);
  }
});

// POST /v1/admin/backup
router.post('/backup', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await addBackupJob({ storeId: req.user.storeId, triggeredBy: req.user.id });
    return sendSuccess(res, {
      message: 'Backup job queued',
      note: 'Backup runs asynchronously via BullMQ worker (mongodump)'
    });
  } catch (error) {
    next(error);
  }
});

// GET /v1/admin/alerts
router.get('/alerts', authenticate, requireRole('admin'), notifController.getAdminAlerts);

module.exports = router;
