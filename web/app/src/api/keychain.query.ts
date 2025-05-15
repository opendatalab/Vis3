import { useMutation, useQuery } from "@tanstack/react-query"
import { createKeychain, deleteKeychain, getAllKeychains, getKeychain, getKeychains, KeychainUpdateBody, updateKeychain } from "./keychain"

export const useMyKeychains = (pageNo: number, pageSize: number) => {
  return useQuery({
    queryKey: ['my_keychain'],
    queryFn: () => getKeychains({
      page_no: pageNo,
      page_size: pageSize,
    }),
  })
}

export const useAllKeychains = () => {
  return useQuery({
    queryKey: ['all_keychain'],
    queryFn: () => getAllKeychains(),
    select: (data) => data.data,
  })
}

export const useKeychain = (id?: number) => {
  return useQuery({
    enabled: typeof id === 'number',
    queryKey: ['keychain', id],
    queryFn: () => getKeychain(id!),
  })
}

export const useCreateKeychain = () => {
  return useMutation({
    mutationFn: createKeychain,
  })
}

export const useUpdateKeychain = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: number, data: KeychainUpdateBody }) => updateKeychain(id, data),
  })
}

export const useDeleteKeychain = () => {
  return useMutation({
    mutationFn: deleteKeychain,
  })
}