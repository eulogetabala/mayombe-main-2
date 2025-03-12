import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://www.api-mayombe.mayombe-app.com/public/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
