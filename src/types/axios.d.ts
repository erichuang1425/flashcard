import { AxiosRequestConfig, AxiosResponse } from 'axios';

// Custom request config extending Axios request config
export interface CustomRequestConfig extends AxiosRequestConfig {
    retry?: boolean;
    retryCount?: number;
    retryDelay?: number;
}

// Custom response interface extending Axios response
export interface CustomResponse<T = any> extends AxiosResponse<T> {
    retryCount?: number;
}

// Error response type for API errors
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
}

// Generic API response wrapper
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    error?: ApiError;
    timestamp?: string;
}

// Request interceptor config type
export interface RequestInterceptorConfig {
    requiresAuth?: boolean;
    shouldRetry?: boolean;
}

// Custom headers interface
export interface CustomHeaders extends Record<string, string> {
    'X-App-Version'?: string;
    'X-Client-Token'?: string;
    Authorization?: string;
}

// API request timeout settings
export interface RequestTimeoutConfig {
    timeout?: number;
    timeoutErrorMessage?: string;
}

// Pagination parameters interface
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// Cache control options
export interface CacheControlOptions {
    maxAge?: number;
    staleWhileRevalidate?: number;
    noCache?: boolean;
}