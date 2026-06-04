import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../client';
import { ACCOUNT_KEYS } from './account';

export const TRANSACTION_KEYS = {
  all: ['transactions'] as const,
  list: (accountId: string | number) => [...TRANSACTION_KEYS.all, 'account', String(accountId)] as const,
  detail: (id: string | number) => [...TRANSACTION_KEYS.all, 'detail', String(id)] as const,
};

export function useAccountTransactions(accountId: string | number | string[] | undefined) {
  const accountIdStr = Array.isArray(accountId) ? accountId[0] : String(accountId);
  
  return useQuery({
    queryKey: TRANSACTION_KEYS.list(accountIdStr),
    queryFn: async () => {
      if (!accountIdStr || accountIdStr === 'undefined') return [];
      const response = await client.get(`/api/transactions/account/${accountIdStr}`);
      return response.data;
    },
    enabled: !!accountIdStr && accountIdStr !== 'undefined',
  });
}

export function useTransactionDetail(id: string | number | string[] | undefined) {
  const idStr = Array.isArray(id) ? id[0] : String(id);
  
  return useQuery({
    queryKey: TRANSACTION_KEYS.detail(idStr),
    queryFn: async () => {
      if (!idStr || idStr === 'undefined') throw new Error("Invalid ID");
      const response = await client.get(`/api/transactions/${idStr}`);
      return response.data;
    },
    enabled: !!idStr && idStr !== 'undefined',
  });
}

export function useUpdateTransaction(id: string | number | string[] | undefined) {
  const queryClient = useQueryClient();
  const idStr = Array.isArray(id) ? id[0] : String(id);
  
  return useMutation({
    mutationFn: async (payload: any) => {
      if (!idStr || idStr === 'undefined') throw new Error("Invalid ID");
      const response = await client.patch(`/api/transactions/${idStr}`, payload);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate both the detail view and the list views
      queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.detail(idStr) });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.all });
      // Invalidate accounts to refresh the dynamic balance
      queryClient.invalidateQueries({ queryKey: ACCOUNT_KEYS.all });
    },
  });
}

export function useCreateManualTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await client.post("/api/transactions/manual", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.all });
      // Invalidate accounts to refresh the dynamic balance
      queryClient.invalidateQueries({ queryKey: ACCOUNT_KEYS.all });
    },
  });
}

export function useProcessMedia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await client.post("/api/transactions", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.all });
      // Invalidate accounts to refresh the dynamic balance
      queryClient.invalidateQueries({ queryKey: ACCOUNT_KEYS.all });
    },
  });
}

