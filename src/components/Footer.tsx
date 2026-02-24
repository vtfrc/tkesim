import React from "react"
import { Box, Text } from "ink"

interface FooterProps {
	hints: string
}

export const Footer = ({ hints }: FooterProps) => (
	<Box marginTop={1} flexDirection="column">
		<Text color="white">{"─".repeat(50)}</Text>
		<Text color="blueBright">{hints}</Text>
	</Box>
)