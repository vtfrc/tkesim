export interface ParsedKafkaLog {
  timestamp: number | null
  headers: Record<string, string>
  partition: number | null
  offset: number | null
  key: string | null
  payload: Record<string, unknown>
}

/**
 * Parse a Kafka log entry in various formats:
 *
 * Format 1 (full log):
 * Timestamp: 1769529578993 Header key1=val1,key2=val2 [partition] at offset 123: key mykey: {"json": "payload"}
 *
 * Format 2 (just JSON):
 * {"json": "payload"}
 *
 * Format 3 (key: JSON):
 * mykey: {"json": "payload"}
 */
export function parseKafkaLog(input: string): ParsedKafkaLog | null {
  const trimmed = input.trim()

  // Try to parse as plain JSON first
  if (trimmed.startsWith("{")) {
    try {
      const payload = JSON.parse(trimmed)
      return {
        timestamp: null,
        headers: {},
        partition: null,
        offset: null,
        key: null,
        payload,
      }
    } catch {
      // Not valid JSON, continue with other formats
    }
  }

  // Try to parse full Kafka log format
  const result: ParsedKafkaLog = {
    timestamp: null,
    headers: {},
    partition: null,
    offset: null,
    key: null,
    payload: {},
  }

  let remaining = trimmed

  // Extract timestamp
  const timestampMatch = remaining.match(/^Timestamp:\s*(\d+)\s*/i)
  if (timestampMatch) {
    result.timestamp = parseInt(timestampMatch[1])
    remaining = remaining.slice(timestampMatch[0].length)
  }

  // Extract headers
  const headerMatch = remaining.match(/^Header\s+([^\[]+)\s*/)
  if (headerMatch) {
    const headerString = headerMatch[1].trim()
    // Parse headers: key1=val1,key2=val2
    const headerPairs = headerString.split(",")
    for (const pair of headerPairs) {
      const eqIndex = pair.indexOf("=")
      if (eqIndex > 0) {
        const key = pair.slice(0, eqIndex).trim()
        const value = pair.slice(eqIndex + 1).trim()
        result.headers[key] = value
      }
    }
    remaining = remaining.slice(headerMatch[0].length)
  }

  // Extract partition [n]
  const partitionMatch = remaining.match(/^\[(\d+)\]\s*/)
  if (partitionMatch) {
    result.partition = parseInt(partitionMatch[1])
    remaining = remaining.slice(partitionMatch[0].length)
  }

  // Extract offset
  const offsetMatch = remaining.match(/^at\s+offset\s+(\d+):\s*/i)
  if (offsetMatch) {
    result.offset = parseInt(offsetMatch[1])
    remaining = remaining.slice(offsetMatch[0].length)
  }

  // Extract key (everything before the JSON)
  const keyJsonMatch = remaining.match(/^key\s+([^{]+):\s*(\{.*)$/s)
  if (keyJsonMatch) {
    result.key = keyJsonMatch[1].trim()
    remaining = keyJsonMatch[2]
  } else {
    // Maybe just "key: {json}" format
    const simpleKeyMatch = remaining.match(/^([^{]+):\s*(\{.*)$/s)
    if (simpleKeyMatch) {
      result.key = simpleKeyMatch[1].trim()
      remaining = simpleKeyMatch[2]
    }
  }

  // Parse the JSON payload
  try {
    // Find the JSON part - it should start with { and we need to find the matching }
    const jsonStart = remaining.indexOf("{")
    if (jsonStart >= 0) {
      const jsonString = remaining.slice(jsonStart)
      result.payload = JSON.parse(jsonString)
      return result
    }
  } catch (e) {
    // Try to extract just the JSON part more aggressively
    const jsonMatch = remaining.match(/(\{[\s\S]*\})\s*$/)
    if (jsonMatch) {
      try {
        result.payload = JSON.parse(jsonMatch[1])
        return result
      } catch {
        return null
      }
    }
    return null
  }

  return Object.keys(result.payload).length > 0 ? result : null
}

/**
 * Format headers for display
 */
export function formatHeaders(headers: Record<string, string>): string[] {
  return Object.entries(headers).map(([key, value]) => {
    const displayValue = value.length > 40 ? value.slice(0, 40) + "..." : value
    return `${key}: ${displayValue}`
  })
}

/**
 * Convert headers object to Kafka message headers format
 */
export function headersToKafkaFormat(headers: Record<string, string>): { key: string; value: Buffer }[] {
  return Object.entries(headers).map(([key, value]) => ({
    key,
    value: Buffer.from(value),
  }))
}
