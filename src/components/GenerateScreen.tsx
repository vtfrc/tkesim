import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import type { EventTemplate, GenerationConfig } from "../types"

interface GenerateScreenProps {
	template: EventTemplate | null
	customTopic: string
	genConfig: GenerationConfig
	onUpdateConfig: (key: keyof GenerationConfig, value: number) => void
	onPreview: () => void
	onSend: () => void
	onBack: () => void
	isConnected: boolean
}

export const GenerateScreen = ({
	template,
	customTopic,
	genConfig,
	onUpdateConfig,
	onPreview,
	onSend,
	onBack,
	isConnected,
}: GenerateScreenProps) => {
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
			<Text color="yellow" bold>Configure Generation</Text>
			<Text color="whiteBright">Topic: {topic}</Text>
			<Text> </Text>

			<Box flexDirection="column" marginBottom={1}>
				<Text color={focusIndex === 0 ? "cyan" : "white"}>
					{focusIndex === 0 ? ">" : " "} Number of events:
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
					{focusIndex === 1 ? ">" : " "} Delay between events (ms):
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
					{focusIndex === 3 ? "[ SEND EVENTS ]" : "  Send Events  "}
					{!isConnected && " (not connected)"}
				</Text>
			</Box>
		</Box>
	)
}