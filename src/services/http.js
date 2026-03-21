// src/services/http.js
import axios from "axios";
import { setupMockInterceptor } from "../mock/mockApi";

const API_URL = import.meta.env.VITE_API_URL || "";

export const http = axios.create({
  baseURL: API_URL,
});

// JWT ekle
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// DEMO: Mock interceptor
setupMockInterceptor(http);
