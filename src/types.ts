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

// Predefined templates for banking events
export const BANKING_TEMPLATES: EventTemplate[] = [
  {
    id: "sepa-transfer",
    name: "SEPA Transfer",
    description: "Standard SEPA credit transfer",
    topic: "banking.payments.sepa-credit-transfer",
    schema: {
      eventId: { type: "uuid" },
      eventType: { type: "custom", value: "SEPA_CREDIT_TRANSFER" },
      timestamp: { type: "date", format: "iso" },
      sourceIban: { type: "iban" },
      destinationIban: { type: "iban" },
      amount: { type: "amount", min: 10, max: 10000, decimals: 2 },
      currency: { type: "custom", value: "EUR" },
      description: { type: "string", generator: "finance.transactionDescription" },
      senderName: { type: "string", generator: "person.fullName" },
      receiverName: { type: "string", generator: "person.fullName" },
      executionDate: { type: "date", format: "iso" },
      status: { type: "enum", enumValues: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] },
    },
  },
  {
    id: "pos-payment",
    name: "POS Payment",
    description: "Card transaction at POS",
    topic: "banking.payments.card-transaction",
    schema: {
      eventId: { type: "uuid" },
      eventType: { type: "custom", value: "CARD_TRANSACTION" },
      timestamp: { type: "date", format: "iso" },
      cardHash: { type: "string", generator: "string.alphanumeric", prefix: "CARD_" },
      merchantId: { type: "string", generator: "string.alphanumeric", prefix: "MERCH_" },
      merchantName: { type: "string", generator: "company.name" },
      amount: { type: "amount", min: 1, max: 500, decimals: 2 },
      currency: { type: "custom", value: "EUR" },
      mcc: { type: "enum", enumValues: ["5411", "5812", "5912", "7011", "5541"] },
      authCode: { type: "string", generator: "string.numeric" },
      status: { type: "enum", enumValues: ["AUTHORIZED", "DECLINED", "PENDING"] },
    },
  },
  {
    id: "sdd-debit",
    name: "SDD Debit",
    description: "SEPA Direct Debit",
    topic: "banking.payments.sepa-direct-debit",
    schema: {
      eventId: { type: "uuid" },
      eventType: { type: "custom", value: "SEPA_DIRECT_DEBIT" },
      timestamp: { type: "date", format: "iso" },
      mandateId: { type: "string", generator: "string.alphanumeric", prefix: "MND_" },
      creditorId: { type: "string", generator: "string.alphanumeric", prefix: "CRED_" },
      creditorName: { type: "string", generator: "company.name" },
      debtorIban: { type: "iban" },
      amount: { type: "amount", min: 10, max: 1000, decimals: 2 },
      currency: { type: "custom", value: "EUR" },
      description: { type: "string", generator: "finance.transactionDescription" },
      collectionDate: { type: "date", format: "iso" },
      sequenceType: { type: "enum", enumValues: ["FRST", "RCUR", "OOFF", "FNAL"] },
    },
  },
  {
    id: "notification",
    name: "Customer Notification",
    description: "Push notification to customer",
    topic: "banking.notifications.push",
    schema: {
      eventId: { type: "uuid" },
      eventType: { type: "custom", value: "PUSH_NOTIFICATION" },
      timestamp: { type: "date", format: "iso" },
      customerId: { type: "uuid" },
      channel: { type: "enum", enumValues: ["PUSH", "SMS", "EMAIL"] },
      templateId: { type: "string", generator: "string.alphanumeric", prefix: "TPL_" },
      title: { type: "string", generator: "lorem.sentence" },
      body: { type: "string", generator: "lorem.paragraph" },
      priority: { type: "enum", enumValues: ["HIGH", "MEDIUM", "LOW"] },
      deepLink: { type: "string", prefix: "app://banking/" },
    },
  },
  {
    id: "kyc-check",
    name: "KYC Check",
    description: "Know Your Customer verification",
    topic: "banking.compliance.kyc",
    schema: {
      eventId: { type: "uuid" },
      eventType: { type: "custom", value: "KYC_CHECK" },
      timestamp: { type: "date", format: "iso" },
      customerId: { type: "uuid" },
      checkType: { type: "enum", enumValues: ["IDENTITY", "ADDRESS", "PEP", "SANCTIONS", "ADVERSE_MEDIA"] },
      documentType: { type: "enum", enumValues: ["ID_CARD", "PASSPORT", "DRIVING_LICENSE"] },
      result: { type: "enum", enumValues: ["PASS", "FAIL", "REVIEW", "PENDING"] },
      score: { type: "number", min: 0, max: 100 },
      provider: { type: "enum", enumValues: ["PROVIDER_A", "PROVIDER_B", "INTERNAL"] },
    },
  },
  {
    id: "login",
    name: "Login Event",
    description: "Authentication event",
    topic: "banking.security.auth",
    schema: {
      eventId: { type: "uuid" },
      eventType: { type: "custom", value: "USER_LOGIN" },
      timestamp: { type: "date", format: "iso" },
      userId: { type: "uuid" },
      sessionId: { type: "uuid" },
      channel: { type: "enum", enumValues: ["MOBILE_APP", "WEB", "API"] },
      ipAddress: { type: "string", generator: "internet.ipv4" },
      userAgent: { type: "string", generator: "internet.userAgent" },
      success: { type: "boolean" },
      mfaUsed: { type: "boolean" },
      failureReason: { type: "enum", enumValues: ["NONE", "INVALID_PASSWORD", "ACCOUNT_LOCKED", "MFA_FAILED"] },
    },
  },
]

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
