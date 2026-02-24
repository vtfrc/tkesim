import fs from "fs"
import path from "path"
import type { KafkaConfig } from "../types"

const CONFIG_DIR = path.join(process.env.HOME || "~", ".tkesim")
const CONFIG_FILE = path.join(CONFIG_DIR, "configs.json")

export interface SavedConfig {
	name: string
	createdAt: string
	kafkaConfig: KafkaConfig
}

export interface CustomTemplate {
	id: string
	name: string
	json: string
	topic: string
	createdAt: string
}

interface SavedData {
	version: number
	configs: SavedConfig[]
	templates: CustomTemplate[]
}

const DEFAULT_DATA: SavedData = {
	version: 1,
	configs: [],
	templates: [],
}

function ensureConfigDir(): void {
	if (!fs.existsSync(CONFIG_DIR)) {
		fs.mkdirSync(CONFIG_DIR, { recursive: true })
	}
}

function readData(): SavedData {
	ensureConfigDir()
	if (!fs.existsSync(CONFIG_FILE)) {
		return DEFAULT_DATA
	}
	try {
		const content = fs.readFileSync(CONFIG_FILE, "utf-8")
		return JSON.parse(content)
	} catch {
		return DEFAULT_DATA
	}
}

function writeData(data: SavedData): void {
	ensureConfigDir()
	fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2))
}

export function getSavedConfigs(): SavedConfig[] {
	const data = readData()
	return data.configs
}

export function saveConfig(name: string, config: KafkaConfig): void {
	const data = readData()
	data.configs = data.configs.filter((c) => c.name !== name)
	data.configs.unshift({
		name,
		createdAt: new Date().toISOString(),
		kafkaConfig: config,
	})
	writeData(data)
}

export function deleteConfig(name: string): void {
	const data = readData()
	data.configs = data.configs.filter((c) => c.name !== name)
	writeData(data)
}

export function getSavedTemplates(): CustomTemplate[] {
	const data = readData()
	return data.templates
}

export function saveTemplate(id: string, name: string, json: string, topic: string): void {
	const data = readData()
	data.templates = data.templates.filter((t) => t.id !== id)
	data.templates.unshift({
		id,
		name,
		json,
		topic,
		createdAt: new Date().toISOString(),
	})
	writeData(data)
}

export function deleteTemplate(id: string): void {
	const data = readData()
	data.templates = data.templates.filter((t) => t.id !== id)
	writeData(data)
}

export function getConfigPath(): string {
	return CONFIG_FILE
}