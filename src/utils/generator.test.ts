import { describe, it, expect } from "vitest"
import { generateFieldValue, generateEvent, generateEvents, generateFromCustomJson } from "./generator"
import type { EventTemplate } from "../types"

describe("generateFieldValue", () => {
  it("uuid returns a valid UUID string", () => {
    const result = generateFieldValue({ type: "uuid" })
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it("string without generator returns a non-empty string", () => {
    const result = generateFieldValue({ type: "string" })
    expect(typeof result).toBe("string")
    expect((result as string).length).toBeGreaterThan(0)
  })

  it("string with prefix and no generator prepends prefix", () => {
    const result = generateFieldValue({ type: "string", prefix: "PRE_" })
    expect(result as string).toMatch(/^PRE_/)
  })

  it("string with generator evaluates faker path", () => {
    const result = generateFieldValue({ type: "string", generator: "person.fullName" })
    expect(typeof result).toBe("string")
    expect((result as string).length).toBeGreaterThan(0)
  })

  it("string with generator and prefix prepends prefix to generated value", () => {
    const result = generateFieldValue({ type: "string", generator: "person.fullName", prefix: "USER_" })
    expect(result as string).toMatch(/^USER_/)
  })

  it("string with invalid generator falls back gracefully", () => {
    const result = generateFieldValue({ type: "string", generator: "nonexistent.path.deep" })
    expect(typeof result).toBe("string")
    expect((result as string).length).toBeGreaterThan(0)
  })

  it("string with invalid generator and prefix falls back with prefix", () => {
    const result = generateFieldValue({ type: "string", generator: "bad.path", prefix: "FB_" })
    expect(result as string).toMatch(/^FB_/)
  })

  it("number returns integer within default range [0, 100]", () => {
    const result = generateFieldValue({ type: "number" })
    expect(typeof result).toBe("number")
    expect(result as number).toBeGreaterThanOrEqual(0)
    expect(result as number).toBeLessThanOrEqual(100)
  })

  it("number respects min and max", () => {
    for (let i = 0; i < 20; i++) {
      const result = generateFieldValue({ type: "number", min: 50, max: 60 }) as number
      expect(result).toBeGreaterThanOrEqual(50)
      expect(result).toBeLessThanOrEqual(60)
    }
  })

  it("boolean returns a boolean", () => {
    const result = generateFieldValue({ type: "boolean" })
    expect(typeof result).toBe("boolean")
  })

  it("date without format returns YYYY-MM-DD", () => {
    const result = generateFieldValue({ type: "date" })
    expect(result as string).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("date with iso format returns a parseable ISO string", () => {
    const result = generateFieldValue({ type: "date", format: "iso" })
    expect(typeof result).toBe("string")
    expect(isNaN(Date.parse(result as string))).toBe(false)
    expect(result as string).toContain("T")
  })

  it("date with epoch format returns a positive number", () => {
    const result = generateFieldValue({ type: "date", format: "epoch" })
    expect(typeof result).toBe("number")
    expect(result as number).toBeGreaterThan(0)
  })

  it("iban returns an Italian IBAN", () => {
    const result = generateFieldValue({ type: "iban" })
    // IT + 2 check digits + 1 uppercase + 4 digits (bank) + 5 digits (branch) + 12 digits (account)
    expect(result as string).toMatch(/^IT\d{2}[A-Z]\d{21}$/)
  })

  it("amount returns a number within default range [1, 1000]", () => {
    const result = generateFieldValue({ type: "amount" })
    expect(typeof result).toBe("number")
    expect(result as number).toBeGreaterThanOrEqual(1)
    expect(result as number).toBeLessThanOrEqual(1000)
  })

  it("amount respects min, max, and decimals", () => {
    for (let i = 0; i < 20; i++) {
      const result = generateFieldValue({ type: "amount", min: 100, max: 200, decimals: 3 }) as number
      expect(result).toBeGreaterThanOrEqual(100)
      expect(result).toBeLessThanOrEqual(200)
      const decimalPlaces = (String(result).split(".")[1] ?? "").length
      expect(decimalPlaces).toBeLessThanOrEqual(3)
    }
  })

  it("email returns a string containing @", () => {
    const result = generateFieldValue({ type: "email" })
    expect(typeof result).toBe("string")
    expect(result as string).toMatch(/@/)
  })

  it("phone returns a non-empty string", () => {
    const result = generateFieldValue({ type: "phone" })
    expect(typeof result).toBe("string")
    expect((result as string).length).toBeGreaterThan(0)
  })

  it("enum returns one of the provided values", () => {
    const values = ["PENDING", "ACTIVE", "CLOSED"]
    for (let i = 0; i < 20; i++) {
      const result = generateFieldValue({ type: "enum", enumValues: values })
      expect(values).toContain(result)
    }
  })

  it("enum with empty enumValues returns null", () => {
    expect(generateFieldValue({ type: "enum", enumValues: [] })).toBeNull()
  })

  it("enum without enumValues returns null", () => {
    expect(generateFieldValue({ type: "enum" })).toBeNull()
  })

  it("custom returns the fixed value", () => {
    expect(generateFieldValue({ type: "custom", value: "EUR" })).toBe("EUR")
  })

  it("custom without value returns null", () => {
    expect(generateFieldValue({ type: "custom" })).toBeNull()
  })

  it("unknown type returns null", () => {
    expect(generateFieldValue({ type: "unknown" as never })).toBeNull()
  })
})

describe("generateEvent", () => {
  const template: EventTemplate = {
    id: "test",
    name: "Test",
    description: "Test template",
    topic: "test-topic",
    schema: {
      id: { type: "uuid" },
      name: { type: "string", generator: "person.fullName" },
      amount: { type: "amount", min: 10, max: 100 },
      status: { type: "enum", enumValues: ["ACTIVE", "INACTIVE"] },
      eventType: { type: "custom", value: "TEST_EVENT" },
    },
  }

  it("returns an object with all schema fields", () => {
    const event = generateEvent(template)
    expect(Object.keys(event).sort()).toEqual(["amount", "eventType", "id", "name", "status"])
  })

  it("fields match their expected types", () => {
    const event = generateEvent(template)
    expect(typeof event.id).toBe("string")
    expect(event.id as string).toMatch(/^[0-9a-f]{8}-/)
    expect(typeof event.name).toBe("string")
    expect(typeof event.amount).toBe("number")
    expect(["ACTIVE", "INACTIVE"]).toContain(event.status)
    expect(event.eventType).toBe("TEST_EVENT")
  })
})

describe("generateEvents", () => {
  const template: EventTemplate = {
    id: "test",
    name: "Test",
    description: "Test",
    topic: "test-topic",
    schema: {
      id: { type: "uuid" },
    },
  }

  it("returns the requested number of events", () => {
    expect(generateEvents(template, 5)).toHaveLength(5)
    expect(generateEvents(template, 1)).toHaveLength(1)
  })

  it("returns empty array for count 0", () => {
    expect(generateEvents(template, 0)).toHaveLength(0)
  })

  it("each event gets independently generated values", () => {
    const events = generateEvents(template, 10)
    const ids = new Set(events.map((e) => e.id))
    expect(ids.size).toBe(10)
  })
})

describe("generateFromCustomJson", () => {
  it("returns null for invalid JSON", () => {
    expect(generateFromCustomJson("not json at all")).toBeNull()
    expect(generateFromCustomJson("{unclosed")).toBeNull()
    expect(generateFromCustomJson("")).toBeNull()
  })

  it("returns parsed object for JSON without placeholders", () => {
    const result = generateFromCustomJson('{"key": "value", "num": 42, "flag": true}')
    expect(result).toEqual({ key: "value", num: 42, flag: true })
  })

  it("replaces {{uuid}} with a valid UUID", () => {
    const result = generateFromCustomJson('{"id": "{{uuid}}"}')
    expect(result!.id as string).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it("replaces {{iban}} with an Italian IBAN", () => {
    const result = generateFromCustomJson('{"iban": "{{iban}}"}')
    expect(result!.iban as string).toMatch(/^IT\d{2}[A-Z]\d{21}$/)
  })

  it("replaces {{date}} with an ISO date string", () => {
    const result = generateFromCustomJson('{"date": "{{date}}"}')
    expect(typeof result!.date).toBe("string")
    expect(isNaN(Date.parse(result!.date as string))).toBe(false)
  })

  it("replaces {{timestamp}} with a numeric timestamp", () => {
    const before = Date.now()
    const result = generateFromCustomJson('{"ts": "{{timestamp}}"}')
    const after = Date.now()
    expect(typeof result!.ts).toBe("number")
    expect(result!.ts as number).toBeGreaterThanOrEqual(before)
    expect(result!.ts as number).toBeLessThanOrEqual(after)
  })

  it("replaces {{amount:min:max}} with a number in range", () => {
    for (let i = 0; i < 20; i++) {
      const result = generateFromCustomJson('{"amt": "{{amount:50:100}}"}')
      expect(typeof result!.amt).toBe("number")
      expect(result!.amt as number).toBeGreaterThanOrEqual(50)
      expect(result!.amt as number).toBeLessThanOrEqual(100)
    }
  })

  it("replaces {{amount}} with default range [1, 1000]", () => {
    const result = generateFromCustomJson('{"amt": "{{amount}}"}')
    expect(typeof result!.amt).toBe("number")
    expect(result!.amt as number).toBeGreaterThanOrEqual(1)
    expect(result!.amt as number).toBeLessThanOrEqual(1000)
  })

  it("replaces {{int:min:max}} with an integer in range", () => {
    for (let i = 0; i < 20; i++) {
      const result = generateFromCustomJson('{"n": "{{int:10:20}}"}')
      expect(typeof result!.n).toBe("number")
      expect(Number.isInteger(result!.n)).toBe(true)
      expect(result!.n as number).toBeGreaterThanOrEqual(10)
      expect(result!.n as number).toBeLessThanOrEqual(20)
    }
  })

  it("replaces {{int}} with default range [1, 100]", () => {
    const result = generateFromCustomJson('{"n": "{{int}}"}')
    expect(typeof result!.n).toBe("number")
    expect(result!.n as number).toBeGreaterThanOrEqual(1)
    expect(result!.n as number).toBeLessThanOrEqual(100)
  })

  it("replaces {{name}} with a non-empty string", () => {
    const result = generateFromCustomJson('{"name": "{{name}}"}')
    expect(typeof result!.name).toBe("string")
    expect((result!.name as string).length).toBeGreaterThan(0)
  })

  it("replaces {{company}} with a non-empty string", () => {
    const result = generateFromCustomJson('{"co": "{{company}}"}')
    expect(typeof result!.co).toBe("string")
    expect((result!.co as string).length).toBeGreaterThan(0)
  })

  it("replaces {{email}} with an email", () => {
    const result = generateFromCustomJson('{"email": "{{email}}"}')
    expect(result!.email as string).toMatch(/@/)
  })

  it("replaces {{phone}} with a non-empty string", () => {
    const result = generateFromCustomJson('{"phone": "{{phone}}"}')
    expect(typeof result!.phone).toBe("string")
    expect((result!.phone as string).length).toBeGreaterThan(0)
  })

  it("replaces {{word}} with a non-empty string", () => {
    const result = generateFromCustomJson('{"w": "{{word}}"}')
    expect(typeof result!.w).toBe("string")
    expect((result!.w as string).length).toBeGreaterThan(0)
  })

  it("replaces {{sentence}} with a non-empty string", () => {
    const result = generateFromCustomJson('{"s": "{{sentence}}"}')
    expect(typeof result!.s).toBe("string")
    expect((result!.s as string).length).toBeGreaterThan(0)
  })

  it("replaces {{bool}} with a boolean", () => {
    const result = generateFromCustomJson('{"flag": "{{bool}}"}')
    expect(typeof result!.flag).toBe("boolean")
  })

  it("replaces {{boolean}} with a boolean", () => {
    const result = generateFromCustomJson('{"flag": "{{boolean}}"}')
    expect(typeof result!.flag).toBe("boolean")
  })

  it("replaces {{enum:X,Y,Z}} with one of the listed values", () => {
    const options = ["ACTIVE", "INACTIVE", "PENDING"]
    for (let i = 0; i < 20; i++) {
      const result = generateFromCustomJson('{"status": "{{enum:ACTIVE,INACTIVE,PENDING}}"}')
      expect(options).toContain(result!.status)
    }
  })

  it("enum defaults to A,B,C when no params given", () => {
    const result = generateFromCustomJson('{"val": "{{enum}}"}')
    expect(["A", "B", "C"]).toContain(result!.val)
  })

  it("leaves unknown placeholders as-is", () => {
    const result = generateFromCustomJson('{"x": "{{unknown_placeholder}}"}')
    expect(result!.x).toBe("{{unknown_placeholder}}")
  })

  it("processes nested objects recursively", () => {
    const result = generateFromCustomJson('{"outer": {"inner": "{{uuid}}"}}')
    const inner = (result!.outer as Record<string, unknown>).inner as string
    expect(inner).toMatch(/^[0-9a-f]{8}-/)
  })

  it("processes arrays recursively", () => {
    const result = generateFromCustomJson('{"items": ["{{uuid}}", "{{uuid}}"]}')
    const items = result!.items as string[]
    expect(items).toHaveLength(2)
    for (const item of items) {
      expect(item).toMatch(/^[0-9a-f]{8}-/)
    }
  })

  it("preserves non-placeholder strings unchanged", () => {
    const result = generateFromCustomJson('{"msg": "hello world", "num": 99}')
    expect(result!.msg).toBe("hello world")
    expect(result!.num).toBe(99)
  })

  it("handles placeholder embedded in a longer string", () => {
    const result = generateFromCustomJson('{"ref": "order-{{uuid}}-done"}')
    expect(typeof result!.ref).toBe("string")
    expect(result!.ref as string).toMatch(/^order-[0-9a-f]{8}-.*-done$/)
  })
})
