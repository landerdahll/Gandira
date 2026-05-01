import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send refresh_token cookie
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ──────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: auto-refresh on 401 ─────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token?: string) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint = original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        Cookies.set('access_token', data.accessToken, { secure: true, sameSite: 'strict' });
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);
        Cookies.remove('access_token');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Typed API helpers ──────────────────────────────────────────────────────

export const eventsApi = {
  list: (params?: Record<string, any>) => api.get('/events', { params }),
  get: (slug: string) => api.get(`/events/${slug}`),
  create: (data: any) => api.post('/events', data),
  publish: (id: string) => api.patch(`/events/${id}/publish`),
  cancel: (id: string) => api.patch(`/events/${id}/cancel`),
  myEvents: (params?: any) => api.get('/events/producer/my-events', { params }),
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/events/upload-image', form, { headers: { 'Content-Type': undefined } });
  },
};

export const batchesApi = {
  create: (eventId: string, data: any) => api.post(`/events/${eventId}/batches`, data),
  list: (eventId: string) => api.get(`/events/${eventId}/batches`),
  update: (eventId: string, batchId: string, data: any) => api.patch(`/events/${eventId}/batches/${batchId}`, data),
};

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/users/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

export const ordersApi = {
  create: (data: any) => api.post('/orders', data),
  list: (params?: any) => api.get('/orders', { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  cancel: (id: string, reason?: string) => api.delete(`/orders/${id}`, { data: { reason } }),
};

export const ticketsApi = {
  list: (params?: any) => api.get('/tickets', { params }),
  get: (id: string) => api.get(`/tickets/${id}`),
};

export const checkinApi = {
  scan: (eventId: string, token: string) =>
    api.post(`/events/${eventId}/checkin/scan`, { token }),
};

export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  event: (eventId: string) => api.get(`/reports/events/${eventId}`),
};

export const usersApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: { name?: string; email?: string; phone?: string; gender?: string; birthDate?: string }) =>
    api.patch('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/users/me/password', data),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/users/me/avatar', form, { headers: { 'Content-Type': undefined } });
  },
  removeAvatar: () => api.delete('/users/me/avatar'),
};

export const adminApi = {
  listUsers: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    api.get('/users', { params }),
  promoteProducer: (id: string) => api.patch(`/users/${id}/promote-producer`),
  promoteStaff:    (id: string) => api.patch(`/users/${id}/promote-staff`),
  demote:          (id: string) => api.patch(`/users/${id}/demote`),
  resetPassword:   (id: string) => api.patch(`/users/${id}/reset-password`),
};
