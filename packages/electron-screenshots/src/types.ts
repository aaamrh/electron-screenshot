/**
 * 语言项类型（与 translationtools 接口一致）
 */
export interface LanguageItem {
  /** 语言代码，如 "en", "zh-CN" */
  languageCode: string;
  /** 渠道语言代码 */
  channelLanguageCode: string;
  /** 中文名称，如 "英语" */
  nameCn: string;
  /** 英文名称，如 "English" */
  nameEn: string;
  /** 渠道类型，如 "google", "gpt" */
  channelType: string;
}

/**
 * 翻译请求参数
 */
export interface TranslateRequest {
  /** 要翻译的文本 */
  text: string;
  /** 目标语言代码，如 "en" */
  targetLang: string;
  /** 翻译渠道类型，如 "google", "gpt" */
  channelType: string;
}

/**
 * 翻译响应
 */
export interface TranslateResponse {
  /** 是否成功 */
  success: boolean;
  /** 翻译后的文本 */
  text?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 获取语言列表响应
 */
export interface GetLanguagesResponse {
  /** 是否成功 */
  success: boolean;
  /** 语言列表 */
  languages?: LanguageItem[];
  /** 错误信息 */
  error?: string;
}
