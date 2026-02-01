import { describe, it, expect } from "vitest"
import { parseKafkaLog, formatHeaders, headersToKafkaFormat } from "./logParser"

describe("parseKafkaLog", () => {
  describe("Format 2: plain JSON", () => {
    it("parses a simple JSON object", () => {
      const result = parseKafkaLog('{"key": "value", "num": 42}')
      expect(result).not.toBeNull()
      expect(result!.payload).toEqual({ key: "value", num: 42 })
      expect(result!.timestamp).toBeNull()
      expect(result!.headers).toEqual({})
      expect(result!.partition).toBeNull()
      expect(result!.offset).toBeNull()
      expect(result!.key).toBeNull()
    })

    it("strips leading and trailing whitespace", () => {
      const result = parseKafkaLog('  \n  {"trimmed": true}  \n  ')
      expect(result!.payload).toEqual({ trimmed: true })
    })

    it("parses nested JSON", () => {
      const input = '{"outer": {"inner": {"deep": true}}, "arr": [1, 2, 3]}'
      const result = parseKafkaLog(input)
      expect(result!.payload).toEqual({
        outer: { inner: { deep: true } },
        arr: [1, 2, 3],
      })
    })

    it("parses JSON with various value types", () => {
      const input = '{"str": "hello", "num": 3.14, "bool": false, "nil": null}'
      const result = parseKafkaLog(input)
      expect(result!.payload).toEqual({ str: "hello", num: 3.14, bool: false, nil: null })
    })
  })

  describe("Format 3: key: JSON", () => {
    it("parses key followed by JSON payload", () => {
      const result = parseKafkaLog('mykey: {"event": "test"}')
      expect(result).not.toBeNull()
      expect(result!.key).toBe("mykey")
      expect(result!.payload).toEqual({ event: "test" })
    })

    it("parses a hyphenated key", () => {
      const result = parseKafkaLog('order-abc-123: {"status": "shipped"}')
      expect(result!.key).toBe("order-abc-123")
      expect(result!.payload).toEqual({ status: "shipped" })
    })

    it("has null timestamp, partition, offset, and empty headers", () => {
      const result = parseKafkaLog('k: {"x": 1}')
      expect(result!.timestamp).toBeNull()
      expect(result!.headers).toEqual({})
      expect(result!.partition).toBeNull()
      expect(result!.offset).toBeNull()
    })
  })

  describe("Format 1: full Kafka log", () => {
    it("parses all fields from a complete log entry", () => {
      const input =
        "Timestamp: 1769529578993 Header env=prod,version=2 [3] at offset 456: key order-123: " +
        '{"status": "completed"}'
      const result = parseKafkaLog(input)
      expect(result).not.toBeNull()
      expect(result!.timestamp).toBe(1769529578993)
      expect(result!.headers).toEqual({ env: "prod", version: "2" })
      expect(result!.partition).toBe(3)
      expect(result!.offset).toBe(456)
      expect(result!.key).toBe("order-123")
      expect(result!.payload).toEqual({ status: "completed" })
    })

    it("parses log with single header", () => {
      const input = 'Timestamp: 100 Header region=eu [0] at offset 0: key k1: {"a": 1}'
      const result = parseKafkaLog(input)
      expect(result!.headers).toEqual({ region: "eu" })
    })

    it("parses log with multiple headers", () => {
      const input =
        'Timestamp: 200 Header a=1,b=two,c=three [1] at offset 5: key k: {"x": true}'
      const result = parseKafkaLog(input)
      expect(result!.headers).toEqual({ a: "1", b: "two", c: "three" })
    })

    it("parses timestamp and partition without headers", () => {
      const input = 'Timestamp: 5000 [2] at offset 10: key mykey: {"data": "hello"}'
      const result = parseKafkaLog(input)
      expect(result!.timestamp).toBe(5000)
      expect(result!.headers).toEqual({})
      expect(result!.partition).toBe(2)
      expect(result!.offset).toBe(10)
      expect(result!.key).toBe("mykey")
    })

    it("parses timestamp with JSON payload directly (no key)", () => {
      const input = 'Timestamp: 999 {"data": true}'
      const result = parseKafkaLog(input)
      expect(result).not.toBeNull()
      expect(result!.timestamp).toBe(999)
      expect(result!.payload).toEqual({ data: true })
    })

    it("is case-insensitive for Timestamp keyword", () => {
      const input = 'timestamp: 42 {"ok": true}'
      const result = parseKafkaLog(input)
      expect(result!.timestamp).toBe(42)
      expect(result!.payload).toEqual({ ok: true })
    })
  })

  describe("invalid input", () => {
    it("returns null for plain text with no JSON", () => {
      expect(parseKafkaLog("this is not a log or json")).toBeNull()
    })

    it("returns null for malformed JSON starting with {", () => {
      expect(parseKafkaLog("{invalid json content")).toBeNull()
    })

    it("returns null for empty string", () => {
      expect(parseKafkaLog("")).toBeNull()
    })

    it("returns null for whitespace only", () => {
      expect(parseKafkaLog("   \n\t  ")).toBeNull()
    })
  })
})

describe("formatHeaders", () => {
  it("formats headers as key: value strings", () => {
    const result = formatHeaders({ env: "prod", version: "1.0" })
    expect(result).toContain("env: prod")
    expect(result).toContain("version: 1.0")
  })

  it("truncates values longer than 40 characters", () => {
    const longValue = "x".repeat(50)
    const result = formatHeaders({ key: longValue })
    expect(result[0]).toBe(`key: ${"x".repeat(40)}...`)
  })

  it("does not truncate values at exactly 40 characters", () => {
    const exactValue = "y".repeat(40)
    const result = formatHeaders({ key: exactValue })
    expect(result[0]).toBe(`key: ${exactValue}`)
  })

  it("does not truncate values shorter than 40 characters", () => {
    const shortValue = "short"
    const result = formatHeaders({ key: shortValue })
    expect(result[0]).toBe("key: short")
  })

  it("returns empty array for empty headers", () => {
    expect(formatHeaders({})).toEqual([])
  })
})

describe("headersToKafkaFormat", () => {
  it("converts headers to key/Buffer pairs", () => {
    const result = headersToKafkaFormat({ env: "prod", version: "2" })
    expect(result).toHaveLength(2)

    const envHeader = result.find((h) => h.key === "env")
    expect(envHeader).toBeDefined()
    expect(envHeader!.value.toString()).toBe("prod")

    const versionHeader = result.find((h) => h.key === "version")
    expect(versionHeader).toBeDefined()
    expect(versionHeader!.value.toString()).toBe("2")
  })

  it("values are Buffer instances", () => {
    const result = headersToKafkaFormat({ key: "value" })
    expect(Buffer.isBuffer(result[0].value)).toBe(true)
  })

  it("returns empty array for empty headers", () => {
    expect(headersToKafkaFormat({})).toEqual([])
  })

  it("handles empty string values", () => {
    const result = headersToKafkaFormat({ empty: "" })
    expect(result[0].value.toString()).toBe("")
  })
})
