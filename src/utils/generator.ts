import { faker } from "@faker-js/faker/locale/it"
import type { FieldSchema, EventTemplate } from "../types"

// Generate Italian IBAN
function generateIBAN(): string {
  const countryCode = "IT"
  const checkDigits = faker.string.numeric(2)
  const bankCode = faker.string.alpha({ length: 1, casing: "upper" }) + faker.string.numeric(4)
  const branchCode = faker.string.numeric(5)
  const accountNumber = faker.string.numeric(12)
  return `${countryCode}${checkDigits}${bankCode}${branchCode}${accountNumber}`
}

// Generate value based on field schema
export function generateFieldValue(schema: FieldSchema): unknown {
  switch (schema.type) {
    case "uuid":
      return faker.string.uuid()

    case "string":
      if (schema.generator) {
        return evaluateFakerPath(schema.generator, schema.prefix)
      }
      return schema.prefix ? `${schema.prefix}${faker.string.alphanumeric(8)}` : faker.lorem.word()

    case "number":
      return faker.number.int({ min: schema.min ?? 0, max: schema.max ?? 100 })

    case "boolean":
      return faker.datatype.boolean()

    case "date":
      const date = faker.date.recent({ days: 30 })
      if (schema.format === "iso") {
        return date.toISOString()
      } else if (schema.format === "epoch") {
        return date.getTime()
      }
      return date.toISOString().split("T")[0]

    case "iban":
      return generateIBAN()

    case "amount":
      const amount = faker.number.float({
        min: schema.min ?? 1,
        max: schema.max ?? 1000,
        fractionDigits: schema.decimals ?? 2,
      })
      return parseFloat(amount.toFixed(schema.decimals ?? 2))

    case "email":
      return faker.internet.email()

    case "phone":
      return faker.phone.number()

    case "enum":
      if (schema.enumValues && schema.enumValues.length > 0) {
        return faker.helpers.arrayElement(schema.enumValues)
      }
      return null

    case "custom":
      return schema.value ?? null

    default:
      return null
  }
}

// Evaluate faker path like "person.fullName" or "company.name"
function evaluateFakerPath(path: string, prefix?: string): string {
  try {
    const parts = path.split(".")
    let result: unknown = faker

    for (const part of parts) {
      if (result && typeof result === "object" && part in result) {
        const next = (result as Record<string, unknown>)[part]
        if (typeof next === "function") {
          result = next.call(result)
        } else {
          result = next
        }
      } else {
        return prefix ? `${prefix}${faker.string.alphanumeric(8)}` : faker.lorem.word()
      }
    }

    const finalValue = String(result)
    return prefix ? `${prefix}${finalValue}` : finalValue
  } catch {
    return prefix ? `${prefix}${faker.string.alphanumeric(8)}` : faker.lorem.word()
  }
}

// Generate a complete event from template
export function generateEvent(template: EventTemplate): Record<string, unknown> {
  const event: Record<string, unknown> = {}

  for (const [fieldName, fieldSchema] of Object.entries(template.schema)) {
    event[fieldName] = generateFieldValue(fieldSchema)
  }

  return event
}

// Generate multiple events
export function generateEvents(template: EventTemplate, count: number): Record<string, unknown>[] {
  const events: Record<string, unknown>[] = []

  for (let i = 0; i < count; i++) {
    events.push(generateEvent(template))
  }

  return events
}

// Parse and generate from custom JSON schema
export function generateFromCustomJson(jsonString: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(jsonString)

    // Replace placeholders like {{uuid}}, {{iban}}, {{amount:10:1000}}, etc.
    const result = processPlaceholders(parsed)
    return result as Record<string, unknown>
  } catch {
    return null
  }
}

function processPlaceholders(obj: unknown): unknown {
  if (typeof obj === "string") {
    // Check for placeholders
    const placeholderRegex = /\{\{(\w+)(?::([^}]+))?\}\}/g
    let match
    let result = obj

    while ((match = placeholderRegex.exec(obj)) !== null) {
      const [fullMatch, type, params] = match
      const value = generatePlaceholderValue(type, params)
      result = result.replace(fullMatch, String(value))
    }

    // If the entire string was a placeholder, try to return the actual type
    if (obj.match(/^\{\{(\w+)(?::([^}]+))?\}\}$/)) {
      const [, type, params] = obj.match(/^\{\{(\w+)(?::([^}]+))?\}\}$/)!
      return generatePlaceholderValue(type, params)
    }

    return result
  }

  if (Array.isArray(obj)) {
    return obj.map(processPlaceholders)
  }

  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processPlaceholders(value)
    }
    return result
  }

  return obj
}

function generatePlaceholderValue(type: string, params?: string): unknown {
  switch (type.toLowerCase()) {
    case "uuid":
      return faker.string.uuid()
    case "iban":
      return generateIBAN()
    case "date":
      return new Date().toISOString()
    case "timestamp":
      return Date.now()
    case "amount": {
      const [min, max] = (params || "1:1000").split(":").map(Number)
      return parseFloat(faker.number.float({ min, max, fractionDigits: 2 }).toFixed(2))
    }
    case "int": {
      const [min, max] = (params || "1:100").split(":").map(Number)
      return faker.number.int({ min, max })
    }
    case "name":
      return faker.person.fullName()
    case "company":
      return faker.company.name()
    case "email":
      return faker.internet.email()
    case "phone":
      return faker.phone.number()
    case "word":
      return faker.lorem.word()
    case "sentence":
      return faker.lorem.sentence()
    case "bool":
    case "boolean":
      return faker.datatype.boolean()
    case "enum": {
      const values = (params || "A,B,C").split(",")
      return faker.helpers.arrayElement(values)
    }
    default:
      return `{{${type}}}`
  }
}
