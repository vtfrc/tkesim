#!/usr/bin/env node
import React, { useState, useCallback, useEffect } from "react"
import { randomUUID } from "crypto"
import { render, Box, Text, useInput, useApp } from "ink"
import TextInput from "ink-text-input"
import SelectInput from "ink-select-input"
import Spinner from "ink-spinner"
import {
  type KafkaConfig,
  type EventTemplate,
  type GenerationConfig,
  type SentEvent,
  BANKING_TEMPLATES,
  DEFAULT_KAFKA_CONFIG,
  DEFAULT_GENERATION_CONFIG,
} from "./types"
import { generateEvent, generateEvents, generateFromCustomJson } from "./utils/generator"
import { connectKafka, disconnectKafka, sendEvents, sendEvent } from "./utils/kafka"
import { parseKafkaLog, type ParsedKafkaLog, formatHeaders } from "./utils/logParser"

type Step = "menu" | "config" | "topic" | "template" | "custom" | "paste" | "generate" | "preview" | "sending" | "log"

// Fields that can be regenerated when pasting from log
const REGENERABLE_FIELDS = [
  { key: "eventId", label: "Event ID (UUID)", generator: "uuid" },
  { key: "timestamp", label: "Timestamp", generator: "date" },
  { key: "correlationId", label: "Correlation ID", generator: "uuid" },
  { key: "requestId", label: "Request ID", generator: "uuid" },
  { key: "traceId", label: "Trace ID", generator: "uuid" },
  { key: "sessionId", label: "Session ID", generator: "uuid" },
]

// Header
const Header = () => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold color="cyan">TKESIM - Kafka Event Simulator</Text>
    <Text color="white">{"─".repeat(50)}</Text>
  </Box>
)

// Footer
const Footer = ({ hints }: { hints: string }) => (
  <Box marginTop={1} flexDirection="column">
    <Text color="white">{"─".repeat(50)}</Text>
    <Text color="blueBright">{hints}</Text>
  </Box>
)

// Main Menu
const MainMenu = ({
  isConnected,
  onSelect,
}: {
  isConnected: boolean
  onSelect: (action: string) => void
}) => {
  const items = [
    { label: `${isConnected ? "●" : "○"} Configura Kafka${isConnected ? " (Connesso)" : ""}`, value: "config" },
    { label: "◆ Seleziona Template Evento", value: "template" },
    { label: "◇ Evento Custom (JSON)", value: "custom" },
    { label: "📎 Incolla da Log", value: "paste" },
    { label: "▶ Configura e Invia", value: "generate" },
    { label: "📋 Log Eventi Inviati", value: "log" },
    { label: "✕ Esci", value: "exit" },
  ]

  return (
    <Box flexDirection="column">
      <Text color="yellow" bold>Menu Principale</Text>
      <Text> </Text>
      <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
    </Box>
  )
}

// Kafka Config Screen
const ConfigScreen = ({
  config,
  onUpdate,
  onConnect,
  onBack,
  isConnecting,
  error,
}: {
  config: KafkaConfig
  onUpdate: (key: keyof KafkaConfig, value: string | boolean) => void
  onConnect: () => void
  onBack: () => void
  isConnecting: boolean
  error: string | null
}) => {
  const [focusIndex, setFocusIndex] = useState(0)
  const fields = [
    { key: "brokers" as const, label: "Broker(s)", placeholder: "localhost:9092" },
    { key: "clientId" as const, label: "Client ID", placeholder: "tkesim" },
    { key: "saslUsername" as const, label: "SASL Username (opz.)", placeholder: "" },
    { key: "saslPassword" as const, label: "SASL Password (opz.)", placeholder: "" },
  ]

  useInput((input, key) => {
    if (key.escape) onBack()
    if (key.downArrow || key.tab) setFocusIndex((i) => Math.min(i + 1, fields.length))
    if (key.upArrow) setFocusIndex((i) => Math.max(i - 1, 0))
    if (key.return && focusIndex === fields.length) onConnect()
  })

  return (
    <Box flexDirection="column">
      <Text color="yellow" bold>Configurazione Kafka</Text>
      <Text> </Text>

      {fields.map((field, index) => (
        <Box key={field.key} flexDirection="column" marginBottom={1}>
          <Text color={focusIndex === index ? "cyan" : "white"}>
            {focusIndex === index ? ">" : " "} {field.label}:
          </Text>
          <Box marginLeft={3}>
            {focusIndex === index ? (
              <TextInput
                value={config[field.key] as string}
                onChange={(v) => onUpdate(field.key, v)}
                placeholder={field.placeholder}
                mask={field.key === "saslPassword" ? "*" : undefined}
              />
            ) : (
              <Text color="blueBright">
                {field.key === "saslPassword" && config[field.key]
                  ? "********"
                  : config[field.key] || field.placeholder}
              </Text>
            )}
          </Box>
        </Box>
      ))}

      <Box marginTop={1}>
        <Text
          color={focusIndex === fields.length ? "green" : "white"}
          bold={focusIndex === fields.length}
        >
          {focusIndex === fields.length ? "[ CONNETTI ]" : "  Connetti  "}
        </Text>
        {isConnecting && (
          <Text color="yellow">
            {" "}<Spinner type="dots" /> Connessione...
          </Text>
        )}
      </Box>

      {error && <Text color="red">Errore: {error}</Text>}
    </Box>
  )
}

