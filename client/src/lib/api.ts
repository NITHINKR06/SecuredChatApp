import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v1`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async startRegistration(email: string, username: string, displayName: string) {
    const response = await this.client.post('/auth/register/start', {
      email,
      username,
      displayName,
    });
    return response.data;
  }

  async finishRegistration(response: any) {
    const apiResponse = await this.client.post('/auth/register/finish', {
      response,
    });
    return apiResponse.data;
  }

  async startLogin(email: string) {
    const response = await this.client.post('/auth/login/start', {
      email,
    });
    return response.data;
  }

  async finishLogin(response: any) {
    const apiResponse = await this.client.post('/auth/login/finish', {
      response,
    });
    return apiResponse.data;
  }

  async logout() {
    const response = await this.client.post('/auth/logout');
    return response.data;
  }

  // User endpoints
  async getCurrentUser() {
    const response = await this.client.get('/user/me');
    return response.data;
  }

  async getUserDevices() {
    const response = await this.client.get('/user/devices');
    return response.data;
  }

  async removeDevice(credentialId: string) {
    const response = await this.client.delete(`/user/devices/${credentialId}`);
    return response.data;
  }

  async getUserSessions() {
    const response = await this.client.get('/user/sessions');
    return response.data;
  }

  async revokeSession(sessionId: string) {
    const response = await this.client.delete(`/user/sessions/${sessionId}`);
    return response.data;
  }

  async revokeAllOtherSessions() {
    const response = await this.client.delete('/user/sessions');
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();

// Generic API instance for direct HTTP calls
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Setup interceptors for the generic api instance
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// OAuth URLs
export const getOAuthUrl = (provider: 'google' | 'github') => {
  return `${API_BASE_URL}/api/v1/oauth/${provider}`;
};
