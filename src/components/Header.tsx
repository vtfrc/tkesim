import React from "react"
import { Box, Text } from "ink"

export const Header = () => (
	<Box flexDirection="column" marginBottom={1}>
		<Text bold color="cyan">TKESIM - Kafka Event Simulator</Text>
		<Text color="white">{"─".repeat(50)}</Text>
	</Box>
)