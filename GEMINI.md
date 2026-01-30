# TKESIM - TUI Kafka Event Simulator

## Project Overview

**TKESIM** (TUI Kafka Event Simulator) is a terminal-based user interface (TUI) application designed for generating and simulating Kafka events. It is particularly tailored for testing banking systems but supports custom event generation for any domain.

The tool provides an interactive CLI built with React (Ink) that allows developers and testers to:
*   **Generate Synthetic Data:** Use predefined templates for banking events (e.g., SEPA transfers, POS transactions) or create custom JSON schemas with dynamic placeholders.
*   **Replay Logs:** Paste existing event logs (JSON or Kafka log format), selectively regenerate fields (like IDs or timestamps), and resend them to a local or test topic.
*   **Manage Kafka Connections:** Configure connections to Kafka brokers, including support for SASL authentication.

## Technology Stack

*   **Runtime:** Node.js
*   **Language:** TypeScript
*   **UI Framework:** [Ink](https://github.com/vadimdemedes/ink) (React for CLI)
*   **Kafka Client:** [kafkajs](https://kafka.js.org/)
*   **Data Generation:** [@faker-js/faker](https://fakerjs.dev/)

## Architecture & Key Files

The project follows a standard TypeScript structure:

*   **`src/index.tsx`**: The main entry point. It contains the React components for the TUI screens (Menu, Config, Template Selection, Custom JSON, etc.) and manages the application state.
*   **`src/utils/generator.ts`**: Core logic for generating synthetic data. It handles the parsing of templates and the replacement of placeholders (e.g., `{{uuid}}`, `{{iban}}`) using Faker.js.
*   **`src/utils/kafka.ts`**: Handles the connection to the Kafka broker and the production of messages.
*   **`src/utils/logParser.ts`**: Utilities for parsing pasted log strings into usable JSON objects, handling headers and different log formats.
*   **`src/types.ts`**: TypeScript definitions for application state, templates, and configuration objects.

## Building and Running

### Prerequisites
*   Node.js (>= 18)
*   Access to a Kafka broker

### Installation
```bash
npm install
```

### Running the Application
To start the TUI for development:
```bash
npm start
```

### Installation (Global)
You can install the tool globally on your system using the included installer script:
```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/tkesim/main/scripts/install.sh | bash
```
*(Replace `YOUR_USERNAME` with your actual GitHub username after pushing).*

### Distribution & Build
The project uses `tsup` for fast bundling. To create a production build manually:
```bash
npm run build
```
The executable will be located at `dist/index.js`.

## Usage Guide

The application navigates through several screens:

1.  **Configuration:** Set up the Kafka broker address, Client ID, and optional SASL credentials.
2.  **Mode Selection:**
    *   **Template:** Choose from built-in banking event templates.
    *   **Custom JSON:** Enter a JSON structure with placeholders like `{{uuid}}`, `{{amount:min:max}}`, `{{enum:A,B}}`.
    *   **Paste from Log:** Paste a raw log string. The tool attempts to parse it and allows you to toggle which fields to regenerate (e.g., keeping the payload but generating a new `traceId`).
3.  **Generation:** Configure the number of events and the delay between them.
4.  **Preview & Send:** Review the generated data before sending it to the specified Kafka topic.

## Development Conventions

*   **Styling:** The UI is styled using Ink's `Box` and `Text` components.
*   **State Management:** Local React state (`useState`, `useCallback`) is used within `src/index.tsx`.
*   **Placeholders:** New dynamic placeholders should be added to the `processPlaceholders` function in `src/utils/generator.ts`.
