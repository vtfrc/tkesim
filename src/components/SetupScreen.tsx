import React, { useState, useEffect } from "react"
import { Box, Text } from "ink"
import SelectInput from "ink-select-input"
import Spinner from "ink-spinner"
import {
	checkKafkaStatus,
	startLocalKafka,
	stopLocalKafka,
	type KafkaStatus,
} from "../utils/localKafka"

interface SetupScreenProps {
	onBack: () => void
	onKafkaReady: () => void
}

export const SetupScreen = ({ onBack, onKafkaReady }: SetupScreenProps) => {
	const [status, setStatus] = useState<KafkaStatus | null>(null)
	const [isStarting, setIsStarting] = useState(false)
	const [isStopping, setIsStopping] = useState(false)
	const [startProgress, setStartProgress] = useState<string>("")
	const [message, setMessage] = useState("Checking Kafka status...")

	useEffect(() => {
		const timeout = setTimeout(() => {
			setMessage("Status check timed out. Press Esc to go back.")
		}, 10000)

		checkKafkaStatus("localhost:9092")
			.then((result) => {
				clearTimeout(timeout)
				setStatus(result)
				setMessage(result.message)
			})
			.catch(() => {
				clearTimeout(timeout)
				setStatus({
					running: false,
					dockerAvailable: true,
					containerRunning: false,
					portOpen: false,
					message: "Error checking Kafka status",
				})
			})

		return () => clearTimeout(timeout)
	}, [])

	const handleSelect = async (item: { value: string }) => {
		if (item.value === "start") {
			setIsStarting(true)
			setStartProgress("Starting Kafka container...")
			setMessage("Starting...")

			const result = await startLocalKafka()
			setIsStarting(false)

			if (result.waitingSeconds) {
				setStartProgress(`Waited ${result.waitingSeconds}s for port to open`)
			}

			const newStatus = await checkKafkaStatus("localhost:9092")
			setStatus(newStatus)
			setMessage(result.message)
		} else if (item.value === "stop") {
			setIsStopping(true)
			setMessage("Stopping Kafka...")
			const result = await stopLocalKafka()
			setIsStopping(false)
			const newStatus = await checkKafkaStatus("localhost:9092")
			setStatus(newStatus)
			setMessage(result.message)
		} else if (item.value === "connect") {
			onKafkaReady()
		} else if (item.value === "back") {
			onBack()
		}
	}

	const getItems = () => {
		if (!status) return [{ label: "Loading...", value: "loading" }]

		if (status.portOpen) {
			return [
				{ label: "Connect to Local Kafka", value: "connect" },
				{ label: "Stop Local Kafka", value: "stop" },
				{ label: "← Back", value: "back" },
			]
		}
		if (status.dockerAvailable) {
			return [
				{ label: "Start Local Kafka", value: "start" },
				{ label: "← Back", value: "back" },
			]
		}
		return [{ label: "← Back", value: "back" }]
	}

	const items = getItems()

	return (
		<Box flexDirection="column">
			<Text color="yellow" bold>Local Kafka Setup</Text>
			<Text color="whiteBright">Manage local Kafka instance for testing</Text>
			<Text> </Text>

			{status && (
				<Box flexDirection="column" marginBottom={1}>
					<Text color={status.dockerAvailable ? "green" : "red"}>
						Docker: {status.dockerAvailable ? "✓ Available" : "✕ Not found"}
					</Text>
					<Text color={status.containerRunning ? "green" : status.portOpen ? "yellow" : "gray"}>
						Kafka: {status.containerRunning ? "✓ Running" : "○ Not running"}
					</Text>
					<Text color={status.portOpen ? "green" : "gray"}>
						Port 9092: {status.portOpen ? "✓ Open" : "○ Closed"}
					</Text>
				</Box>
			)}

			<Box flexDirection="column" marginBottom={1} borderStyle="round" borderColor="gray" padding={1}>
				<Text color="whiteBright">Status: </Text>
				<Text>{message}</Text>
				{isStarting && (
					<Text color="yellow">
						<Spinner type="dots" /> {startProgress || "Starting..."}
					</Text>
				)}
				{isStopping && (
					<Text color="yellow">
						<Spinner type="dots" /> Stopping...
					</Text>
				)}
			</Box>

			<Text color="whiteBright">Options:</Text>
			<SelectInput items={items} onSelect={handleSelect} />

			<Box marginTop={1}>
				<Text color="gray">↑↓: Navigate | Enter: Select | Esc: Back</Text>
			</Box>
		</Box>
	)
}