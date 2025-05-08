import type { AxiosError, AxiosResponse } from 'axios'
import axios from 'axios'

/**
 * @param response
 * @returns
 */
export function successHandler(response: AxiosResponse<any>) {
  return response.data
}

const ignoredErrorCodes = [40001, 40002, 30007]

function errorHandler(error: AxiosError) {
  // TODO

  return Promise.reject(error)
}

const requestConfig = {
  timeout: 10 * 60 * 1000,
  baseURL: '/api',
}

const request = axios.create(requestConfig)

request.interceptors.response.use(successHandler, errorHandler)
export default request
