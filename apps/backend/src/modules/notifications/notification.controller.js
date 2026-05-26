const Notification = require('./notification.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

const getMyNotifications = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unread === 'true';

    const filter = { storeId };
    if (unreadOnly) filter.isRead = false;

    filter.$or = [
      { targetUserId: req.user.id },
      { targetUserId: null, targetRole: req.user.role }
    ];

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter)
    ]);

    return sendSuccess(res, notifications, {
      page, limit, total,
      hasMore: skip + notifications.length < total
    });
  } catch (error) {
    next(error);
  }
};

const markOneRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return sendError(res, 'NOT_FOUND', 'Notification not found', null, 404);
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = notification.targetUserId && notification.targetUserId.toString() === req.user.id;
    if (!isAdmin && !isOwner) {
      return sendError(res, 'FORBIDDEN', 'Access denied', null, 403);
    }

    notification.isRead = true;
    await notification.save();

    return sendSuccess(res, { _id: notification._id, isRead: true });
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const filter = { storeId, isRead: false };
    filter.$or = [
      { targetUserId: req.user.id },
      { targetUserId: null, targetRole: req.user.role }
    ];

    const result = await Notification.updateMany(filter, { isRead: true });
    return sendSuccess(res, { modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

const getAdminAlerts = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;

    const alerts = await Notification.aggregate([
      { $match: { storeId, isRead: false, targetRole: 'admin' } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } }
    ]);

    const summary = {
      stock_critical: 0,
      out_of_stock: 0,
      debt_overdue: 0,
      low_wallet: 0,
      whatsapp_failed: 0
    };
    for (const alert of alerts) {
      summary[alert.type] = alert.count;
    }

    return sendSuccess(res, {
      alerts,
      summary,
      total: alerts.reduce((sum, a) => sum + a.count, 0)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyNotifications, markOneRead, markAllRead, getAdminAlerts };
