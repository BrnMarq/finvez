import axios from "axios";
import * as SecureStore from "expo-secure-store";
import * as Sentry from "@sentry/react-native";
import { DeviceEventEmitter } from "react-native";
import { logger } from "@/src/utils/logger";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const client = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to attach the JWT token
client.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync("user_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const method = error.config?.method?.toUpperCase() || "UNKNOWN METHOD";
      const url = error.config?.url || "UNKNOWN URL";
      let errorMessage = `API ERROR: ${method} ${url}`;
      let errorContext: Record<string, any> = {
        endpoint: `${method} ${url}`,
        apiUrl: API_URL,
      };

      if (error.response) {
        errorMessage += ` | Status: ${error.response.status}`;
        errorContext = {
          ...errorContext,
          status: error.response.status,
          response: error.response.data,
        };
        
        Sentry.addBreadcrumb({
          type: "http",
          category: "xhr",
          data: {
            url,
            method,
            status_code: error.response.status,
          }
        });
        
        Sentry.captureException(error, { extra: errorContext });

        // If the error is 401 Unauthorized, trigger global logout event
        if (error.response.status === 401) {
          logger.warn("401 Unauthorized detected. Emitting auth.unauthorized event.", errorContext);
          DeviceEventEmitter.emit("auth.unauthorized");
          return Promise.reject(new Error("Tu sesión ha expirado. Por favor, inicia sesión nuevamente."));
        }
      } else if (error.request) {
        errorMessage += ` | Status: No response received (Network Error)`;
        errorContext = {
          ...errorContext,
          networkError: true,
          resolution: "Check your EXPO_PUBLIC_API_URL or if the backend is running.",
        };
        Sentry.captureException(error, { extra: errorContext });
      } else {
        errorMessage += ` | Error Setup: ${error.message}`;
        errorContext = {
          ...errorContext,
          setupError: true,
          message: error.message,
        };
        Sentry.captureException(error, { extra: errorContext });
      }
      
      logger.error(errorMessage, errorContext);

      // Return a safe generic error to the UI
      return Promise.reject(
        new Error("Ocurrió un error inesperado al conectar con el servidor."),
      );
    }

    logger.error("[App Error]", error);
    return Promise.reject(new Error("Ocurrió un error inesperado."));
  },
);

export default client;
