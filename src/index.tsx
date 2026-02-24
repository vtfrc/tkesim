#!/usr/bin/env node
import React, { useState, useCallback } from "react"
import { randomUUID } from "crypto"
import { render, Box, Text, useApp } from "ink"
import {
	Header,
	Footer,
	MainMenu,
	ConfigScreen,
	TemplateScreen,
	CustomJsonScreen,
	PasteScreen,
	GenerateScreen,
	PreviewScreen,
	SendingScreen,
	LogScreen,
	SetupScreen,
} from "./components"
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
import { parseKafkaLog, type ParsedKafkaLog } from "./utils/logParser"

type Step = "menu" | "config" | "topic" | "template" | "custom" | "paste" | "generate" | "preview" | "sending" | "log" | "setup"

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
			case "setup":
				setStep("setup")
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
					setError("First select a template or enter custom JSON")
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
			setError("Connection failed. Verify broker and credentials.")
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
			setError("Not connected to Kafka")
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
			setPasteParseError("Unrecognized format (JSON or Kafka log)")
		}
	}, [])

	const handleToggleHeaders = useCallback(() => {
		setIncludeHeaders((prev) => !prev)
	}, [])

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

	const REGENERABLE_FIELDS = [
		{ key: "eventId", label: "Event ID (UUID)", generator: "uuid" },
		{ key: "timestamp", label: "Timestamp", generator: "date" },
		{ key: "correlationId", label: "Correlation ID", generator: "uuid" },
		{ key: "requestId", label: "Request ID", generator: "uuid" },
		{ key: "traceId", label: "Trace ID", generator: "uuid" },
		{ key: "sessionId", label: "Session ID", generator: "uuid" },
	]

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

	const handlePastePreview = useCallback(() => {
		if (parsedLog) {
			const regenerated = applyRegeneration(parsedLog.payload)
			setPreviewEvents([regenerated])
			setStep("preview")
		}
	}, [parsedLog, applyRegeneration])

	const handlePasteSend = useCallback(async () => {
		if (!connected || !parsedLog) {
			setError("Not connected or invalid event")
			return
		}

		const regenerated = applyRegeneration(parsedLog.payload)
		const headersToSend = includeHeaders ? parsedLog.headers : undefined
		const keyToSend = parsedLog.key || undefined

		setStep("sending")
		setSendProgress({ sent: 0, total: 1 })

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

			{step === "setup" && (
				<SetupScreen
					onBack={goToMenu}
					onKafkaReady={() => {
						setKafkaConfig((c) => ({ ...c, brokers: "localhost:9092" }))
						setStep("config")
					}}
				/>
			)}

			{error && step === "menu" && <Text color="red">Error: {error}</Text>}

			<Footer
				hints={
					step === "menu"
						? "↑↓: Navigate | Enter: Select"
						: "Esc: Back | Tab/↓: Next | Enter: Confirm"
				}
			/>
		</Box>
	)
}

render(<App />)