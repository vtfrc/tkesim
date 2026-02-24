import React from "react"
import { Box, Text } from "ink"
import Spinner from "ink-spinner"
import type { SentEvent } from "../types"

interface SendingScreenProps {
	sent: number
	total: number
	lastEvent: SentEvent | null
}

export const SendingScreen = ({ sent, total, lastEvent }: SendingScreenProps) => (
	<Box flexDirection="column">
		<Text color="yellow" bold>
			<Spinner type="dots" /> Sending Events...
		</Text>
		<Text> </Text>
		<Text color="cyan">
			Progress: {sent}/{total} ({Math.round((sent / total) * 100)}%)
		</Text>
		<Box marginTop={1}>
			<Text color="white">{"█".repeat(Math.round((sent / total) * 30))}</Text>
			<Text color="gray">{"░".repeat(30 - Math.round((sent / total) * 30))}</Text>
		</Box>
		{lastEvent && (
			<Box marginTop={1}>
				<Text color={lastEvent.status === "sent" ? "green" : "red"}>
					Last: {lastEvent.status === "sent" ? "✓" : "✕"} partition:{lastEvent.partition} offset:{lastEvent.offset}
				</Text>
			</Box>
		)}
	</Box>
)