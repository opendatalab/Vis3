import { useMutation, useQuery } from '@tanstack/react-query';
import type { KeychainUpdateBody } from './keychain';
import { createKeychain, deleteKeychain, getAllKeychains, getKeychain, getKeychains, updateKeychain } from './keychain';

export function useMyKeychains(pageNo: number, pageSize: number) {
  return useQuery({
    queryKey: ['my_keychain'],
    queryFn: () => getKeychains({
      page_no: pageNo,
      page_size: pageSize,
    }),
  })
}

export function useAllKeychains(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['all_keychain'],
    queryFn: () => getAllKeychains(),
    select: data => data.data,
  })
}

export function useKeychain(id?: number) {
  return useQuery({
    enabled: typeof id === 'number',
    queryKey: ['keychain', id],
    queryFn: () => getKeychain(id!),
  })
}

export function useCreateKeychain() {
  return useMutation({
    mutationFn: createKeychain,
  })
}

export function useUpdateKeychain() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number, data: KeychainUpdateBody }) => updateKeychain(id, data),
  })
}

export function useDeleteKeychain() {
  return useMutation({
    mutationFn: deleteKeychain,
  })
}
