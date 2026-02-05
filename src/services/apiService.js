/**
 * Centralized API Service for Mayombe App
 * Handles timeouts, network errors, and consistent response formats.
 */

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const DEFAULT_TIMEOUT = 12000; // 12 seconds

class ApiService {
  /**
   * Enhanced fetch with timeout support
   * @param {string} endpoint - API endpoint (relative to BASE_URL)
   * @param {object} options - Fetch options
   * @param {number} timeoutMS - Custom timeout in milliseconds
   */
  async request(endpoint, options = {}, timeoutMS = DEFAULT_TIMEOUT) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    // Create an AbortController for timing out the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMS);

    const fetchOptions = {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    try {
      console.log(`🌐 API ${fetchOptions.method || 'GET'}: ${url}`);
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw {
          status: response.status,
          message: data?.message || data?.error || `Error HTTP: ${response.status}`,
          data: data,
          type: 'api_error'
        };
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw {
          message: 'Délai d\'attente dépassé. Veuillez vérifier votre connexion.',
          type: 'timeout'
        };
      }
      
      if (error.type === 'api_error') {
        throw error;
      }

      // Network error or other unexpected error
      throw {
        message: 'Impossible de contacter le serveur. Êtes-vous connecté ?',
        type: 'network_error',
        originalError: error.message
      };
    }
  }

  // Helper methods
  get(endpoint, options = {}, timeout) {
    return this.request(endpoint, { ...options, method: 'GET' }, timeout);
  }

  post(endpoint, body, options = {}, timeout) {
    return this.request(endpoint, { 
      ...options, 
      method: 'POST', 
      body: JSON.stringify(body) 
    }, timeout);
  }

  put(endpoint, body, options = {}, timeout) {
    return this.request(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: JSON.stringify(body) 
    }, timeout);
  }

  delete(endpoint, options = {}, timeout) {
    return this.request(endpoint, { ...options, method: 'DELETE' }, timeout);
  }
}

export default new ApiService();