// Template Selection
const TemplateScreen = ({
  selectedTemplate,
  onSelect,
  onBack,
}: {
  selectedTemplate: EventTemplate | null
  onSelect: (template: EventTemplate) => void
  onBack: () => void
}) => {
  useInput((_, key) => {
    if (key.escape) onBack()
  })

  const items = BANKING_TEMPLATES.map((t) => ({
    label: `${t.name} - ${t.description}`,
    value: t.id,
  }))

  return (
    <Box flexDirection="column">
      <Text color="yellow" bold>Seleziona Template Evento</Text>
      <Text color="whiteBright">Scegli un template predefinito per eventi bancari</Text>
      <Text> </Text>
      <SelectInput
        items={items}
        onSelect={(item) => {
          const template = BANKING_TEMPLATES.find((t) => t.id === item.value)
          if (template) onSelect(template)
        }}
      />
      {selectedTemplate && (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Selezionato: {selectedTemplate.name}</Text>
          <Text color="blueBright">Topic: {selectedTemplate.topic}</Text>
        </Box>
      )}
    </Box>
  )
}

// Custom JSON Screen
const CustomJsonScreen = ({
  customJson,
  customTopic,
  onUpdateJson,
  onUpdateTopic,
  onConfirm,
  onBack,
}: {
  customJson: string
  customTopic: string
  onUpdateJson: (json: string) => void
  onUpdateTopic: (topic: string) => void
  onConfirm: () => void
  onBack: () => void
}) => {
  const [focusIndex, setFocusIndex] = useState(0)

  useInput((_, key) => {
    if (key.escape) onBack()
    if (key.tab || key.downArrow) setFocusIndex((i) => Math.min(i + 1, 2))
    if (key.upArrow) setFocusIndex((i) => Math.max(i - 1, 0))
    if (key.return && focusIndex === 2) onConfirm()
  })

  return (
    <Box flexDirection="column">
      <Text color="yellow" bold>Evento Custom</Text>
      <Text color="whiteBright">Placeholder: {"{{uuid}}"}, {"{{iban}}"}, {"{{amount:10:1000}}"}, {"{{name}}"}, {"{{enum:A,B,C}}"}</Text>
      <Text> </Text>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={focusIndex === 0 ? "cyan" : "white"}>
          {focusIndex === 0 ? ">" : " "} Topic:
        </Text>
        <Box marginLeft={3}>
          {focusIndex === 0 ? (
            <TextInput value={customTopic} onChange={onUpdateTopic} placeholder="my.topic.name" />
          ) : (
            <Text color="blueBright">{customTopic || "my.topic.name"}</Text>
          )}
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={focusIndex === 1 ? "cyan" : "white"}>
          {focusIndex === 1 ? ">" : " "} JSON Payload:
        </Text>
        <Box marginLeft={3}>
          {focusIndex === 1 ? (
            <TextInput
              value={customJson}
              onChange={onUpdateJson}
              placeholder='{"id": "{{uuid}}", "amount": "{{amount:10:500}}"}'
            />
          ) : (
            <Text color="blueBright">{customJson || "(inserisci JSON)"}</Text>
          )}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={focusIndex === 2 ? "green" : "white"} bold={focusIndex === 2}>
          {focusIndex === 2 ? "[ CONFERMA ]" : "  Conferma  "}
        </Text>
      </Box>
    </Box>
  )
}

