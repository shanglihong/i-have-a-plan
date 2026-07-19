/**
 * 符合 RFC 7807 (Problem Details for HTTP APIs) 标准的错误响应接口
 */
export interface ApiErrorResponse {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  extension_fields?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * React Query meta 扩展配置接口
 */
export interface CustomQueryMeta {
  /** 是否静默全局 Toast 错误提示 */
  suppressGlobalError?: boolean;
  [key: string]: unknown;
}
