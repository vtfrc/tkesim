import React from "react"
import { Box, Text, useInput } from "ink"
import SelectInput from "ink-select-input"
import type { EventTemplate } from "../types"
import { BANKING_TEMPLATES } from "../templates"

interface TemplateScreenProps {
	selectedTemplate: EventTemplate | null
	onSelect: (template: EventTemplate) => void
	onBack: () => void
}

export const TemplateScreen = ({
	selectedTemplate,
	onSelect,
	onBack,
}: TemplateScreenProps) => {
	useInput((_, key) => {
		if (key.escape) onBack()
	})

	const items = BANKING_TEMPLATES.map((t) => ({
		label: `${t.name} - ${t.description}`,
		value: t.id,
	}))

	return (
		<Box flexDirection="column">
			<Text color="yellow" bold>Select Event Template</Text>
			<Text color="whiteBright">Choose a predefined template for banking events</Text>
			<Text> </Text>
			<SelectInput
				items={items}
				onSelect={(item) => {
					const template = BANKING_TEMPLATES.find((t) => t.id === item.value)
					if (template) onSelect(template)
				}}
			/>
			{selectedTemplate && (
				<Box marginTop={1} flexDirection="column">
					<Text color="cyan">Selected: {selectedTemplate.name}</Text>
					<Text color="blueBright">Topic: {selectedTemplate.topic}</Text>
				</Box>
			)}
		</Box>
	)
}