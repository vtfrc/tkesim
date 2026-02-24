export interface KafkaConfig {
  brokers: string
  clientId: string
  ssl: boolean
  saslUsername: string
  saslPassword: string
}

export interface EventTemplate {
  id: string
  name: string
  description: string
  topic: string
  schema: Record<string, FieldSchema>
}

export interface FieldSchema {
  type: "string" | "number" | "boolean" | "date" | "uuid" | "iban" | "amount" | "email" | "phone" | "enum" | "custom"
  generator?: string // faker method or custom
  enumValues?: string[]
  prefix?: string
  min?: number
  max?: number
  decimals?: number
  format?: string
  value?: string // for custom fixed value
}

export interface GenerationConfig {
  count: number
  ratePerSecond: number
  delayBetweenMs: number
}

export interface SentEvent {
  timestamp: Date
  topic: string
  partition?: number
  offset?: string
  key?: string
  payload: Record<string, unknown>
  status: "sent" | "error"
  error?: string
}

export interface AppState {
  step: "config" | "topic" | "template" | "customize" | "generate" | "preview" | "sending" | "log"
  kafkaConfig: KafkaConfig
  selectedTopic: string
  customTopic: string
  selectedTemplate: EventTemplate | null
  customPayload: string
  generationConfig: GenerationConfig
  sentEvents: SentEvent[]
  isConnected: boolean
  isSending: boolean
  error: string | null
}

export { BANKING_TEMPLATES } from "./templates"

export const DEFAULT_KAFKA_CONFIG: KafkaConfig = {
  brokers: "localhost:9092",
  clientId: "tkesim",
  ssl: false,
  saslUsername: "",
  saslPassword: "",
}

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  count: 10,
  ratePerSecond: 5,
  delayBetweenMs: 200,
}
