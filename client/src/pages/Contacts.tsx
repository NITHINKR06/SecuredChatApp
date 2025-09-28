import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Star, 
  MessageCircle, 
  Phone,
  Video,
  MoreVertical,
  Users,
  Heart,
  Ban,
  Check,
  X,
  Mail
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

interface Contact {
  _id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: string;
  isFavorite: boolean;
  isBlocked: boolean;
}

const Contacts: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [favorites, setFavorites] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContactUsername, setNewContactUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'blocked'>('all');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/contacts');
      if (response.data.success) {
        const allContacts = response.data.data || [];
        setContacts(allContacts);
        setFavorites(allContacts.filter((c: Contact) => c.isFavorite));
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContactUsername.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/user/contacts/add', {
        username: newContactUsername.toLowerCase()
      });

      if (response.data.success) {
        setSuccess('Contact added successfully!');
        setNewContactUsername('');
        setShowAddModal(false);
        loadContacts();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (contactId: string) => {
    try {
      const response = await api.post(`/user/contacts/${contactId}/favorite`);
      if (response.data.success) {
        loadContacts();
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const blockContact = async (contactId: string) => {
    try {
      const response = await api.post(`/user/contacts/${contactId}/block`);
      if (response.data.success) {
        loadContacts();
      }
    } catch (error) {
      console.error('Failed to block contact:', error);
    }
  };

  const startChat = (contact: Contact) => {
    // Create or open conversation with contact
    navigate('/chat', { state: { contactId: contact._id } });
  };

  const startVoiceCall = (contact: Contact) => {
    // Initiate voice call
    navigate('/call/voice', { state: { contactId: contact._id, type: 'voice' } });
  };

  const startVideoCall = (contact: Contact) => {
    // Initiate video call
    navigate('/call/video', { state: { contactId: contact._id, type: 'video' } });
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          contact.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'favorites') return matchesSearch && contact.isFavorite;
    if (activeTab === 'blocked') return matchesSearch && contact.isBlocked;
    return matchesSearch && !contact.isBlocked;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="mr-4"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Contact</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Success/Error Messages */}
        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-green-800">{success}</span>
          </Alert>
        )}

        {error && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <X className="w-4 h-4 text-red-600" />
            <span className="text-red-800">{error}</span>
          </Alert>
        )}

        {/* Search and Tabs */}
        <Card className="mb-6">
          <div className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                All ({contacts.filter(c => !c.isBlocked).length})
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'favorites'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Star className="w-4 h-4 inline mr-2" />
                Favorites ({favorites.length})
              </button>
              <button
                onClick={() => setActiveTab('blocked')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'blocked'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Ban className="w-4 h-4 inline mr-2" />
                Blocked ({contacts.filter(c => c.isBlocked).length})
              </button>
            </div>
          </div>
        </Card>

        {/* Contacts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading contacts...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? 'No contacts found matching your search' : 'No contacts yet'}
              </p>
              {!searchQuery && activeTab === 'all' && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowAddModal(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Your First Contact
                </Button>
              )}
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <Card key={contact._id} className="hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {contact.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(contact.status)} rounded-full border-2 border-white`}></div>
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900">{contact.displayName}</h3>
                        <p className="text-sm text-gray-500">@{contact.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFavorite(contact._id)}
                      className="text-gray-400 hover:text-yellow-500 transition-colors"
                    >
                      <Star className={`w-5 h-5 ${contact.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <Mail className="w-4 h-4 mr-1" />
                    {contact.email}
                  </div>

                  {contact.status === 'offline' && contact.lastSeen && (
                    <p className="text-xs text-gray-400 mb-3">
                      Last seen: {new Date(contact.lastSeen).toLocaleString()}
                    </p>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => startChat(contact)}
                      disabled={contact.isBlocked}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => startVoiceCall(contact)}
                      disabled={contact.isBlocked}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => startVideoCall(contact)}
                      disabled={contact.isBlocked}
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                    <div className="relative group">
                      <Button
                        size="sm"
                        variant="outline"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={() => blockContact(contact._id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          {contact.isBlocked ? 'Unblock' : 'Block'} Contact
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Add New Contact</h2>
              <p className="text-gray-600 mb-4">
                Enter the username of the person you want to add to your contacts.
              </p>
              <Input
                type="text"
                placeholder="Enter username (e.g., johndoe)"
                value={newContactUsername}
                onChange={(e) => setNewContactUsername(e.target.value.toLowerCase())}
                className="mb-4"
                autoFocus
              />
              {error && (
                <Alert className="mb-4 bg-red-50 border-red-200">
                  <span className="text-red-800">{error}</span>
                </Alert>
              )}
              <div className="flex space-x-3">
                <Button
                  onClick={handleAddContact}
                  disabled={loading || !newContactUsername.trim()}
                  className="flex-1"
                >
                  {loading ? 'Adding...' : 'Add Contact'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewContactUsername('');
                    setError(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Contacts;
