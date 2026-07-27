/**
 * Ampcode 配置相关类型定义
 */

export interface AmpcodeModelMapping {
  from: string;
  to: string;
}

export interface AmpcodeUpstreamApiKeyMapping {
  upstreamApiKey: string;
  apiKeys: string[];
}

export interface AmpcodeConfig {
  upstreamUrl?: string;
  upstreamApiKey?: string;
  upstreamApiKeys?: AmpcodeUpstreamApiKeyMapping[];
  forceModelMappings?: boolean;
  modelMappings?: AmpcodeModelMapping[];
}
