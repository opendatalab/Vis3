import type { AxiosError, AxiosResponse } from 'axios';
import axios from 'axios';
/**
 * @param response
 * @returns
 */
export function successHandler(response: AxiosResponse<any>) {
  return response.data
}

function errorHandler(error: AxiosError) {
  if (error.response?.status === 401 && !window.location.pathname.includes('/login') && window.__CONFIG__.ENABLE_AUTH) {
    window.location.href = '/login'
  }

  return Promise.reject(error)
}

const requestConfig = {
  timeout: 10 * 60 * 1000,
  baseURL: '/api/v1',
}

const request = axios.create(requestConfig)

request.interceptors.response.use(successHandler, errorHandler)
export default request
