# AGENTS.md - TKESIM Development Guide

This file provides guidelines for AI agents working on the TKESIM codebase.

## Build, Lint, and Test Commands

### Core Commands
```bash
npm start              # Run the application with tsx
npm run dev            # Run with hot-reload (watch mode)
npm run build          # Build for production using tsup
npm test               # Run all tests with vitest
npm test -- --run      # Run tests once (no watch)
npm test <file>        # Run specific test file
```

### Building
- `npm run build` compiles `src/index.tsx` to `dist/index.js` using tsup
- Output format: ESM only
- Binary entry point: `./dist/index.js`

### Testing
- Framework: Vitest
- Test files: `*.test.ts` or `*.test.tsx` alongside source files
- Run single test: `npm test -- src/utils/generator.test.ts`
- Run single test case: Use `.only` modifier in test file temporarily

### Development Tools
- TypeScript strict mode enabled
- No ESLint/Prettier config present - maintain existing style manually

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2022
- Module: ESNext with bundler resolution
- Strict mode: enabled (no `any` implicit, strict null checks)
- JSX: react-jsx

### File Naming Conventions
- Components: PascalCase (e.g., `ConfigScreen`, `TemplateScreen`)
- Utilities: kebab-case (e.g., `kafka.ts`, `generator.ts`)
- Tests: `*.test.ts` suffix (e.g., `kafka.test.ts`)
- Single letter abbreviations avoided in filenames

### Import Style
```typescript
// React and ink imports (default order)
import React, { useState, useCallback, useEffect } from "react"
import { render, Box, Text, useInput, useApp } from "ink"

// Third-party modules
import TextInput from "ink-text-input"
import SelectInput from "ink-select-input"
import Spinner from "ink-spinner"

// Local imports - relative paths with type imports grouped
import {
  type KafkaConfig,
  type EventTemplate,
  type GenerationConfig,
  type SentEvent,
  BANKING_TEMPLATES,
  DEFAULT_KAFKA_CONFIG,
} from "./types"
import { connectKafka, sendEvents } from "./utils/kafka"
```

### Component Structure
- Use functional components with typed props
- Props interface defined inline or in same file
- Use `useCallback` for event handlers passed to child components
- Use `useState` for component-local state
- Avoid unnecessary `useEffect` - prefer direct state updates

### Naming Conventions
- Variables/functions: camelCase (`kafkaConfig`, `generateEvents`)
- Constants: SCREAMING_SNAKE_CASE for config defaults
- Interfaces: PascalCase (`KafkaConfig`, `EventTemplate`)
- Type aliases: PascalCase (`SentEvent`)
- Boolean props: prefixed with `is`, `has`, `should` (`isConnected`, `hasError`)

### Type Definitions
```typescript
// Interface for data structures
export interface KafkaConfig {
  brokers: string
  clientId: string
  ssl: boolean
  saslUsername: string
  saslPassword: string
}

// Use explicit types, avoid 'any'
// Union types for finite sets
type Step = "menu" | "config" | "template" | "custom" | "paste" | "generate" | "preview" | "sending" | "log"
```

### Error Handling
- Functions that can fail return result objects with `status: "sent" | "error"` and optional `error` field
- Error messages: descriptive, user-facing in TUI
- Async operations: try/catch with meaningful error context
- Kafka errors: captured and displayed in UI, not thrown

### Test Patterns
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// Use descriptive test names
// Group related tests with describe blocks
// Mock external dependencies with vi.mock
// Use beforeEach for reset/cleanup
```

### Additional Guidelines
- No comments unless explaining non-obvious logic (per project style)
- Console.error for unexpected errors only
- Prefer early returns over nested conditionals
- Keep components under ~100 lines when possible - extract sub-components
- Use Ink's `<Box>`, `<Text>` for all UI rendering
- Handle escape key in screens for navigation back

## Project Architecture

```
src/
├── index.tsx           # Main app entry, renders App component
├── types.ts            # All TypeScript interfaces
├── templates.ts        # BANKING_TEMPLATES constant
├── config/
│   ├── configManager.ts # Config persistence (save/load configs)
│   └── templateManager.ts # Template file I/O
├── components/
│   ├── index.ts        # Component exports
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── MainMenu.tsx
│   ├── ConfigScreen.tsx
│   ├── ConfigManagerScreen.tsx
│   ├── TemplateScreen.tsx
│   ├── CustomJsonScreen.tsx
│   ├── FileTemplateScreen.tsx
│   ├── SetupScreen.tsx
│   ├── PasteScreen.tsx
│   ├── GenerateScreen.tsx
│   ├── PreviewScreen.tsx
│   ├── SendingScreen.tsx
│   └── LogScreen.tsx
└── utils/
    ├── generator.ts    # Event generation with faker
    ├── generator.test.ts
    ├── kafka.ts        # Kafka connection and publishing
    ├── kafka.test.ts
    ├── logParser.ts    # Parse log/JSON formats
    ├── logParser.test.ts
    └── localKafka.ts   # Local Kafka setup/check utility
```

## Common Tasks

### Adding a New Event Template
1. Define schema in `src/types.ts` under `BANKING_TEMPLATES`
2. Template includes: id, name, description, topic, schema object
3. Schema fields: type, optional generator, min/max, enumValues

### Adding a New Placeholder
1. Add case in `generatePlaceholderValue()` in `src/utils/generator.ts`
2. Add test case in `generateFromCustomJson` describe block
3. Document in README.md

### Modifying Kafka Connection
1. Update `connectKafka()` in `src/utils/kafka.ts`
2. Update corresponding tests in `kafka.test.ts`
3. Test against real Kafka broker

### Local Kafka Setup
1. A docker-compose.yml is included for local development
2. Run `docker compose up -d` to start Kafka locally on port 9092
3. The SetupScreen in the UI can start/stop local Kafka
4. Uses Confluent Kafka 7.6.0 image in KRaft mode (no Zookeeper)