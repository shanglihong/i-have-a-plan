import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 统一处理 RFC 7807 错误格式
    if (error.response?.data?.type && error.response?.data?.title) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
);
