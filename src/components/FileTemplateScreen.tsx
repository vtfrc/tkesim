import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import SelectInput from "ink-select-input"
import TextInput from "ink-text-input"
import type { FileTemplate } from "../config/templateManager"
import { getFileTemplates, saveFileTemplate, deleteFileTemplate } from "../config/templateManager"

interface FileTemplateScreenProps {
	onSelect: (json: string, topic: string) => void
	onBack: () => void
}

export const FileTemplateScreen = ({ onSelect, onBack }: FileTemplateScreenProps) => {
	const [templates, setTemplates] = useState<FileTemplate[]>(getFileTemplates())
	const [showSaveForm, setShowSaveForm] = useState(false)
	const [saveName, setSaveName] = useState("")
	const [saveTopic, setSaveTopic] = useState("")
	const [saveJson, setSaveJson] = useState("")
	const [focusIndex, setFocusIndex] = useState(0)
	const [menu, setMenu] = useState<"list" | "save">("list")

	const items = templates.map((t) => ({ label: `${t.name} → ${t.topic}`, value: t.name }))
	items.push({ label: "+ Save current template", value: "__save__" })
	items.push({ label: "← Back", value: "__back__" })

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
				<Text color="yellow" bold>Save Template</Text>
				<Text color="whiteBright">Save current custom JSON as a template</Text>
				<Text> </Text>
				<Box flexDirection="column" marginBottom={1}>
					<Text color={focusIndex === 0 ? "cyan" : "white"}>
						{focusIndex === 0 ? ">" : " "} Name:
					</Text>
					<Box marginLeft={3}>
						{focusIndex === 0 ? (
							<TextInput value={saveName} onChange={setSaveName} placeholder="my-template" />
						) : (
							<Text color="blueBright">{saveName || "my-template"}</Text>
						)}
					</Box>
				</Box>
				<Box flexDirection="column" marginBottom={1}>
					<Text color={focusIndex === 1 ? "cyan" : "white"}>
						{focusIndex === 1 ? ">" : " "} Topic:
					</Text>
					<Box marginLeft={3}>
						{focusIndex === 1 ? (
							<TextInput value={saveTopic} onChange={setSaveTopic} placeholder="my.topic" />
						) : (
							<Text color="blueBright">{saveTopic || "my.topic"}</Text>
						)}
					</Box>
				</Box>
				<Box flexDirection="column" marginBottom={1}>
					<Text color={focusIndex === 2 ? "cyan" : "white"}>
						{focusIndex === 2 ? ">" : " "} JSON:
					</Text>
					<Box marginLeft={3}>
						{focusIndex === 2 ? (
							<TextInput value={saveJson} onChange={setSaveJson} placeholder='{"event": "{{uuid}}"}' />
						) : (
							<Text color="blueBright">{saveJson || "(enter JSON)"}</Text>
						)}
					</Box>
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
			<Text color="yellow" bold>Saved Templates</Text>
			<Text color="whiteBright">Load or save custom JSON templates</Text>
			<Text> </Text>
			{templates.length === 0 ? (
				<Text color="gray">No saved templates. Create custom JSON and save it.</Text>
			) : (
				<SelectInput
					items={items}
					onSelect={(item) => {
						if (item.value === "__back__") {
							onBack()
						} else if (item.value === "__save__") {
							setShowSaveForm(true)
						} else {
							const template = templates.find((t) => t.name === item.value)
							if (template) {
								onSelect(template.json, template.topic)
							}
						}
					}}
				/>
			)}
		</Box>
	)
}