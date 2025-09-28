import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, MessageCircle, Settings, LogOut, Shield, Key, Globe } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const Dashboard: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNavigateToChat = () => {
    navigate('/chat');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-semibold">{user.username || user.displayName}</span>
              </span>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info Card */}
        <Card className="mb-8">
          <div className="p-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {(user.username || user.displayName || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="ml-4">
                <h2 className="text-2xl font-bold text-gray-900">{user.displayName || user.username}</h2>
                <p className="text-gray-600">@{user.username}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={handleNavigateToChat}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <MessageCircle className="w-10 h-10 text-blue-600" />
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat</h3>
              <p className="text-gray-600 text-sm">Start conversations and connect with others</p>
              <Button className="mt-4 w-full" onClick={handleNavigateToChat}>
                Open Chat
              </Button>
            </div>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/contacts')}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-10 h-10 text-green-600" />
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Contacts</h3>
              <p className="text-gray-600 text-sm">Manage your contacts and connections</p>
              <Button className="mt-4 w-full" variant="outline" onClick={() => navigate('/contacts')}>
                View Contacts
              </Button>
            </div>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/settings')}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Settings className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Settings</h3>
              <p className="text-gray-600 text-sm">Manage your account and preferences</p>
              <Button className="mt-4 w-full" variant="outline" onClick={() => navigate('/settings')}>
                Open Settings
              </Button>
            </div>
          </Card>
        </div>

        {/* Security Info */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Information</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <Key className="w-5 h-5 text-gray-500 mr-3" />
                  <span className="text-gray-700">Authentication Method</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {user.hasAuthenticators ? 'WebAuthn' : 'OAuth'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <Globe className="w-5 h-5 text-gray-500 mr-3" />
                  <span className="text-gray-700">Last Login</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {new Date().toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-gray-500 mr-3" />
                  <span className="text-gray-700">Account Status</span>
                </div>
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
