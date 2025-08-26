const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'system'],
    default: 'text'
  },
  fileInfo: {
    filename: String,
    originalName: String,
    size: Number,
    mimeType: String
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index für bessere Performance
messageSchema.index({ project: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

// Virtuelle Eigenschaft für Dateigröße in lesbarer Form
messageSchema.virtual('fileSizeFormatted').get(function() {
  if (!this.fileInfo || !this.fileInfo.size) return null;
  const bytes = this.fileInfo.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

messageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Message', messageSchema);
