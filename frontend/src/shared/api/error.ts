import { AxiosError } from "axios";
import { ApiErrorResponse } from "./types";

export class ApiError extends Error {
  public readonly status?: number;
  public readonly title?: string;
  public readonly detail?: string;
  public readonly type?: string;
  public readonly instance?: string;
  public readonly extensionFields?: Record<string, unknown>;
  public readonly isNetworkError: boolean;
  public readonly isTimeout: boolean;
  public readonly rawError?: unknown;

  constructor(options: {
    message: string;
    status?: number;
    title?: string;
    detail?: string;
    type?: string;
    instance?: string;
    extensionFields?: Record<string, unknown>;
    isNetworkError?: boolean;
    isTimeout?: boolean;
    rawError?: unknown;
  }) {
    super(options.detail || options.title || options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.title = options.title;
    this.detail = options.detail;
    this.type = options.type;
    this.instance = options.instance;
    this.extensionFields = options.extensionFields;
    this.isNetworkError = !!options.isNetworkError;
    this.isTimeout = !!options.isTimeout;
    this.rawError = options.rawError;

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * 将 AxiosError 或任意 Error 统一转换为 ApiError 实例
   */
  public static fromAxiosError(error: AxiosError<ApiErrorResponse>): ApiError {
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      return new ApiError({
        message: "请求超时，请稍后重试",
        title: "请求超时",
        detail: "网络请求超时，请检查网络连接后重试。",
        isTimeout: true,
        rawError: error,
      });
    }

    if (!error.response) {
      return new ApiError({
        message: "网络连接失败",
        title: "网络异常",
        detail: "无法连接到服务器，请检查网络状态。",
        isNetworkError: true,
        rawError: error,
      });
    }

    const { status, data } = error.response;

    const type = data?.type;
    const title = data?.title || getFallbackTitleByStatus(status);
    const detail = data?.detail || getFallbackDetailByStatus(status);
    const instance = data?.instance || error.config?.url;
    const extensionFields = data?.extension_fields;

    return new ApiError({
      message: detail || title,
      status,
      title,
      detail,
      type,
      instance,
      extensionFields,
      rawError: error,
    });
  }
}

function getFallbackTitleByStatus(status?: number): string {
  switch (status) {
    case 400:
      return "请求参数错误";
    case 401:
      return "未授权访问";
    case 403:
      return "拒绝访问";
    case 404:
      return "请求资源不存在";
    case 409:
      return "资源状态冲突";
    case 422:
      return "数据验证失败";
    case 500:
      return "服务器内部错误";
    case 502:
      return "网关错误";
    case 503:
      return "服务暂不可用";
    case 504:
      return "网关超时";
    default:
      return "请求处理失败";
  }
}

function getFallbackDetailByStatus(status?: number): string {
  switch (status) {
    case 400:
      return "发送的请求参数格式不正确。";
    case 401:
      return "登录凭证无效或已过期，请重新登录。";
    case 403:
      return "您没有权限执行此操作。";
    case 404:
      return "未能找到请求的接口或资源。";
    case 409:
      return "资源当前状态冲突，无法完成变更。";
    case 422:
      return "提交的实体数据未通过校验。";
    case 500:
      return "服务器处理请求时发生未知异常。";
    case 502:
    case 503:
    case 504:
      return "服务器上游服务暂无响应，请稍后再试。";
    default:
      return "发生未预期的网络请求错误。";
  }
}
