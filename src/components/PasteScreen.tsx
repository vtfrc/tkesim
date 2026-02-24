import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import type { ParsedKafkaLog } from "../utils/logParser"

interface PasteScreenProps {
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
}

const REGENERABLE_FIELDS = [
	{ key: "eventId", label: "Event ID (UUID)", generator: "uuid" },
	{ key: "timestamp", label: "Timestamp", generator: "date" },
	{ key: "correlationId", label: "Correlation ID", generator: "uuid" },
	{ key: "requestId", label: "Request ID", generator: "uuid" },
	{ key: "traceId", label: "Trace ID", generator: "uuid" },
	{ key: "sessionId", label: "Session ID", generator: "uuid" },
]

export const PasteScreen = ({
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
}: PasteScreenProps) => {
	const [focusIndex, setFocusIndex] = useState(0)

	const existingFields = parsedLog?.payload
		? REGENERABLE_FIELDS.filter((f) => f.key in parsedLog.payload)
		: []

	const hasHeaders = parsedLog && Object.keys(parsedLog.headers).length > 0
	const headerCount = hasHeaders ? Object.keys(parsedLog!.headers).length : 0

	const focusItems: string[] = ["topic", "log"]
	if (hasHeaders) focusItems.push("includeHeaders")
	existingFields.forEach((f) => focusItems.push(`regen_${f.key}`))
	focusItems.push("preview", "send")

	useInput((input, key) => {
		if (key.escape) onBack()
		if (key.tab || key.downArrow) setFocusIndex((i) => Math.min(i + 1, focusItems.length - 1))
		if (key.upArrow) setFocusIndex((i) => Math.max(i - 1, 0))

		const currentItem = focusItems[focusIndex]

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
			<Text color="yellow" bold>Paste Event from Log</Text>
			<Text color="whiteBright">Supports: pure JSON, or Kafka log format with Header/offset/key</Text>
			<Text> </Text>

			<Box flexDirection="column" marginBottom={1}>
				<Text color={isFocused("topic") ? "cyan" : "white"}>
					{isFocused("topic") ? ">" : " "} Destination topic:
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
					{isFocused("log") ? ">" : " "} Log/JSON (paste here):
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
							{pastedLog ? (pastedLog.length > 60 ? pastedLog.substring(0, 60) + "..." : pastedLog) : "(paste log or JSON)"}
						</Text>
					)}
				</Box>
				{parseError && <Text color="red">   ! {parseError}</Text>}
			</Box>

			{parsedLog && (
				<Box flexDirection="column" marginBottom={1} borderStyle="round" borderColor="gray" padding={1}>
					<Text color="green" bold>✓ Parsing succeeded</Text>
					{parsedLog.key && <Text color="whiteBright">Key: <Text color="cyan">{parsedLog.key}</Text></Text>}
					{parsedLog.offset && <Text color="whiteBright">Original offset: <Text color="cyan">{parsedLog.offset}</Text></Text>}
					{hasHeaders && (
						<Text color="whiteBright">Headers: <Text color="cyan">{headerCount} found</Text></Text>
					)}
					<Text color="whiteBright">Payload: <Text color="cyan">{Object.keys(parsedLog.payload).length} fields</Text></Text>
				</Box>
			)}

			{hasHeaders && (
				<Box flexDirection="column" marginBottom={1}>
					<Box marginLeft={2}>
						<Text color={isFocused("includeHeaders") ? "cyan" : "white"}>
							{isFocused("includeHeaders") ? ">" : " "} {includeHeaders ? "[X]" : "[ ]"} Include headers in send ({headerCount})
						</Text>
					</Box>
				</Box>
			)}

			{parsedLog && existingFields.length > 0 && (
				<Box flexDirection="column" marginBottom={1}>
					<Text color="whiteBright">Payload fields to regenerate:</Text>
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
					<Box marginLeft={3}><Text color="blueBright">Space to toggle</Text></Box>
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
					{isFocused("send") ? "[ SEND EVENT ]" : "  Send Event  "}
					{!isConnected && " (not connected)"}
				</Text>
			</Box>
		</Box>
	)
}