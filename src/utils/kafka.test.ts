import { describe, it, expect, vi, beforeEach } from "vitest"

// Hoist mock state above vi.mock so it's available in the factory
const mocks = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue([{ partition: 0, baseOffset: "42" }]),
  producerFactory: vi.fn(),
  KafkaConstructor: vi.fn(),
}))

vi.mock("kafkajs", () => ({
  Kafka: vi.fn(function (this: unknown, config: unknown) {
    mocks.KafkaConstructor(config)
    return {
      producer: vi.fn(function (opts: unknown) {
        mocks.producerFactory(opts)
        return {
          connect: mocks.connect,
          disconnect: mocks.disconnect,
          send: mocks.send,
        }
      }),
    }
  }),
  logLevel: { ERROR: 0 },
}))

import { connectKafka, disconnectKafka, sendEvent, sendEvents, isConnected } from "./kafka"

const DEFAULT_CONFIG = {
  brokers: "localhost:9092",
  clientId: "test-client",
  ssl: false,
  saslUsername: "",
  saslPassword: "",
}

describe("connectKafka", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await disconnectKafka()
  })

  it("returns true on successful connection", async () => {
    const result = await connectKafka(DEFAULT_CONFIG)
    expect(result).toBe(true)
    expect(mocks.connect).toHaveBeenCalled()
  })

  it("returns false when producer.connect() throws", async () => {
    mocks.connect.mockRejectedValueOnce(new Error("Connection refused"))
    const result = await connectKafka(DEFAULT_CONFIG)
    expect(result).toBe(false)
  })

  it("splits comma-separated brokers", async () => {
    await connectKafka({ ...DEFAULT_CONFIG, brokers: "broker1:9092, broker2:9092" })
    expect(mocks.KafkaConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        brokers: ["broker1:9092", "broker2:9092"],
      })
    )
  })

  it("passes clientId to Kafka constructor", async () => {
    await connectKafka({ ...DEFAULT_CONFIG, clientId: "my-app" })
    expect(mocks.KafkaConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "my-app" })
    )
  })

  it("enables SSL when ssl is true", async () => {
    await connectKafka({ ...DEFAULT_CONFIG, ssl: true })
    expect(mocks.KafkaConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ ssl: true })
    )
  })

  it("does not include ssl when ssl is false", async () => {
    await connectKafka({ ...DEFAULT_CONFIG, ssl: false })
    const config = mocks.KafkaConstructor.mock.calls[0][0]
    expect(config.ssl).toBeUndefined()
  })

  it("configures SASL when credentials are provided", async () => {
    await connectKafka({ ...DEFAULT_CONFIG, saslUsername: "user", saslPassword: "secret" })
    expect(mocks.KafkaConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        sasl: { mechanism: "plain", username: "user", password: "secret" },
      })
    )
  })

  it("does not configure SASL when credentials are empty", async () => {
    await connectKafka(DEFAULT_CONFIG)
    const config = mocks.KafkaConstructor.mock.calls[0][0]
    expect(config.sasl).toBeUndefined()
  })

  it("does not configure SASL when only username is provided", async () => {
    await connectKafka({ ...DEFAULT_CONFIG, saslUsername: "user", saslPassword: "" })
    const config = mocks.KafkaConstructor.mock.calls[0][0]
    expect(config.sasl).toBeUndefined()
  })

  it("requests auto topic creation from producer", async () => {
    await connectKafka(DEFAULT_CONFIG)
    expect(mocks.producerFactory).toHaveBeenCalledWith({ allowAutoTopicCreation: true })
  })
})

describe("disconnectKafka", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await disconnectKafka()
  })

  it("calls producer.disconnect() when connected", async () => {
    await connectKafka(DEFAULT_CONFIG)
    vi.clearAllMocks()
    await disconnectKafka()
    expect(mocks.disconnect).toHaveBeenCalled()
  })

  it("does not throw when called while not connected", async () => {
    await expect(disconnectKafka()).resolves.toBeUndefined()
  })

  it("sets isConnected to false", async () => {
    await connectKafka(DEFAULT_CONFIG)
    expect(isConnected()).toBe(true)
    await disconnectKafka()
    expect(isConnected()).toBe(false)
  })
})

describe("isConnected", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await disconnectKafka()
  })

  it("returns false initially", () => {
    expect(isConnected()).toBe(false)
  })

  it("returns true after successful connect", async () => {
    await connectKafka(DEFAULT_CONFIG)
    expect(isConnected()).toBe(true)
  })

  it("returns false after disconnect", async () => {
    await connectKafka(DEFAULT_CONFIG)
    await disconnectKafka()
    expect(isConnected()).toBe(false)
  })
})

