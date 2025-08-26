import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, Download, File, Calendar, Users, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ShareView = () => {
  const { shareId } = useParams();
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchShareData();
  }, [shareId]);

  useEffect(() => {
    if (shareData && !shareData.requiresPassword) {
      console.log('Share data loaded, fetching files...');
      fetchFiles();
    }
  }, [shareData]);

  useEffect(() => {
    console.log('Files state updated:', files);
  }, [files]);

  const fetchShareData = async () => {
    try {
      setLoading(true);
      console.log('Fetching share data for:', shareId);
      const response = await axios.get(`/api/shares/${shareId}`);
      console.log('Share data response:', response.data);
      setShareData(response.data);
    } catch (error) {
      console.error('Fehler beim Laden des Shares:', error);
      if (error.response?.status === 410) {
        toast.error('Dieser Share-Link ist nicht mehr verfügbar');
      } else {
        toast.error('Share-Link nicht gefunden');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      console.log('Fetching files for share:', shareId);
      const response = await axios.get(`/api/shares/${shareId}/files`);
      console.log('Files response:', response.data);
      console.log('Number of files:', response.data.length);
      setFiles(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Dateien:', error);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setVerifying(true);
    try {
      console.log('Verifying password for share:', shareId);
      const response = await axios.post(`/api/shares/${shareId}/verify`, {
        password: password.trim()
      });
      
      console.log('Password verification successful:', response.data);
      setShareData(response.data);
      console.log('Calling fetchFiles after password verification');
      fetchFiles();
      toast.success('Zugriff gewährt');
    } catch (error) {
      console.error('Password verification failed:', error);
      toast.error('Falsches Passwort');
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await axios.get(`/api/shares/${shareId}/download/${fileId}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download gestartet');
    } catch (error) {
      console.error('Download-Fehler:', error);
      toast.error('Fehler beim Download');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Share-Link nicht gefunden</h3>
          <p className="text-gray-600">Der angeforderte Share-Link existiert nicht oder ist nicht mehr verfügbar.</p>
        </div>
      </div>
    );
  }

  if (shareData.requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mb-6">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Passwort erforderlich
            </h2>
            <p className="text-gray-600">
              Dieser Share-Link ist passwortgeschützt
            </p>
          </div>

          <div className="card">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">{shareData.projectName}</h3>
              {shareData.projectDescription && (
                <p className="text-sm text-gray-600 mt-1">{shareData.projectDescription}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Geteilt von {shareData.createdBy}
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Passwort eingeben"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={verifying || !password.trim()}
                className="btn-primary w-full"
              >
                {verifying ? 'Wird überprüft...' : 'Zugreifen'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a
              href="/"
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </a>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {shareData.share.project.name}
              </h1>
              {shareData.share.project.description && (
                <p className="text-gray-600 mt-1">
                  {shareData.share.project.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Files Section */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Dateien ({files.length})
            </h2>

            {files.length === 0 ? (
              <div className="text-center py-8">
                <File className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">Keine Dateien verfügbar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file._id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <File className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.originalName}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span>Hochgeladen von {file.uploadedBy.username}</span>
                          <span>{formatDate(file.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDownload(file._id, file.originalName)}
                      className="btn-primary text-sm flex items-center space-x-1"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Share-Informationen
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Geteilt von</p>
                  <p className="text-sm text-gray-600">{shareData.share.createdBy.username}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Geteilt am</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(shareData.share.createdAt)}
                  </p>
                </div>
              </div>

              {shareData.share.expiresAt && (
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Läuft ab</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(shareData.share.expiresAt)}
                    </p>
                  </div>
                </div>
              )}

              {shareData.share.maxDownloads && (
                <div className="flex items-center space-x-3">
                  <Download className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Downloads</p>
                    <p className="text-sm text-gray-600">
                      {shareData.share.currentDownloads} / {shareData.share.maxDownloads}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareView;
