const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const File = require('../models/File');
const Project = require('../models/Project');
const { authenticateToken, requireUploadPermission } = require('../middleware/auth');

const router = express.Router();

// Multer Konfiguration für Datei-Uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB Limit
  },
  fileFilter: (req, file, cb) => {
    // Erlaubte Dateitypen
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip', 'application/x-rar-compressed',
      'video/mp4', 'video/avi', 'video/mov',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Dateityp nicht erlaubt'), false);
    }
  }
});

// Dateien eines Projekts abrufen
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }

    // Prüfen ob Benutzer Zugriff hat
    const hasAccess = project.owner.toString() === req.user.id ||
                     project.collaborators.some(collab => collab.user.toString() === req.user.id) ||
                     project.isPublic;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    const files = await File.find({ project: req.params.projectId })
      .populate('uploadedBy', 'username')
      .sort({ uploadedAt: -1 });

    res.json(files);
  } catch (error) {
    console.error('Fehler beim Laden der Dateien:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Datei hochladen
router.post('/upload/:projectId', [
  authenticateToken,
  requireUploadPermission,
  upload.single('file')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Keine Datei hochgeladen' });
    }

    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }

    // Prüfen ob Benutzer Upload-Berechtigung hat
    const canUpload = project.owner.toString() === req.user.id ||
                     project.collaborators.some(collab => 
                       collab.user.toString() === req.user.id && 
                       ['write', 'admin'].includes(collab.permission)
                     );

    if (!canUpload) {
      return res.status(403).json({ message: 'Keine Upload-Berechtigung für dieses Projekt' });
    }

    const file = new File({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      project: req.params.projectId,
      uploadedBy: req.user.id
    });

    await file.save();

    // Automatische Chat-Nachricht für Datei-Upload
    try {
      const Message = require('../models/Message');
      const message = new Message({
        project: req.params.projectId,
        sender: req.user.id,
        content: `hat die Datei "${req.file.originalname}" hochgeladen`,
        messageType: 'system',
        fileInfo: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype
        }
      });
      await message.save();
    } catch (error) {
      console.error('Fehler beim Erstellen der Chat-Nachricht:', error);
    }

    const populatedFile = await File.findById(file._id)
      .populate('uploadedBy', 'username');

    res.status(201).json(populatedFile);
  } catch (error) {
    console.error('Fehler beim Hochladen der Datei:', error);
    res.status(500).json({ message: 'Server Fehler beim Hochladen' });
  }
});

// Datei herunterladen
router.get('/download/:fileId', authenticateToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId)
      .populate('project')
      .populate('uploadedBy', 'username');

    if (!file) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    // Prüfen ob Benutzer Zugriff hat
    const project = file.project;
    const hasAccess = project.owner.toString() === req.user.id ||
                     project.collaborators.some(collab => collab.user.toString() === req.user.id) ||
                     project.isPublic ||
                     file.isPublic;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    // Download zählen
    file.downloads += 1;
    await file.save();

    // Datei senden
    res.download(file.path, file.originalName, (err) => {
      if (err) {
        console.error('Fehler beim Herunterladen:', err);
        res.status(500).json({ message: 'Fehler beim Herunterladen' });
      }
    });
  } catch (error) {
    console.error('Fehler beim Herunterladen:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Datei löschen
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId)
      .populate('project');

    if (!file) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    const project = file.project;
    
    // Prüfen ob Benutzer Lösch-Berechtigung hat
    const canDelete = project.owner.toString() === req.user.id ||
                     project.collaborators.some(collab => 
                       collab.user.toString() === req.user.id && 
                       collab.permission === 'admin'
                     ) ||
                     file.uploadedBy.toString() === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ message: 'Keine Berechtigung zum Löschen' });
    }

    // Datei vom Dateisystem löschen
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.error('Fehler beim Löschen der Datei vom Dateisystem:', error);
    }

    // Datei aus der Datenbank löschen
    await File.findByIdAndDelete(req.params.fileId);

    res.json({ message: 'Datei erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Datei:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Datei-Informationen aktualisieren
router.put('/:fileId', [
  authenticateToken,
  require('express-validator').body('isPublic').optional().isBoolean()
], async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId)
      .populate('project');

    if (!file) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    const project = file.project;
    
    // Prüfen ob Benutzer Bearbeitungs-Berechtigung hat
    const canEdit = project.owner.toString() === req.user.id ||
                   project.collaborators.some(collab => 
                     collab.user.toString() === req.user.id && 
                     ['write', 'admin'].includes(collab.permission)
                   ) ||
                   file.uploadedBy.toString() === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ message: 'Keine Berechtigung zum Bearbeiten' });
    }

    const { isPublic, tags } = req.body;

    if (isPublic !== undefined) file.isPublic = isPublic;
    if (tags) file.tags = tags;

    await file.save();

    const updatedFile = await File.findById(file._id)
      .populate('uploadedBy', 'username');

    res.json(updatedFile);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Datei:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

module.exports = router;
