import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import SelectInput from "ink-select-input"
import TextInput from "ink-text-input"
import type { KafkaConfig } from "../types"
import { getSavedConfigs, saveConfig, deleteConfig, type SavedConfig } from "../config/configManager"

interface ConfigManagerScreenProps {
	onSelect: (config: KafkaConfig, name: string) => void
	onBack: () => void
}

export const ConfigManagerScreen = ({ onSelect, onBack }: ConfigManagerScreenProps) => {
	const [configs, setConfigs] = useState<SavedConfig[]>(getSavedConfigs())
	const [showSaveForm, setShowSaveForm] = useState(false)
	const [configName, setConfigName] = useState("")
	const [focusIndex, setFocusIndex] = useState(0)
	const [menu, setMenu] = useState<"list" | "save">("list")

	const loadItems = configs.map((c) => ({ label: `${c.name}`, value: c.name }))
	loadItems.push({ label: "+ Save current config", value: "__save__" })
	loadItems.push({ label: "← Back", value: "__back__" })

	useInput((input, key) => {
		if (key.escape) {
			if (showSaveForm) {
				setShowSaveForm(false)
			} else {
				onBack()
			}
		}
	})

	if (showSaveForm) {
		return (
			<Box flexDirection="column">
				<Text color="yellow" bold>Save Config</Text>
				<Text color="whiteBright">Enter a name for this configuration</Text>
				<Text> </Text>
				<Box flexDirection="column" marginBottom={1}>
					<Text color="cyan">Name:</Text>
					<TextInput value={configName} onChange={setConfigName} placeholder="my-kafka-config" />
				</Box>
				<Box marginTop={1}>
					<Text color="green" bold>[ Save ]</Text>
					<Text> </Text>
					<Text color="gray">[ Esc to cancel ]</Text>
				</Box>
			</Box>
		)
	}

	return (
		<Box flexDirection="column">
			<Text color="yellow" bold>Saved Configurations</Text>
			<Text color="whiteBright">Load a previously saved Kafka config</Text>
			<Text> </Text>
			{configs.length === 0 ? (
				<Text color="gray">No saved configs. Configure Kafka and save it for reuse.</Text>
			) : (
				<SelectInput
					items={loadItems}
					onSelect={(item) => {
						if (item.value === "__back__") {
							onBack()
						} else if (item.value === "__save__") {
							setShowSaveForm(true)
						} else {
							const config = configs.find((c) => c.name === item.value)
							if (config) {
								onSelect(config.kafkaConfig, config.name)
							}
						}
					}}
				/>
			)}
		</Box>
	)
}