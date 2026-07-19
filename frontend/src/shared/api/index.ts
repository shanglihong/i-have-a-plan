import axios from 'axios';
import { ApiError } from './error';

export * from './types';
export * from './error';

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 统一封装解析为 ApiError 实例
    const apiError = ApiError.fromAxiosError(error);
    return Promise.reject(apiError);
  }
);

