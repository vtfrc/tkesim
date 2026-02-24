import React, { useState } from "react"
import { Box, Text, useInput } from "ink"

interface PreviewScreenProps {
	events: Record<string, unknown>[]
	onBack: () => void
}

export const PreviewScreen = ({ events, onBack }: PreviewScreenProps) => {
	const [page, setPage] = useState(0)

	useInput((_, key) => {
		if (key.escape) onBack()
		if (key.rightArrow) setPage((p) => Math.min(p + 1, events.length - 1))
		if (key.leftArrow) setPage((p) => Math.max(p - 1, 0))
	})

	return (
		<Box flexDirection="column">
			<Text color="yellow" bold>Preview Eventi ({page + 1}/{events.length})</Text>
			<Text color="blueBright">← → to navigate, Esc to go back</Text>
			<Text> </Text>
			<Box borderStyle="round" borderColor="cyan" padding={1}>
				<Text>{JSON.stringify(events[page], null, 2)}</Text>
			</Box>
		</Box>
	)
}