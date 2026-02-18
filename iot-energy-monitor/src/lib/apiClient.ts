// API Client for Django REST Framework backend

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  /** Field-level validation errors (field name -> list of messages) */
  details?: Record<string, string[]>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private setTokens(access: string, refresh: string): void {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access) {
          localStorage.setItem('access_token', data.access);
          return true;
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    const url = `${this.baseURL}${endpoint}`;
    const isFormData = options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      let response = await fetch(url, {
        ...options,
        headers,
      });

      // If 401, try to refresh token and retry once
      if (response.status === 401 && token) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          const newToken = this.getAuthToken();
          if (newToken) {
            const retryHeaders: Record<string, string> = {
              ...headers,
              'Authorization': `Bearer ${newToken}`,
            };
            response = await fetch(url, {
              ...options,
              headers: retryHeaders,
            });
          }
        } else {
          // Refresh failed, clear tokens and redirect to login
          this.clearTokens();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return { error: 'Authentication failed. Please login again.' };
        }
      }

      // 204 No Content: success with no body (e.g. DELETE) — do not parse body
      if (response.status === 204 || response.status === 205) {
        return {};
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          // If JSON parsing fails, return error
          return {
            error: `Invalid JSON response from server (HTTP ${response.status})`,
          };
        }
      } else {
        // Non-JSON response (likely HTML error page or empty)
        const text = await response.text();
        return {
          error: `Server returned non-JSON response (HTTP ${response.status}). ${text.substring(0, 100)}`,
        };
      }

      if (!response.ok) {
        if (response.status === 401) {
          return {
            error: data.detail || data.error || data.message || 'Authentication credentials were not provided.',
            message: data.message,
          };
        }
        // 400 validation: surface field errors for forms
        const details = response.status === 400 && typeof data === 'object' && data !== null
          ? (data as Record<string, unknown>)
          : undefined;
        const firstDetail = details && typeof details === 'object'
          ? (Object.values(details).flat().find((m): m is string => typeof m === 'string') || null)
          : null;
        const errorMessage =
          data.error || data.message || (Array.isArray(data.detail) ? data.detail[0] : data.detail) || firstDetail
          || `Request failed (${response.status})`;
        return {
          error: typeof errorMessage === 'string' ? errorMessage : String(errorMessage),
          message: data.message,
          details: details as Record<string, string[]> | undefined,
        };
      }

      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      // Provide more specific error messages
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return {
          error: `Cannot connect to backend API at ${url}. Please ensure the backend server is running at ${this.baseURL}`,
        };
      }
      return {
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patchForm<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: formData,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  logout(): void {
    this.clearTokens();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
