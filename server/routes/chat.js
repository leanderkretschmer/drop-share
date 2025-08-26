const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Project = require('../models/Project');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Nachrichten eines Projekts abrufen
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ project: req.params.projectId })
      .populate('sender', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ project: req.params.projectId });

    res.json({
      messages: messages.reverse(), // Älteste zuerst
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Nachrichten:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Neue Nachricht senden
router.post('/project/:projectId', [
  authenticateToken,
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Nachricht muss zwischen 1 und 1000 Zeichen lang sein')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

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

    const { content, messageType = 'text', fileInfo } = req.body;

    const message = new Message({
      project: req.params.projectId,
      sender: req.user.id,
      content,
      messageType,
      fileInfo
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Fehler beim Senden der Nachricht:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Nachricht bearbeiten
router.put('/:messageId', [
  authenticateToken,
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Nachricht muss zwischen 1 und 1000 Zeichen lang sein')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const message = await Message.findById(req.params.messageId)
      .populate('project');

    if (!message) {
      return res.status(404).json({ message: 'Nachricht nicht gefunden' });
    }

    // Prüfen ob Benutzer Zugriff hat
    const project = message.project;
    const hasAccess = project.owner.toString() === req.user.id ||
                     project.collaborators.some(collab => 
                       collab.user.toString() === req.user.id && 
                       ['write', 'admin'].includes(collab.permission)
                     );

    if (!hasAccess && message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    const { content } = req.body;

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('sender', 'username');

    res.json(updatedMessage);
  } catch (error) {
    console.error('Fehler beim Bearbeiten der Nachricht:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Nachricht löschen
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId)
      .populate('project');

    if (!message) {
      return res.status(404).json({ message: 'Nachricht nicht gefunden' });
    }

    // Prüfen ob Benutzer Zugriff hat
    const project = message.project;
    const hasAccess = project.owner.toString() === req.user.id ||
                     project.collaborators.some(collab => 
                       collab.user.toString() === req.user.id && 
                       collab.permission === 'admin'
                     );

    if (!hasAccess && message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    await Message.findByIdAndDelete(req.params.messageId);

    res.json({ message: 'Nachricht erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Nachricht:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// System-Nachricht senden (für Datei-Uploads, etc.)
router.post('/project/:projectId/system', authenticateToken, async (req, res) => {
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

    const { content, fileInfo } = req.body;

    const message = new Message({
      project: req.params.projectId,
      sender: req.user.id,
      content,
      messageType: 'system',
      fileInfo
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Fehler beim Senden der System-Nachricht:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

module.exports = router;
