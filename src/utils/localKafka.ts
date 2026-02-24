import { exec } from "child_process"
import { promisify } from "util"
import * as net from "net"
import { Kafka } from "kafkajs"

const execAsync = promisify(exec)

export interface KafkaStatus {
	running: boolean
	dockerAvailable: boolean
	containerRunning: boolean
	portOpen: boolean
	message: string
}

function checkPort(host: string, port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = new net.Socket()
		const timeout = setTimeout(() => {
			socket.destroy()
			resolve(false)
		}, 3000)

		socket.on("connect", () => {
			clearTimeout(timeout)
			socket.destroy()
			resolve(true)
		})

		socket.on("error", () => {
			clearTimeout(timeout)
			socket.destroy()
			resolve(false)
		})

		socket.connect(port, host)
	})
}

export async function checkKafkaStatus(brokers: string): Promise<KafkaStatus> {
	const portStr = brokers.split(",")[0].trim().split(":")[1] || "9092"
	const port = parseInt(portStr, 10)

	try {
		await execAsync("docker --version")
	} catch {
		return {
			running: false,
			dockerAvailable: false,
			containerRunning: false,
			portOpen: false,
			message: "Docker not found. Install Docker or connect to existing Kafka broker.",
		}
	}

	let kafkaRunning = false
	let zookeeperRunning = false
	try {
		const { stdout } = await execAsync("docker ps --format '{{.Names}}' 2>/dev/null || true")
		const containers = stdout.trim().split("\n").filter(Boolean)
		kafkaRunning = containers.some((c: string) => c.includes("tkesim-kafka"))
		zookeeperRunning = containers.some((c: string) => c.includes("tkesim-zookeeper"))
	} catch {
		// Ignore
	}

	if (kafkaRunning && zookeeperRunning) {
		return {
			running: true,
			dockerAvailable: true,
			containerRunning: true,
			portOpen: true,
			message: "Local Kafka container is running",
		}
	}

	const portOpen = await checkPort("localhost", port)

	if (portOpen) {
		return {
			running: true,
			dockerAvailable: true,
			containerRunning: kafkaRunning,
			portOpen: true,
			message: "Kafka is accessible at configured broker",
		}
	}

	return {
		running: false,
		dockerAvailable: true,
		containerRunning: false,
		portOpen: false,
		message: "Kafka not running. Use 'Start Local Kafka' to begin.",
	}
}

export async function startLocalKafka(): Promise<{ success: boolean; message: string; waitingSeconds?: number }> {
	try {
		const hasCompose = await execAsync("docker compose version >/dev/null 2>&1 && echo 'yes' || echo 'no'")
			.then((r) => r.stdout.trim() === "yes")
			.catch(() => false)

		const composeCmd = hasCompose ? "docker compose" : "docker-compose"

		const { stderr: upStderr } = await execAsync(`${composeCmd} up -d 2>&1`, { timeout: 120000 })

		if (upStderr.includes("Error") || upStderr.includes("error")) {
			return { success: false, message: `Failed to start: ${upStderr.substring(0, 200)}` }
		}

		let attempts = 0
		const maxAttempts = 60

		while (attempts < maxAttempts) {
			const portOpen = await checkPort("localhost", 9092)
			if (portOpen) {
				return { success: true, message: "Kafka started successfully", waitingSeconds: attempts * 3 }
			}
			await new Promise((r) => setTimeout(r, 3000))
			attempts++
		}

		return { success: false, message: "Kafka containers started but port 9092 not responding after 3 minutes" }
	} catch (error) {
		return {
			success: false,
			message: `Failed to start Kafka: ${error instanceof Error ? error.message : String(error)}`,
		}
	}
}

export async function stopLocalKafka(): Promise<{ success: boolean; message: string }> {
	try {
		const hasCompose = await execAsync("docker compose version >/dev/null 2>&1 && echo 'yes' || echo 'no'")
			.then((r) => r.stdout.trim() === "yes")
			.catch(() => false)

		const composeCmd = hasCompose ? "docker compose" : "docker-compose"

		const { stderr } = await execAsync(`${composeCmd} down 2>&1`, { timeout: 30000 })
		return { success: true, message: "Kafka stopped" }
	} catch (error) {
		return {
			success: false,
			message: `Failed to stop Kafka: ${error instanceof Error ? error.message : "Unknown error"}`,
		}
	}
}

export async function testKafkaConnection(
	brokers: string,
	clientId: string
): Promise<{ success: boolean; message: string }> {
	try {
		const kafka = new Kafka({
			clientId,
			brokers: brokers.split(",").map((b) => b.trim()),
			retry: { initialRetryTime: 100, retries: 3 },
		})
		const admin = kafka.admin()
		await admin.connect()
		await admin.listTopics()
		await admin.disconnect()
		return { success: true, message: "Connection successful" }
	} catch (error) {
		return {
			success: false,
			message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		}
	}
}