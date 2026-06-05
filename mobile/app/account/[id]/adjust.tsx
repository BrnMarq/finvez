import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sentry from "@sentry/react-native";
import { ArrowLeft, Save, Scale } from "lucide-react-native";
import { formatCurrency } from "@/src/utils/currency";
import { logger } from "@/src/utils/logger";
import { useCreateManualTransaction } from "@/src/api/queries/transaction";
import { useAccounts } from "@/src/api/queries/account";

export default function AdjustBalanceScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const createManualMutation = useCreateManualTransaction();
  const { data: accounts = [] } = useAccounts();
  const currentAccount = accounts.find((a: any) => a.id.toString() === id);

  const symbol = currentAccount?.symbol || "USD";
  const currentBalance = currentAccount?.balance || 0;

  const [actualBalanceStr, setActualBalanceStr] = useState("");

  const actualBalance =
    parseFloat(actualBalanceStr.replace(/[^0-9.-]/g, "")) || 0;
  const difference = actualBalance - currentBalance;

  const flow = difference > 0 ? "IN" : "OUT";
  const absDifference = Math.abs(difference);

  const handleSave = () => {
    if (!actualBalanceStr || isNaN(actualBalance)) {
      Alert.alert("Error", "Please enter a valid balance.");
      return;
    }

    if (absDifference === 0) {
      Alert.alert("Info", "The balance matches, no adjustment needed.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      return;
    }

    const payload = {
      accountId: id,
      totalValue: absDifference,
      type: "NEEDS", // Defaulting to needs for structural adjustments
      flow,
      context: "Balance Adjustment",
      items: [
        {
          name: "Balance Correction",
          quantity: 1,
          unitPrice: absDifference,
          totalPrice: absDifference,
        },
      ],
    };

    createManualMutation.mutate(payload, {
      onSuccess: () => {
        Alert.alert("Success", "Balance adjusted successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      },
      onError: (error: any) => {
        logger.error("Error adjusting balance", { error });
        Sentry.captureException(error);
        Alert.alert("Error", "Could not adjust the balance.");
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between p-6 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft color="#374151" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">Adjust Balance</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={createManualMutation.isPending}
          className="p-2 -mr-2"
        >
          {createManualMutation.isPending ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <Save color="#10B981" size={24} />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 p-6">
          <View className="items-center mb-8 mt-4">
            <View className="bg-emerald-100 p-4 rounded-full mb-4">
              <Scale color="#059669" size={32} />
            </View>
            <Text className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">
              Current Registered Balance
            </Text>
            <Text className="text-3xl font-black text-gray-800">
              {formatCurrency(currentBalance, symbol)}
            </Text>
          </View>

          <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
            <Text className="text-gray-700 font-bold mb-4">
              What is your actual real-world balance right now?
            </Text>
            <TextInput
              value={actualBalanceStr}
              onChangeText={setActualBalanceStr}
              keyboardType="decimal-pad"
              placeholder="e.g. 1500.50"
              className="bg-gray-50 p-4 rounded-2xl text-2xl font-bold text-gray-900 text-center border border-gray-200"
            />
          </View>

          {actualBalanceStr !== "" && (
            <View
              className={`p-4 rounded-2xl border ${difference > 0 ? "bg-emerald-50 border-emerald-100" : difference < 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}
            >
              <Text className="text-center text-sm text-gray-600 mb-1">
                Adjustment required:
              </Text>
              <Text
                className={`text-center text-xl font-bold ${difference > 0 ? "text-emerald-600" : difference < 0 ? "text-red-600" : "text-gray-600"}`}
              >
                {difference > 0 ? "+" : difference < 0 ? "-" : ""}
                {formatCurrency(absDifference, symbol)}
              </Text>
              <Text className="text-center text-xs text-gray-500 mt-2">
                This will create a single {flow === "IN" ? "Income" : "Expense"}{" "}
                transaction named "Balance Correction" to sync your account.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
