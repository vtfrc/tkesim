import { Kafka, Producer, logLevel } from "kafkajs"
import type { KafkaConfig, SentEvent } from "../types"

let kafka: Kafka | null = null
let producer: Producer | null = null

export async function connectKafka(config: KafkaConfig): Promise<boolean> {
  try {
    const brokers = config.brokers.split(",").map((b) => b.trim())

    const kafkaConfig: ConstructorParameters<typeof Kafka>[0] = {
      clientId: config.clientId,
      brokers,
      logLevel: logLevel.ERROR,
      retry: {
        initialRetryTime: 300,
        retries: 10,
      },
    }

    if (config.ssl) {
      kafkaConfig.ssl = true
    }

    if (config.saslUsername && config.saslPassword) {
      kafkaConfig.sasl = {
        mechanism: "plain",
        username: config.saslUsername,
        password: config.saslPassword,
      }
    }

    kafka = new Kafka(kafkaConfig)
    producer = kafka.producer({
      allowAutoTopicCreation: true,
    })

    await producer.connect()
    return true
  } catch (error) {
    console.error("Kafka connection error:", error)
    return false
  }
}

export async function disconnectKafka(): Promise<void> {
  if (producer) {
    await producer.disconnect()
    producer = null
  }
  kafka = null
}

export interface SendEventOptions {
  topic: string
  payload: Record<string, unknown>
  key?: string
  headers?: Record<string, string>
}

export async function sendEvent(
  topic: string,
  payload: Record<string, unknown>,
  key?: string,
  headers?: Record<string, string>
): Promise<SentEvent> {
  if (!producer) {
    return {
      timestamp: new Date(),
      topic,
      payload,
      status: "error",
      error: "Producer not connected",
    }
  }

  try {
    // Convert headers to Kafka format
    const kafkaHeaders = headers
      ? Object.entries(headers).reduce((acc, [k, v]) => {
          acc[k] = Buffer.from(v)
          return acc
        }, {} as Record<string, Buffer>)
      : undefined

    const result = await producer.send({
      topic,
      messages: [
        {
          key: key || undefined,
          value: JSON.stringify(payload),
          headers: kafkaHeaders,
        },
      ],
    })

    const recordMetadata = result[0]
    return {
      timestamp: new Date(),
      topic,
      partition: recordMetadata?.partition,
      offset: recordMetadata?.baseOffset,
      key,
      payload,
      status: "sent",
    }
  } catch (error) {
    return {
      timestamp: new Date(),
      topic,
      payload,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function sendEventWithOptions(options: SendEventOptions): Promise<SentEvent> {
  return sendEvent(options.topic, options.payload, options.key, options.headers)
}

export async function sendEvents(
  topic: string,
  payloads: Record<string, unknown>[],
  delayMs: number,
  onProgress?: (sent: number, total: number, event: SentEvent) => void
): Promise<SentEvent[]> {
  const results: SentEvent[] = []

  for (let i = 0; i < payloads.length; i++) {
    const event = await sendEvent(topic, payloads[i])
    results.push(event)

    if (onProgress) {
      onProgress(i + 1, payloads.length, event)
    }

    if (i < payloads.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}

export function isConnected(): boolean {
  return producer !== null
}
