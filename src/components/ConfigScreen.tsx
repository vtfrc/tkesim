import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import Spinner from "ink-spinner"
import type { KafkaConfig } from "../types"

interface ConfigScreenProps {
	config: KafkaConfig
	onUpdate: (key: keyof KafkaConfig, value: string | boolean) => void
	onConnect: () => void
	onBack: () => void
	isConnecting: boolean
	error: string | null
}

export const ConfigScreen = ({
	config,
	onUpdate,
	onConnect,
	onBack,
	isConnecting,
	error,
}: ConfigScreenProps) => {
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
			<Text color="yellow" bold>Kafka Configuration</Text>
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
					{focusIndex === fields.length ? "[ CONNECT ]" : "  Connect  "}
				</Text>
				{isConnecting && (
					<Text color="yellow">
						{" "}<Spinner type="dots" /> Connecting...
					</Text>
				)}
			</Box>

			{error && <Text color="red">Error: {error}</Text>}
		</Box>
	)
}