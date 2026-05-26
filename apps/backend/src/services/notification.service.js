const Notification = require('../modules/notifications/notification.model');

const ANTI_SPAM_WINDOWS = {
  stock_critical: 30 * 60 * 1000,
  out_of_stock: 60 * 60 * 1000,
  debt_overdue: 24 * 60 * 60 * 1000,
  low_wallet: 6 * 60 * 60 * 1000,
  whatsapp_failed: 60 * 60 * 1000
};

async function createNotification({ storeId, type, message, targetRole, targetUserId, relatedEntity, io }) {
  if (!ANTI_SPAM_WINDOWS[type]) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  const recent = await Notification.findOne({
    storeId,
    type,
    'relatedEntity.productId': relatedEntity?.productId || null,
    'relatedEntity.customerId': relatedEntity?.customerId || null,
    'relatedEntity.walletId': relatedEntity?.walletId || null,
    createdAt: { $gte: new Date(Date.now() - ANTI_SPAM_WINDOWS[type]) }
  }).lean();

  if (recent) return null;

  const [notif] = await Notification.create([{
    storeId,
    type,
    message,
    targetRole: targetRole || 'admin',
    targetUserId: targetUserId || null,
    relatedEntity: relatedEntity || {}
  }]);

  if (io) {
    const room = targetUserId ? `employee:${targetUserId}` : `admin:${storeId}`;
    io.to(room).emit('notification', {
      _id: notif._id,
      type: notif.type,
      message: notif.message,
      createdAt: notif.createdAt
    });
  }

  return notif;
}

async function getUnreadCount(storeId, userId, role) {
  const filter = { storeId, isRead: false };
  filter.$or = [
    { targetUserId: userId },
    { targetUserId: null, targetRole: role }
  ];
  return Notification.countDocuments(filter);
}

module.exports = { createNotification, getUnreadCount };
