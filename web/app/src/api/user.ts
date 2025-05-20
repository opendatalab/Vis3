import request from '../utils/request'

export interface LoginPayload {
  username: string
  password: string
}

export interface UserResponse {
  username: string
  email: string
}

export async function login(payload: LoginPayload): Promise<UserResponse> {
  return await request.post('/auth/login', payload)
}

export async function getUserInfo(): Promise<UserResponse> {
  return await request.get('/auth/me')
}

export async function logout(): Promise<void> {
  return await request.get('/auth/logout')
}

export interface RegisterPayload {
  username: string
  password: string
}

export async function register(params: RegisterPayload): Promise<void> {
  return await request.post('/auth/register', params)
}
