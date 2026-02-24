import React from "react"
import { Box, Text } from "ink"
import SelectInput from "ink-select-input"

interface MainMenuProps {
	isConnected: boolean
	onSelect: (action: string) => void
}

export const MainMenu = ({ isConnected, onSelect }: MainMenuProps) => {
	const items = [
		{ label: isConnected ? "✅ Configure Kafka (Connected)" : "🔧 Configure Kafka", value: "config" },
		{ label: "⚙️ Setup Local Kafka", value: "setup" },
		{ label: "📋 Select Event Template", value: "template" },
		{ label: "📝 Custom Event (JSON)", value: "custom" },
		{ label: "📎 Paste from Log", value: "paste" },
		{ label: "🚀 Configure and Send", value: "generate" },
		{ label: "📊 Sent Events Log", value: "log" },
		{ label: "❌ Exit", value: "exit" },
	]

	return (
		<Box flexDirection="column">
			<Text color="yellow" bold>Main Menu</Text>
			<Text> </Text>
			<SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
		</Box>
	)
}