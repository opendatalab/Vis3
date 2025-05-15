import request from "../utils/request";
import { PaginationParams } from "./types";

export interface KeychainResponse {
  id: number
  name: string
  access_key_id: string
  secret_key_id: string
  created_at: string
  updated_at: string
  created_by: string
}

export interface KeychainCreateBody {
  name: string
  access_key_id: string
  secret_key_id: string
}

export type KeychainUpdateBody = Partial<KeychainCreateBody>

export function getKeychains(params: PaginationParams) {
  return request<KeychainResponse[]>('/keychain', {
    params,
  })
}

export function getAllKeychains() {
  return request<KeychainResponse[]>('/keychain/all')
}

export function getKeychain(id: number) {
  return request<KeychainResponse>(`/keychain/${id}`)
}

export function createKeychain(data: KeychainCreateBody) {
  return request.post('/keychain', data)
}

export function updateKeychain(id: number, data: KeychainUpdateBody) {
  return request.patch(`/keychain/${id}`, data)
}

export function deleteKeychain(id: number) {
  return request.delete(`/keychain/${id}`)
}
