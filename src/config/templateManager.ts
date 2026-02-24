import fs from "fs"
import path from "path"

export interface FileTemplate {
	name: string
	topic: string
	json: string
}

const TEMPLATES_DIR = path.join(process.env.HOME || "~", ".tkesim", "templates")

function ensureTemplatesDir(): void {
	if (!fs.existsSync(TEMPLATES_DIR)) {
		fs.mkdirSync(TEMPLATES_DIR, { recursive: true })
	}
}

export function getFileTemplates(): FileTemplate[] {
	ensureTemplatesDir()
	if (!fs.existsSync(TEMPLATES_DIR)) {
		return []
	}
	const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".json"))
	const templates: FileTemplate[] = []
	for (const file of files) {
		try {
			const content = fs.readFileSync(path.join(TEMPLATES_DIR, file), "utf-8")
			const data = JSON.parse(content)
			if (data.json && data.topic) {
				templates.push({
					name: file.replace(".json", ""),
					topic: data.topic,
					json: data.json,
				})
			}
		} catch {
			// Skip invalid files
		}
	}
	return templates
}

export function saveFileTemplate(name: string, topic: string, json: string): void {
	ensureTemplatesDir()
	const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, "_")
	const fileName = `${sanitizedName}.json`
	const data = { topic, json, savedAt: new Date().toISOString() }
	fs.writeFileSync(path.join(TEMPLATES_DIR, fileName), JSON.stringify(data, null, 2))
}

export function deleteFileTemplate(name: string): void {
	ensureTemplatesDir()
	const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, "_")
	const fileName = `${sanitizedName}.json`
	const filePath = path.join(TEMPLATES_DIR, fileName)
	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath)
	}
}

export function importFromFile(filePath: string): FileTemplate | null {
	try {
		const content = fs.readFileSync(filePath, "utf-8")
		const data = JSON.parse(content)
		const fileName = path.basename(filePath, ".json")
		if (data.json && data.topic) {
			return {
				name: fileName,
				topic: data.topic,
				json: data.json,
			}
		}
		return null
	} catch {
		return null
	}
}

export function exportToFile(name: string, topic: string, json: string, outputPath: string): boolean {
	try {
		const data = { topic, json, exportedAt: new Date().toISOString() }
		fs.writeFileSync(outputPath, JSON.stringify(data, null, 2))
		return true
	} catch {
		return false
	}
}