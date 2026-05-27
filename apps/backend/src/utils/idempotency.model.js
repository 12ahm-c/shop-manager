const mongoose = require('mongoose');

const idempotencySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    requestPath: { type: String, required: true },
    requestBodyHash: { type: String, required: true },
    responseStatus: { type: Number, required: true },
    responseBody: { type: mongoose.Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now, expires: 86400 } // 24 hours TTL in MongoDB
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Index for key
idempotencySchema.index({ key: 1 });

module.exports = mongoose.model('Idempotency', idempotencySchema);