describe("sendEvent", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await disconnectKafka()
  })

  it("returns error when producer is not connected", async () => {
    const result = await sendEvent("my-topic", { key: "value" })
    expect(result.status).toBe("error")
    expect(result.error).toBe("Producer not connected")
    expect(result.topic).toBe("my-topic")
    expect(result.payload).toEqual({ key: "value" })
  })

  it("sends event and returns success metadata", async () => {
    await connectKafka(DEFAULT_CONFIG)
    const result = await sendEvent("my-topic", { data: "hello" })
    expect(result.status).toBe("sent")
    expect(result.topic).toBe("my-topic")
    expect(result.payload).toEqual({ data: "hello" })
    expect(result.partition).toBe(0)
    expect(result.offset).toBe("42")
  })

  it("includes key in the result when provided", async () => {
    await connectKafka(DEFAULT_CONFIG)
    const result = await sendEvent("t", { x: 1 }, "my-key")
    expect(result.key).toBe("my-key")
    expect(result.status).toBe("sent")
  })

  it("serializes payload as JSON in the message", async () => {
    await connectKafka(DEFAULT_CONFIG)
    const payload = { nested: { value: true }, arr: [1, 2] }
    await sendEvent("t", payload)
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "t",
        messages: [
          expect.objectContaining({
            value: JSON.stringify(payload),
          }),
        ],
      })
    )
  })

  it("converts headers to Buffer format", async () => {
    await connectKafka(DEFAULT_CONFIG)
    await sendEvent("t", {}, undefined, { env: "prod", ver: "2" })
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            headers: { env: Buffer.from("prod"), ver: Buffer.from("2") },
          }),
        ],
      })
    )
  })

  it("sends undefined headers when none provided", async () => {
    await connectKafka(DEFAULT_CONFIG)
    await sendEvent("t", { x: 1 })
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            headers: undefined,
          }),
        ],
      })
    )
  })

  it("returns error status when send throws an Error", async () => {
    await connectKafka(DEFAULT_CONFIG)
    mocks.send.mockRejectedValueOnce(new Error("Network timeout"))
    const result = await sendEvent("t", { x: 1 })
    expect(result.status).toBe("error")
    expect(result.error).toBe("Network timeout")
  })

  it("stringifies non-Error exceptions", async () => {
    await connectKafka(DEFAULT_CONFIG)
    mocks.send.mockRejectedValueOnce("something broke")
    const result = await sendEvent("t", { x: 1 })
    expect(result.status).toBe("error")
    expect(result.error).toBe("something broke")
  })

  it("includes a timestamp in the result", async () => {
    await connectKafka(DEFAULT_CONFIG)
    const before = new Date()
    const result = await sendEvent("t", {})
    const after = new Date()
    expect(result.timestamp).toBeInstanceOf(Date)
    expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})

describe("sendEvents", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await disconnectKafka()
  })

  it("sends all payloads and returns a result per event", async () => {
    await connectKafka(DEFAULT_CONFIG)
    const payloads = [{ a: 1 }, { b: 2 }, { c: 3 }]
    const results = await sendEvents("topic", payloads, 0)
    expect(results).toHaveLength(3)
    expect(mocks.send).toHaveBeenCalledTimes(3)
    expect(results.every((r) => r.status === "sent")).toBe(true)
  })

  it("returns error for each event when not connected", async () => {
    const payloads = [{ a: 1 }, { b: 2 }]
    const results = await sendEvents("topic", payloads, 0)
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.status === "error")).toBe(true)
    expect(results.every((r) => r.error === "Producer not connected")).toBe(true)
  })

  it("calls onProgress with correct sent/total counts", async () => {
    await connectKafka(DEFAULT_CONFIG)
    const onProgress = vi.fn()
    const payloads = [{ a: 1 }, { b: 2 }, { c: 3 }]
    await sendEvents("topic", payloads, 0, onProgress)

    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3, expect.any(Object))
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3, expect.any(Object))
    expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3, expect.any(Object))
  })

  it("does not call onProgress when not provided", async () => {
    await connectKafka(DEFAULT_CONFIG)
    // Should not throw when onProgress is omitted
    const results = await sendEvents("topic", [{ x: 1 }], 0)
    expect(results).toHaveLength(1)
  })

  it("returns empty array for empty payloads", async () => {
    await connectKafka(DEFAULT_CONFIG)
    const results = await sendEvents("topic", [], 0)
    expect(results).toHaveLength(0)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("passes each payload to its corresponding send call", async () => {
    await connectKafka(DEFAULT_CONFIG)
    const payloads = [{ first: true }, { second: true }]
    await sendEvents("my-topic", payloads, 0)

    expect(mocks.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        topic: "my-topic",
        messages: [expect.objectContaining({ value: JSON.stringify({ first: true }) })],
      })
    )
    expect(mocks.send).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        topic: "my-topic",
        messages: [expect.objectContaining({ value: JSON.stringify({ second: true }) })],
      })
    )
  })
})
