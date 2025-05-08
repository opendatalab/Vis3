import request from "../utils/request";
import { ResponseWrapper } from "./types";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface UserResponse {
  username: string;
  email: string;
}

export async function login(payload: LoginPayload): Promise<ResponseWrapper<UserResponse>> {
  const result = await request.post('/v1/users/login', payload);

  return result;
}

export async function getUserInfo(): Promise<ResponseWrapper<UserResponse>> {
  return await request.get('/v1/users/me');
}

export async function logout(): Promise<ResponseWrapper<void>> {
  return await request.get('/v1/users/logout');
}

export interface SignupPayload {
  username: string;
  password: string;
  email: string;
}

export async function signUp(params: SignupPayload): Promise<ResponseWrapper<void>> {
  return await request.post('/v1/users/signup', params);
}
