import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"

interface CustomJsonScreenProps {
	customJson: string
	customTopic: string
	onUpdateJson: (json: string) => void
	onUpdateTopic: (topic: string) => void
	onConfirm: () => void
	onBack: () => void
}

export const CustomJsonScreen = ({
	customJson,
	customTopic,
	onUpdateJson,
	onUpdateTopic,
	onConfirm,
	onBack,
}: CustomJsonScreenProps) => {
	const [focusIndex, setFocusIndex] = useState(0)

	useInput((_, key) => {
		if (key.escape) onBack()
		if (key.tab || key.downArrow) setFocusIndex((i) => Math.min(i + 1, 2))
		if (key.upArrow) setFocusIndex((i) => Math.max(i - 1, 0))
		if (key.return && focusIndex === 2) onConfirm()
	})

	return (
		<Box flexDirection="column">
			<Text color="yellow" bold>Custom Event</Text>
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
						<Text color="blueBright">{customJson || "(enter JSON)"}</Text>
					)}
				</Box>
			</Box>

			<Box marginTop={1}>
				<Text color={focusIndex === 2 ? "green" : "white"} bold={focusIndex === 2}>
					{focusIndex === 2 ? "[ CONFIRM ]" : "  Confirm  "}
				</Text>
			</Box>
		</Box>
	)
}