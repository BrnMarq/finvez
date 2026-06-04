import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
} from "lucide-react-native";
import { formatCurrency } from "@/src/utils/currency";
import * as Sentry from "@sentry/react-native";
import { useAccountTransactions } from "@/src/api/queries/transaction";
import { useAccounts } from "@/src/api/queries/account";

interface TransactionItem {
  name: string;
  totalPrice: number;
}

export default function HistoryScreen() {
  const { id } = useLocalSearchParams();
  const { data: transactions = [], isLoading: loading, refetch, isRefetching } = useAccountTransactions(id as string);
  const { data: accounts = [] } = useAccounts();
  const router = useRouter();

  const currentAccount = accounts.find((a: any) => a.id.toString() === id);

  useFocusEffect(
    useCallback(() => {
      Sentry.addBreadcrumb({
        category: "navigation",
        message: "history.viewed",
        level: "info",
      });
    }, []),
  );

  const onRefresh = () => {
    refetch();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={transactions}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          currentAccount ? (
            <View className="bg-emerald-500 rounded-3xl p-6 mb-6 shadow-sm shadow-emerald-200">
              <Text className="text-white/80 font-bold uppercase tracking-widest text-xs mb-1">
                Balance Total
              </Text>
              <Text className="text-white text-4xl font-black">
                {formatCurrency(currentAccount.balance || 0, currentAccount.symbol || 'USD')}
              </Text>
              <View className="flex-row items-center mt-4">
                <View className="bg-white/20 px-3 py-1 rounded-full mr-2">
                   <Text className="text-white font-bold text-xs">{currentAccount.name}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => router.push(`/account/${id}/adjust`)}
                  className="bg-white/20 px-3 py-1 rounded-full flex-row items-center"
                >
                  <Text className="text-white font-bold text-xs">Adjust</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#10B981"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/transaction/${item.id}`)}
            className="bg-white p-5 rounded-3xl shadow-sm mb-4 border border-gray-100"
          >
            <View className="flex-row items-center mb-2">
              <View
                className={`p-2 rounded-full mr-3 ${item.flow === "IN" ? "bg-emerald-100" : "bg-red-100"}`}
              >
                {item.flow === "IN" ? (
                  <ArrowDownLeft color="#059669" size={18} />
                ) : (
                  <ArrowUpRight color="#DC2626" size={18} />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-gray-900 font-bold text-base"
                  numberOfLines={1}
                >
                  {item.context || "Transacción"}
                </Text>
                <Text className="text-gray-400 text-[10px] font-medium tracking-widest uppercase">
                  {formatDate(item.date)} • {item.type}
                </Text>
              </View>
              <View>
                <Text
                  className={`font-black text-lg ${item.flow === "IN" ? "text-emerald-600" : "text-red-600"}`}
                >
                  {item.flow === "IN" ? "+" : "-"}
                  {formatCurrency(item.totalValue, item.account?.symbol)}
                </Text>
                <Text className="text-gray-400 text-[10px] text-right font-bold">
                  {item.account?.symbol || "USD"}
                </Text>
              </View>
            </View>

            {item.items && item.items.length > 0 && (
              <View className="mt-3 pt-3 border-t border-gray-50">
                {item.items.map((line: TransactionItem, idx: number) => (
                  <View key={idx} className="flex-row justify-between mb-1">
                    <Text className="text-gray-500 text-xs">• {line.name}</Text>
                    <Text className="text-gray-600 text-xs font-semibold">
                      {formatCurrency(line.totalPrice, item.account?.symbol)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center mt-24">
            <View className="bg-gray-100 p-6 rounded-full mb-4">
              <FileText color="#9CA3AF" size={48} />
            </View>
            <Text className="text-gray-500 text-lg font-semibold">
              Sin transacciones
            </Text>
            <Text className="text-gray-400 text-sm mt-1 text-center px-10">
              Usa el botón inferior para escanear tu primer gasto con IA.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        activeOpacity={0.85}
        className="absolute bottom-8 right-8 bg-emerald-500 w-16 h-16 rounded-full justify-center items-center shadow-2xl border-4 border-white"
        onPress={() => router.push(`/account/${id}/scanner`)}
      >
        <Plus color="#fff" size={32} />
      </TouchableOpacity>
    </View>
  );
}
