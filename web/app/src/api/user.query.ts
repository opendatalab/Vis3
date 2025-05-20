import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getUserInfo, login, logout, register } from './user'

// React Query Hooks
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      // 登录成功后可以更新缓存或执行其他操作
      queryClient.setQueryData(['authUser'], data)

      // 可以在这里更新用户信息
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: register,
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    staleTime: Infinity,
    queryFn: getUserInfo,
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // 登出后清除用户相关数据
      queryClient.setQueryData(['authUser'], null)
      queryClient.removeQueries({ queryKey: ['user'] })
    },
  })
}