// Paste from Log Screen
const PasteScreen = ({
  pastedLog,
  pasteTopic,
  regenerateFields,
  includeHeaders,
  onUpdateLog,
  onUpdateTopic,
  onToggleRegenerate,
  onToggleHeaders,
  onPreview,
  onSend,
  onBack,
  isConnected,
  parsedLog,
  parseError,
}: {
  pastedLog: string
  pasteTopic: string
  regenerateFields: Set<string>
  includeHeaders: boolean
  onUpdateLog: (log: string) => void
  onUpdateTopic: (topic: string) => void
  onToggleRegenerate: (field: string) => void
  onToggleHeaders: () => void
  onPreview: () => void
  onSend: () => void
  onBack: () => void
  isConnected: boolean
  parsedLog: ParsedKafkaLog | null
  parseError: string | null
}) => {
  const [focusIndex, setFocusIndex] = useState(0)

  // Calculate existing regenerable fields
  const existingFields = parsedLog?.payload
    ? REGENERABLE_FIELDS.filter((f) => f.key in parsedLog.payload)
    : []

  const hasHeaders = parsedLog && Object.keys(parsedLog.headers).length > 0
  const headerCount = hasHeaders ? Object.keys(parsedLog!.headers).length : 0

  // Focus items: topic, log, [include headers], [regen fields...], preview, send
  const focusItems: string[] = ["topic", "log"]
  if (hasHeaders) focusItems.push("includeHeaders")
  existingFields.forEach((f) => focusItems.push(`regen_${f.key}`))
  focusItems.push("preview", "send")

  useInput((input, key) => {
    if (key.escape) onBack()
    if (key.tab || key.downArrow) setFocusIndex((i) => Math.min(i + 1, focusItems.length - 1))
    if (key.upArrow) setFocusIndex((i) => Math.max(i - 1, 0))

    const currentItem = focusItems[focusIndex]

    // Space to toggle checkboxes
    if (input === " ") {
      if (currentItem === "includeHeaders") {
        onToggleHeaders()
      } else if (currentItem?.startsWith("regen_")) {
        const fieldKey = currentItem.replace("regen_", "")
        onToggleRegenerate(fieldKey)
      }
    }

    if (key.return) {
      if (currentItem === "preview") onPreview()
      if (currentItem === "send" && isConnected) onSend()
    }
  })

  const getFocusIndex = (item: string) => focusItems.indexOf(item)
  const isFocused = (item: string) => focusIndex === getFocusIndex(item)

  return (
    <Box flexDirection="column">
      <Text color="yellow" bold>Incolla Evento da Log</Text>
      <Text color="whiteBright">Supporta: JSON puro, oppure formato log Kafka con Header/offset/key</Text>
      <Text> </Text>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={isFocused("topic") ? "cyan" : "white"}>
          {isFocused("topic") ? ">" : " "} Topic destinazione:
        </Text>
        <Box marginLeft={3}>
          {isFocused("topic") ? (
            <TextInput value={pasteTopic} onChange={onUpdateTopic} placeholder="local.topic.name" />
          ) : (
            <Text color="blueBright">{pasteTopic || "local.topic.name"}</Text>
          )}
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={isFocused("log") ? "cyan" : "white"}>
          {isFocused("log") ? ">" : " "} Log/JSON (incolla qui):
        </Text>
        <Box marginLeft={3}>
          {isFocused("log") ? (
            <TextInput
              value={pastedLog}
              onChange={onUpdateLog}
              placeholder='Timestamp: ... Header ... : {"payload": ...}'
            />
          ) : (
            <Text color={pastedLog ? "blueBright" : "gray"}>
              {pastedLog ? (pastedLog.length > 60 ? pastedLog.substring(0, 60) + "..." : pastedLog) : "(incolla log o JSON)"}
            </Text>
          )}
        </Box>
        {parseError && <Text color="red">   ! {parseError}</Text>}
      </Box>

      {parsedLog && (
        <Box flexDirection="column" marginBottom={1} borderStyle="round" borderColor="gray" padding={1}>
          <Text color="green" bold>✓ Parsing riuscito</Text>
          {parsedLog.key && <Text color="whiteBright">Key: <Text color="cyan">{parsedLog.key}</Text></Text>}
          {parsedLog.offset && <Text color="whiteBright">Offset originale: <Text color="cyan">{parsedLog.offset}</Text></Text>}
          {hasHeaders && (
            <Text color="whiteBright">Headers: <Text color="cyan">{headerCount} trovati</Text></Text>
          )}
          <Text color="whiteBright">Payload: <Text color="cyan">{Object.keys(parsedLog.payload).length} campi</Text></Text>
        </Box>
      )}

      {hasHeaders && (
        <Box flexDirection="column" marginBottom={1}>
          <Box marginLeft={2}>
            <Text color={isFocused("includeHeaders") ? "cyan" : "white"}>
              {isFocused("includeHeaders") ? ">" : " "} {includeHeaders ? "[X]" : "[ ]"} Includi headers nell'invio ({headerCount})
            </Text>
          </Box>
        </Box>
      )}

      {parsedLog && existingFields.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="whiteBright">Campi payload da rigenerare:</Text>
          {existingFields.map((field) => {
            const itemKey = `regen_${field.key}`
            const isChecked = regenerateFields.has(field.key)
            return (
              <Box key={field.key} marginLeft={2}>
                <Text color={isFocused(itemKey) ? "cyan" : "white"}>
                  {isFocused(itemKey) ? ">" : " "} {isChecked ? "[X]" : "[ ]"} {field.label}
                  <Text color="gray"> ({String(parsedLog.payload[field.key]).substring(0, 25)})</Text>
                </Text>
              </Box>
            )
          })}
          <Box marginLeft={3}><Text color="blueBright">Spazio per toggle</Text></Box>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text
          color={isFocused("preview") ? "cyan" : "white"}
          bold={isFocused("preview")}
        >
          {isFocused("preview") ? "[ PREVIEW ]" : "  Preview  "}
        </Text>
        <Text
          color={!isConnected ? "gray" : isFocused("send") ? "green" : "white"}
          bold={isFocused("send")}
        >
          {isFocused("send") ? "[ INVIA EVENTO ]" : "  Invia Evento  "}
          {!isConnected && " (non connesso)"}
        </Text>
      </Box>
    </Box>
  )
}

// Generation Config Screen
const GenerateScreen = ({
  template,
  customTopic,
  genConfig,
  onUpdateConfig,
  onPreview,
  onSend,
  onBack,
  isConnected,
}: {
  template: EventTemplate | null
  customTopic: string
  genConfig: GenerationConfig
  onUpdateConfig: (key: keyof GenerationConfig, value: number) => void
  onPreview: () => void
  onSend: () => void
  onBack: () => void
  isConnected: boolean
}) => {
  const [focusIndex, setFocusIndex] = useState(0)
  const topic = template?.topic || customTopic

  useInput((input, key) => {
    if (key.escape) onBack()
    if (key.tab || key.downArrow) setFocusIndex((i) => Math.min(i + 1, 3))
    if (key.upArrow) setFocusIndex((i) => Math.max(i - 1, 0))
    if (key.return && focusIndex === 2) onPreview()
    if (key.return && focusIndex === 3) onSend()
  })

  return (
    <Box flexDirection="column">
      <Text color="yellow" bold>Configura Generazione</Text>
      <Text color="whiteBright">Topic: {topic}</Text>
      <Text> </Text>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={focusIndex === 0 ? "cyan" : "white"}>
          {focusIndex === 0 ? ">" : " "} Numero Eventi:
        </Text>
        <Box marginLeft={3}>
          {focusIndex === 0 ? (
            <TextInput
              value={String(genConfig.count)}
              onChange={(v) => onUpdateConfig("count", parseInt(v) || 1)}
            />
          ) : (
            <Text color="blueBright">{genConfig.count}</Text>
          )}
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={focusIndex === 1 ? "cyan" : "white"}>
          {focusIndex === 1 ? ">" : " "} Delay tra eventi (ms):
        </Text>
        <Box marginLeft={3}>
          {focusIndex === 1 ? (
            <TextInput
              value={String(genConfig.delayBetweenMs)}
              onChange={(v) => onUpdateConfig("delayBetweenMs", parseInt(v) || 0)}
            />
          ) : (
            <Text color="blueBright">{genConfig.delayBetweenMs}ms</Text>
          )}
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={focusIndex === 2 ? "cyan" : "white"} bold={focusIndex === 2}>
          {focusIndex === 2 ? "[ PREVIEW ]" : "  Preview  "}
        </Text>
        <Text
          color={!isConnected ? "gray" : focusIndex === 3 ? "green" : "white"}
          bold={focusIndex === 3}
        >
          {focusIndex === 3 ? "[ INVIA EVENTI ]" : "  Invia Eventi  "}
          {!isConnected && " (non connesso)"}
        </Text>
      </Box>
    </Box>
  )
}

// Preview Screen
const PreviewScreen = ({
  events,
  onBack,
}: {
  events: Record<string, unknown>[]
  onBack: () => void
}) => {
  const [page, setPage] = useState(0)

  useInput((_, key) => {
    if (key.escape) onBack()
    if (key.rightArrow) setPage((p) => Math.min(p + 1, events.length - 1))
    if (key.leftArrow) setPage((p) => Math.max(p - 1, 0))
  })

  return (
    <Box flexDirection="column">
      <Text color="yellow" bold>Preview Eventi ({page + 1}/{events.length})</Text>
      <Text color="blueBright">← → per navigare, Esc per tornare</Text>
      <Text> </Text>
      <Box borderStyle="round" borderColor="cyan" padding={1}>
        <Text>{JSON.stringify(events[page], null, 2)}</Text>
      </Box>
    </Box>
  )
}

// Sending Screen
const SendingScreen = ({
  sent,
  total,
  lastEvent,
}: {
  sent: number
  total: number
  lastEvent: SentEvent | null
}) => (
  <Box flexDirection="column">
    <Text color="yellow" bold>
      <Spinner type="dots" /> Invio Eventi...
    </Text>
    <Text> </Text>
    <Text color="cyan">
      Progresso: {sent}/{total} ({Math.round((sent / total) * 100)}%)
    </Text>
    <Box marginTop={1}>
      <Text color="white">{"█".repeat(Math.round((sent / total) * 30))}</Text>
      <Text color="gray">{"░".repeat(30 - Math.round((sent / total) * 30))}</Text>
    </Box>
    {lastEvent && (
      <Box marginTop={1}>
        <Text color={lastEvent.status === "sent" ? "green" : "red"}>
          Ultimo: {lastEvent.status === "sent" ? "✓" : "✕"} partition:{lastEvent.partition} offset:{lastEvent.offset}
        </Text>
      </Box>
    )}
  </Box>
)

// Log Screen
const LogScreen = ({
  events,
  onBack,
}: {
  events: SentEvent[]
  onBack: () => void
}) => {
  useInput((_, key) => {
    if (key.escape) onBack()
  })

  const recentEvents = events.slice(-15)

  return (
    <Box flexDirection="column">
      <Text color="yellow" bold>Log Eventi Inviati ({events.length} totali)</Text>
      <Text> </Text>
      {recentEvents.length === 0 ? (
        <Text color="blueBright">Nessun evento inviato</Text>
      ) : (
        recentEvents.map((event, i) => (
          <Text key={i} color={event.status === "sent" ? "green" : "red"}>
            {event.status === "sent" ? "✓" : "✕"} {event.timestamp.toLocaleTimeString()} → {event.topic} [p:{event.partition} o:{event.offset}]
          </Text>
        ))
      )}
    </Box>
  )
}

// Main App
const App = () => {
  const { exit } = useApp()
  const [step, setStep] = useState<Step>("menu")
  const [kafkaConfig, setKafkaConfig] = useState<KafkaConfig>(DEFAULT_KAFKA_CONFIG)
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null)
  const [customJson, setCustomJson] = useState('{"eventId": "{{uuid}}", "amount": "{{amount:10:1000}}"}')
  const [customTopic, setCustomTopic] = useState("test.events")
  const [pastedLog, setPastedLog] = useState("")
  const [pasteTopic, setPasteTopic] = useState("local.events")
  const [regenerateFields, setRegenerateFields] = useState<Set<string>>(new Set(["eventId", "timestamp"]))
  const [includeHeaders, setIncludeHeaders] = useState(true)
  const [parsedLog, setParsedLog] = useState<ParsedKafkaLog | null>(null)
  const [pasteParseError, setPasteParseError] = useState<string | null>(null)
  const [genConfig, setGenConfig] = useState<GenerationConfig>(DEFAULT_GENERATION_CONFIG)
  const [previewEvents, setPreviewEvents] = useState<Record<string, unknown>[]>([])
  const [sentEvents, setSentEvents] = useState<SentEvent[]>([])
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 })
  const [lastSentEvent, setLastSentEvent] = useState<SentEvent | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleMenuSelect = useCallback((action: string) => {
    setError(null)
    switch (action) {
      case "config":
        setStep("config")
        break
      case "template":
        setStep("template")
        break
      case "custom":
        setStep("custom")
        break
      case "paste":
        setStep("paste")
        break
      case "generate":
        if (!selectedTemplate && !customJson) {
          setError("Seleziona prima un template o inserisci JSON custom")
          return
        }
        setStep("generate")
        break
      case "log":
        setStep("log")
        break
      case "exit":
        disconnectKafka().then(() => exit())
        break
    }
  }, [selectedTemplate, customJson, exit])

  const handleConnect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    const success = await connectKafka(kafkaConfig)
    setIsConnecting(false)
    setConnected(success)
    if (success) {
      setStep("menu")
    } else {
      setError("Connessione fallita. Verifica broker e credenziali.")
    }
  }, [kafkaConfig])

  const handlePreview = useCallback(() => {
    let events: Record<string, unknown>[] = []

    if (selectedTemplate) {
      events = generateEvents(selectedTemplate, Math.min(genConfig.count, 5))
    } else if (customJson) {
      const parsed = generateFromCustomJson(customJson)
      if (parsed) {
        events = Array(Math.min(genConfig.count, 5)).fill(null).map(() => generateFromCustomJson(customJson)!)
      }
    }

    setPreviewEvents(events)
    setStep("preview")
  }, [selectedTemplate, customJson, genConfig.count])

  const handleSend = useCallback(async () => {
    if (!connected) {
      setError("Non connesso a Kafka")
      return
    }

    const topic = selectedTemplate?.topic || customTopic
    let events: Record<string, unknown>[] = []

    if (selectedTemplate) {
      events = generateEvents(selectedTemplate, genConfig.count)
    } else if (customJson) {
      events = Array(genConfig.count).fill(null).map(() => generateFromCustomJson(customJson)!)
    }

    setStep("sending")
    setSendProgress({ sent: 0, total: events.length })

    const results = await sendEvents(topic, events, genConfig.delayBetweenMs, (sent, total, event) => {
      setSendProgress({ sent, total })
      setLastSentEvent(event)
    })

    setSentEvents((prev) => [...prev, ...results])
    setStep("log")
  }, [connected, selectedTemplate, customTopic, customJson, genConfig])

  const goToMenu = useCallback(() => setStep("menu"), [])

  // Handle pasted log/JSON changes
  const handlePastedLogChange = useCallback((log: string) => {
    setPastedLog(log)
    if (!log.trim()) {
      setParsedLog(null)
      setPasteParseError(null)
      return
    }

    const parsed = parseKafkaLog(log)
    if (parsed) {
      setParsedLog(parsed)
      setPasteParseError(null)
    } else {
      setParsedLog(null)
      setPasteParseError("Formato non riconosciuto (JSON o log Kafka)")
    }
  }, [])

  // Toggle include headers
  const handleToggleHeaders = useCallback(() => {
    setIncludeHeaders((prev) => !prev)
  }, [])

  // Toggle regenerate field
  const handleToggleRegenerate = useCallback((field: string) => {
    setRegenerateFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) {
        next.delete(field)
      } else {
        next.add(field)
      }
      return next
    })
  }, [])

  // Apply regeneration to pasted event
  const applyRegeneration = useCallback((event: Record<string, unknown>): Record<string, unknown> => {
    const result = { ...event }
    for (const field of REGENERABLE_FIELDS) {
      if (regenerateFields.has(field.key) && field.key in result) {
        if (field.generator === "uuid") {
          result[field.key] = randomUUID()
        } else if (field.generator === "date") {
          result[field.key] = new Date().toISOString()
        }
      }
    }
    return result
  }, [regenerateFields])

  // Preview pasted event
  const handlePastePreview = useCallback(() => {
    if (parsedLog) {
      const regenerated = applyRegeneration(parsedLog.payload)
      setPreviewEvents([regenerated])
      setStep("preview")
    }
  }, [parsedLog, applyRegeneration])

  // Send pasted event
  const handlePasteSend = useCallback(async () => {
    if (!connected || !parsedLog) {
      setError("Non connesso o evento non valido")
      return
    }

    const regenerated = applyRegeneration(parsedLog.payload)
    const headersToSend = includeHeaders ? parsedLog.headers : undefined
    const keyToSend = parsedLog.key || undefined

    setStep("sending")
    setSendProgress({ sent: 0, total: 1 })

    // Send single event with key and headers
    const result = await sendEvent(pasteTopic, regenerated, keyToSend, headersToSend)
    setSendProgress({ sent: 1, total: 1 })
    setLastSentEvent(result)

    setSentEvents((prev) => [...prev, result])
    setStep("log")
  }, [connected, parsedLog, pasteTopic, includeHeaders, applyRegeneration])

  return (
    <Box flexDirection="column" padding={1}>
      <Header />

      {step === "menu" && (
        <MainMenu isConnected={connected} onSelect={handleMenuSelect} />
      )}

      {step === "config" && (
        <ConfigScreen
          config={kafkaConfig}
          onUpdate={(key, value) => setKafkaConfig((c) => ({ ...c, [key]: value }))}
          onConnect={handleConnect}
          onBack={goToMenu}
          isConnecting={isConnecting}
          error={error}
        />
      )}

      {step === "template" && (
        <TemplateScreen
          selectedTemplate={selectedTemplate}
          onSelect={(t) => {
            setSelectedTemplate(t)
            setStep("menu")
          }}
          onBack={goToMenu}
        />
      )}

      {step === "custom" && (
        <CustomJsonScreen
          customJson={customJson}
          customTopic={customTopic}
          onUpdateJson={setCustomJson}
          onUpdateTopic={setCustomTopic}
          onConfirm={() => {
            setSelectedTemplate(null)
            setStep("menu")
          }}
          onBack={goToMenu}
        />
      )}

      {step === "paste" && (
        <PasteScreen
          pastedLog={pastedLog}
          pasteTopic={pasteTopic}
          regenerateFields={regenerateFields}
          includeHeaders={includeHeaders}
          onUpdateLog={handlePastedLogChange}
          onUpdateTopic={setPasteTopic}
          onToggleRegenerate={handleToggleRegenerate}
          onToggleHeaders={handleToggleHeaders}
          onPreview={handlePastePreview}
          onSend={handlePasteSend}
          onBack={goToMenu}
          isConnected={connected}
          parsedLog={parsedLog}
          parseError={pasteParseError}
        />
      )}

      {step === "generate" && (
        <GenerateScreen
          template={selectedTemplate}
          customTopic={customTopic}
          genConfig={genConfig}
          onUpdateConfig={(key, value) => setGenConfig((c) => ({ ...c, [key]: value }))}
          onPreview={handlePreview}
          onSend={handleSend}
          onBack={goToMenu}
          isConnected={connected}
        />
      )}

      {step === "preview" && (
        <PreviewScreen events={previewEvents} onBack={() => setStep("generate")} />
      )}

      {step === "sending" && (
        <SendingScreen sent={sendProgress.sent} total={sendProgress.total} lastEvent={lastSentEvent} />
      )}

      {step === "log" && <LogScreen events={sentEvents} onBack={goToMenu} />}

      {error && step === "menu" && <Text color="red">Errore: {error}</Text>}

      <Footer
        hints={
          step === "menu"
            ? "↑↓: Naviga | Invio: Seleziona"
            : "Esc: Indietro | Tab/↓: Avanti | Invio: Conferma"
        }
      />
    </Box>
  )
}

// Render
render(<App />)
