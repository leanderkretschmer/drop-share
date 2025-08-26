import React, { useState, useEffect, useRef } from 'react';
import { Send, File, Download, Edit, Trash2, MoreVertical } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const ChatPanel = ({ projectId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchMessages();
    }
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/chat/project/${projectId}?page=${pageNum}&limit=50`);
      
      if (pageNum === 1) {
        setMessages(response.data.messages);
      } else {
        setMessages(prev => [...response.data.messages, ...prev]);
      }
      
      setHasMore(response.data.pagination.page < response.data.pagination.pages);
      setPage(response.data.pagination.page);
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
      toast.error('Fehler beim Laden der Nachrichten');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await axios.post(`/api/chat/project/${projectId}`, {
        content: newMessage.trim()
      });
      
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
    } catch (error) {
      toast.error('Fehler beim Senden der Nachricht');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId, content) => {
    try {
      const response = await axios.put(`/api/chat/${messageId}`, {
        content: content.trim()
      });
      
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? response.data : msg
      ));
      setEditingMessage(null);
      toast.success('Nachricht bearbeitet');
    } catch (error) {
      toast.error('Fehler beim Bearbeiten der Nachricht');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Möchten Sie diese Nachricht wirklich löschen?')) {
      return;
    }

    try {
      await axios.delete(`/api/chat/${messageId}`);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      toast.success('Nachricht gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen der Nachricht');
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Gestern';
    } else {
      return date.toLocaleDateString('de-DE');
    }
  };

  const canEditMessage = (message) => {
    return message.sender._id === user.id || user.isAdmin;
  };

  const canDeleteMessage = (message) => {
    return message.sender._id === user.id || user.isAdmin;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Projekt-Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4" style={{ maxHeight: '400px' }}>
        {hasMore && (
          <button
            onClick={() => fetchMessages(page + 1)}
            disabled={loading}
            className="w-full text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            {loading ? 'Lädt...' : 'Ältere Nachrichten laden'}
          </button>
        )}

        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${message.sender._id === user.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md ${message.sender._id === user.id ? 'order-2' : 'order-1'}`}>
              {message.sender._id !== user.id && (
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-700">
                      {message.sender.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{message.sender.username}</span>
                </div>
              )}

              <div className={`relative group ${
                message.sender._id === user.id 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              } rounded-lg p-3`}>
                
                {editingMessage === message._id ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleEditMessage(message._id, editingMessage);
                  }}>
                    <input
                      type="text"
                      defaultValue={message.content}
                      className="w-full bg-transparent border-none outline-none"
                      autoFocus
                      onBlur={() => setEditingMessage(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingMessage(null);
                      }}
                    />
                  </form>
                ) : (
                  <div>
                    {message.messageType === 'system' ? (
                      <div className="flex items-center space-x-2">
                        <File className="w-4 h-4" />
                        <span className="text-sm italic">{message.content}</span>
                        {message.fileInfo && (
                          <span className="text-xs opacity-75">
                            ({message.fileInfo.originalName})
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    
                    {message.isEdited && (
                      <span className="text-xs opacity-75 ml-2">(bearbeitet)</span>
                    )}
                  </div>
                )}

                {/* Message Actions */}
                <div className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                  message.sender._id === user.id ? 'text-white' : 'text-gray-600'
                }`}>
                  <div className="flex space-x-1">
                    {canEditMessage(message) && editingMessage !== message._id && (
                      <button
                        onClick={() => setEditingMessage(message._id)}
                        className="hover:opacity-75"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                    {canDeleteMessage(message) && (
                      <button
                        onClick={() => handleDeleteMessage(message._id)}
                        className="hover:opacity-75"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className={`text-xs text-gray-500 mt-1 ${message.sender._id === user.id ? 'text-right' : 'text-left'}`}>
                {formatTime(message.createdAt)}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="pt-4 border-t border-gray-200 mt-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nachricht eingeben..."
            className="flex-1 input-field"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="btn-primary flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
