const mongoose = require('mongoose');
const crypto = require('crypto');

const shareSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shareId: {
    type: String,
    unique: true
  },
  password: {
    type: String,
    required: false
  },
  expiresAt: {
    type: Date,
    required: false
  },
  maxDownloads: {
    type: Number,
    required: false
  },
  currentDownloads: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date
  }
}, {
  timestamps: true
});

// Index für bessere Performance
shareSchema.index({ shareId: 1 });
shareSchema.index({ project: 1 });
shareSchema.index({ expiresAt: 1 });

// Share ID generieren
shareSchema.pre('save', function(next) {
  if (!this.shareId) {
    this.shareId = crypto.randomBytes(16).toString('hex');
  }
  next();
});

// Password hashen falls vorhanden
shareSchema.pre('save', function(next) {
  if (this.password && this.isModified('password')) {
    this.password = crypto.createHash('sha256').update(this.password).digest('hex');
  }
  next();
});

// Password überprüfen
shareSchema.methods.checkPassword = function(password) {
  if (!this.password) return true;
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  return this.password === hashedPassword;
};

// Prüfen ob Share noch gültig ist
shareSchema.methods.isValid = function() {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  if (this.maxDownloads && this.currentDownloads >= this.maxDownloads) return false;
  return true;
};

// Download zählen
shareSchema.methods.incrementDownloads = function() {
  this.currentDownloads += 1;
  this.lastAccessed = new Date();
  return this.save();
};

module.exports = mongoose.model('Share', shareSchema);
