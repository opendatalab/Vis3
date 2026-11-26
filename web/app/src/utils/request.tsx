import { i18n } from '@vis3/kit'
import { message } from 'antd'
import type { AxiosError, AxiosResponse } from 'axios'
import axios from 'axios'
import _ from 'lodash'

declare module 'axios' {
  export interface AxiosRequestConfig {
    silentErrorToast?: boolean
  }
}

export interface ApiErrorResponse {
  err_code?: number
  error_key?: string
  msg?: string
  detail?: string
  suggestion?: string
  request_id?: string
}

export interface FormattedApiError {
  errCode?: number
  errorKey?: string
  title: string
  detail?: string
  suggestion?: string
  requestId?: string
  message: string
}

/**
 * 将后端结构化诊断对象（如 ping / accessible 返回）格式化为可读的错误提示
 */
export function formatDiagnosticError(data?: ApiErrorResponse | null, fallbackKey = 'server.Unknown Error'): string {
  if (!data) {
    return i18n.t(fallbackKey)
  }

  const code = data.err_code
  const baseMsg = code !== undefined
    ? i18n.t(`server.codes.${code}`, { defaultValue: '' })
    : ''
  const rawMsg = data.msg ? i18n.t(`server.${data.msg}`, { defaultValue: data.msg }) : ''
  const title = baseMsg || rawMsg || i18n.t(fallbackKey)
  const parts = [title]

  if (data.suggestion) {
    parts.push(data.suggestion)
  }
  else if (data.detail && data.detail !== title && data.detail !== data.msg) {
    parts.push(data.detail)
  }

  return parts.join('；')
}

/**
 * 将 AxiosError 格式化为面向用户的统一错误描述
 */
export function formatApiError(error: unknown): FormattedApiError {
  if (!axios.isAxiosError(error)) {
    const fallback = error instanceof Error ? error.message : i18n.t('server.Unknown Error')
    return {
      title: fallback,
      message: fallback,
    }
  }

  if (!error.response) {
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')
    const title = isTimeout ? i18n.t('server.timeoutError') : i18n.t('server.networkError')
    return {
      title,
      message: title,
    }
  }

  const status = error.response.status
  const data = (error.response.data ?? {}) as ApiErrorResponse
  const code = data.err_code
  const translatedByCode = code !== undefined
    ? i18n.t(`server.codes.${code}`, { defaultValue: '' })
    : ''
  const translatedByMsg = data.msg
    ? i18n.t(`server.${data.msg}`, { defaultValue: data.msg })
    : ''
  const detailText = typeof data.detail === 'string' ? data.detail : ''

  const title = translatedByCode || translatedByMsg || detailText || error.message || i18n.t('server.Unknown Error')
  const parts = [title]

  if (data.suggestion) {
    parts.push(data.suggestion)
  }
  else if (detailText && detailText !== title && detailText !== data.msg && status < 500) {
    parts.push(detailText)
  }

  if (status >= 500 && data.request_id) {
    parts.push(`${i18n.t('server.requestId')}: ${data.request_id}`)
  }

  return {
    errCode: code,
    errorKey: data.error_key,
    title,
    detail: detailText,
    suggestion: data.suggestion,
    requestId: data.request_id,
    message: parts.join(' | '),
  }
}

/**
 * @param response
 * @returns
 */
export function successHandler(response: AxiosResponse<any>) {
  return response.data
}

function isAuthPath(path: string) {
  return ['/login', '/register'].some(p => path.includes(p))
}

function errorHandler(error: AxiosError) {
  if (error.response?.status === 401 && !isAuthPath(window.location.pathname) && window.__CONFIG__.ENABLE_AUTH) {
    window.location.href = `${window.__CONFIG__.BASE_URL ?? ''}/login`
    return Promise.reject(error)
  }

  if (!error.config?.silentErrorToast && !isAuthPath(window.location.pathname)) {
    const formatted = formatApiError(error)
    if (formatted.message) {
      message.error(formatted.message)
    }
  }

  return Promise.reject(error)
}

const requestConfig = {
  timeout: 10 * 60 * 1000,
  baseURL: `${window.__CONFIG__.BASE_URL ?? ''}/api/v1`,
}

const request = axios.create(requestConfig)

request.interceptors.response.use(successHandler, errorHandler)
export default request
