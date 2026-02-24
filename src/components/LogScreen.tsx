import React from "react"
import { Box, Text, useInput } from "ink"
import type { SentEvent } from "../types"

interface LogScreenProps {
	events: SentEvent[]
	onBack: () => void
}

export const LogScreen = ({ events, onBack }: LogScreenProps) => {
	useInput((_, key) => {
		if (key.escape) onBack()
	})

	const recentEvents = events.slice(-15)

	return (
		<Box flexDirection="column">
			<Text color="yellow" bold>Sent Events Log ({events.length} total)</Text>
			<Text> </Text>
			{recentEvents.length === 0 ? (
				<Text color="blueBright">No events sent</Text>
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