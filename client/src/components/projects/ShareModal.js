import React, { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Lock, Calendar, Download } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ShareModal = ({ project, isOpen, onClose }) => {
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    expiresAt: '',
    maxDownloads: ''
  });
  const [editFormData, setEditFormData] = useState({
    password: '',
    expiresAt: '',
    maxDownloads: ''
  });

  useEffect(() => {
    if (isOpen && project) {
      fetchExistingShare();
    }
  }, [isOpen, project]);

  const fetchExistingShare = async () => {
    try {
      const response = await axios.get(`/api/shares/project/${project._id}`);
      if (response.data) {
        setShare(response.data);
      }
    } catch (error) {
      // Kein Share vorhanden
    }
  };

  const handleCreateShare = async () => {
    setLoading(true);
    try {
      console.log('Creating share for project:', project._id);
      console.log('Form data:', formData);
      
      const response = await axios.post(`/api/shares/project/${project._id}`, formData);
      console.log('Share created successfully:', response.data);
      
      setShare(response.data);
      toast.success('Share-Link erfolgreich erstellt');
    } catch (error) {
      console.error('Error creating share:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen des Share-Links');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShare = async () => {
    if (!window.confirm('Möchten Sie diesen Share-Link wirklich löschen?')) {
      return;
    }

    try {
      await axios.delete(`/api/shares/${share.shareId}`);
      setShare(null);
      toast.success('Share-Link erfolgreich gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen des Share-Links');
    }
  };

  const handleEditShare = async () => {
    setLoading(true);
    try {
      const response = await axios.put(`/api/shares/${share.shareId}`, editFormData);
      setShare(response.data);
      setEditing(false);
      toast.success('Share-Link erfolgreich aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Share-Links');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    setEditFormData({
      password: share.password || '',
      expiresAt: share.expiresAt ? new Date(share.expiresAt).toISOString().slice(0, 16) : '',
      maxDownloads: share.maxDownloads || ''
    });
    setEditing(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Link in Zwischenablage kopiert');
  };

  const getShareUrl = () => {
    return `${window.location.origin}/share/${share.shareId}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Projekt teilen</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!share ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort (optional)
              </label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-field"
                placeholder="Leer lassen für öffentlichen Zugriff"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ablaufdatum (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximale Downloads (optional)
              </label>
              <input
                type="number"
                value={formData.maxDownloads}
                onChange={(e) => setFormData({ ...formData, maxDownloads: e.target.value })}
                className="input-field"
                placeholder="Unbegrenzt"
                min="1"
              />
            </div>

            <button
              onClick={handleCreateShare}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Wird erstellt...' : 'Share-Link erstellen'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Share-Link</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(getShareUrl())}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={getShareUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <p className="text-sm text-gray-600 break-all">{getShareUrl()}</p>
            </div>

            <div className="space-y-2">
              {share.password && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Lock className="w-4 h-4" />
                  <span>Passwort-geschützt</span>
                </div>
              )}
              
              {share.expiresAt && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Läuft ab: {new Date(share.expiresAt).toLocaleDateString('de-DE')}</span>
                </div>
              )}
              
              {share.maxDownloads && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Download className="w-4 h-4" />
                  <span>Downloads: {share.currentDownloads || 0} / {share.maxDownloads}</span>
                </div>
              )}
              
              {!share.maxDownloads && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Download className="w-4 h-4" />
                  <span>Downloads: {share.currentDownloads || 0} (unbegrenzt)</span>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={startEditing}
                className="btn-secondary flex-1"
              >
                Bearbeiten
              </button>
              <button
                onClick={handleDeleteShare}
                className="btn-danger flex-1"
              >
                Link löschen
              </button>
            </div>
          </div>
        )}

        {share && editing && (
          <div className="space-y-4 mt-4 border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900">Share-Einstellungen bearbeiten</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort (optional)
              </label>
              <input
                type="text"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                className="input-field"
                placeholder="Leer lassen für öffentlichen Zugriff"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ablaufdatum (optional)
              </label>
              <input
                type="datetime-local"
                value={editFormData.expiresAt}
                onChange={(e) => setEditFormData({ ...editFormData, expiresAt: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximale Downloads (optional)
              </label>
              <input
                type="number"
                value={editFormData.maxDownloads}
                onChange={(e) => setEditFormData({ ...editFormData, maxDownloads: e.target.value })}
                className="input-field"
                placeholder="Unbegrenzt"
                min="1"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleEditShare}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Wird gespeichert...' : 'Speichern'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn-secondary flex-1"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {share && !editing && (
          <div className="flex justify-center mt-4">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Schließen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
