# TKESIM - TUI Kafka Event Simulator

TUI application for generating and sending Kafka events with synthetic data, designed for banking system testing.

## Features

- **Paste from Log** - Copy an event from log/production and send it to local Kafka:
  - Paste JSON directly
  - Choose which fields to regenerate (eventId, timestamp, correlationId, etc.)
  - Preview before sending
  - Useful for reproducing real scenarios in a test environment

- **Predefined templates** for common banking events:
  - SEPA Transfer
  - POS Payment
  - SDD Debit
  - Push notifications
  - KYC Check
  - Login/Auth

- **Custom JSON** with placeholders for dynamic data:
  - `{{uuid}}` - UUID v4
  - `{{iban}}` - Italian IBAN
  - `{{amount:min:max}}` - Random amount
  - `{{name}}` - Full name
  - `{{company}}` - Company name
  - `{{email}}` - Email
  - `{{date}}` - ISO date
  - `{{enum:A,B,C}}` - Random value from list

- **Flexible configuration**:
  - Number of events to generate
  - Delay between sends
  - Preview before sending

- **Real-time log** of sent events

## Requirements

- Node.js >= 18
- Accessible Kafka broker

## Installation

```bash
cd tkesim
npm install
```

## Running

```bash
npm start
```

## Usage

### Template/Custom Mode
1. **Configure Kafka**: Enter broker, client ID, and SASL credentials (optional)
2. **Select Template** or **Create Custom JSON**
3. **Configure Generation**: Number of events and delay
4. **Preview**: View generated event preview
5. **Send**: Publish to Kafka with progress bar

### Paste from Log Mode
1. **Configure Kafka** and connect
2. **Paste from Log**: Copy a JSON event from log/monitoring
3. **Topic**: Specify the local destination topic
4. **Regenerate fields**: Select which fields to regenerate (eventId, timestamp, etc.)
5. **Preview/Send**: Verify and send

Auto-regenerable fields:
- `eventId` → new UUID
- `timestamp` → current date/time
- `correlationId` → new UUID
- `requestId` → new UUID
- `traceId` → new UUID
- `sessionId` → new UUID

## Controls

| Key | Action |
|-----|--------|
| ↑ ↓ | Navigate menu/fields |
| Tab | Next field |
| Enter | Confirm/Select |
| Esc | Go back |
| ← → | Navigate preview |
| Ctrl+C | Exit |

## Included Banking Templates

### SEPA Transfer
```json
{
  "eventId": "uuid",
  "eventType": "SEPA_CREDIT_TRANSFER",
  "sourceIban": "IT...",
  "destinationIban": "IT...",
  "amount": 150.00,
  "currency": "EUR",
  "status": "PENDING|PROCESSING|COMPLETED|FAILED"
}
```

### POS Payment
```json
{
  "eventId": "uuid",
  "eventType": "CARD_TRANSACTION",
  "cardHash": "CARD_xxx",
  "merchantId": "MERCH_xxx",
  "amount": 45.90,
  "mcc": "5411",
  "status": "AUTHORIZED|DECLINED|PENDING"
}
```

## Custom JSON Example

```json
{
  "transactionId": "{{uuid}}",
  "accountIban": "{{iban}}",
  "amount": "{{amount:100:5000}}",
  "type": "{{enum:CREDIT,DEBIT}}",
  "description": "{{sentence}}",
  "timestamp": "{{date}}"
}
```

## License

MIT
