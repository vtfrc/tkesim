# TKESIM - TUI Kafka Event Simulator

Applicazione TUI per generare e inviare eventi Kafka con dati sintetici, pensata per testing di sistemi bancari.

## Funzionalità

- **Incolla da Log** - Copia un evento da log/produzione e invialo su Kafka locale:
  - Incolla JSON direttamente
  - Scegli quali campi rigenerare (eventId, timestamp, correlationId, ecc.)
  - Preview prima dell'invio
  - Utile per riprodurre scenari reali in ambiente di test

- **Template predefiniti** per eventi bancari comuni:
  - Bonifico SEPA
  - Pagamento POS
  - Addebito SDD
  - Notifiche push
  - KYC Check
  - Login/Auth

- **JSON Custom** con placeholder per dati dinamici:
  - `{{uuid}}` - UUID v4
  - `{{iban}}` - IBAN italiano
  - `{{amount:min:max}}` - Importo casuale
  - `{{name}}` - Nome completo
  - `{{company}}` - Nome azienda
  - `{{email}}` - Email
  - `{{date}}` - Data ISO
  - `{{enum:A,B,C}}` - Valore casuale da lista

- **Configurazione flessibile**:
  - Numero eventi da generare
  - Delay tra invii
  - Preview prima dell'invio

- **Log real-time** degli eventi inviati

## Requisiti

- Node.js >= 18
- Kafka broker accessibile

## Installazione

```bash
cd tkesim
npm install
```

## Avvio

```bash
npm start
```

## Utilizzo

### Modalità Template/Custom
1. **Configura Kafka**: Inserisci broker, client ID e credenziali SASL (opzionali)
2. **Seleziona Template** o **Crea JSON Custom**
3. **Configura Generazione**: Numero eventi e delay
4. **Preview**: Visualizza anteprima eventi generati
5. **Invia**: Pubblica su Kafka con progress bar

### Modalità Incolla da Log
1. **Configura Kafka** e connettiti
2. **Incolla da Log**: Copia un evento JSON da log/monitoring
3. **Topic**: Specifica il topic locale di destinazione
4. **Rigenera campi**: Seleziona quali campi rigenerare (eventId, timestamp, ecc.)
5. **Preview/Invia**: Verifica e invia

Campi rigenerabili automaticamente:
- `eventId` → nuovo UUID
- `timestamp` → data/ora corrente
- `correlationId` → nuovo UUID
- `requestId` → nuovo UUID
- `traceId` → nuovo UUID
- `sessionId` → nuovo UUID

## Controlli

| Tasto | Azione |
|-------|--------|
| ↑ ↓ | Naviga menu/campi |
| Tab | Campo successivo |
| Invio | Conferma/Seleziona |
| Esc | Torna indietro |
| ← → | Naviga preview |
| Ctrl+C | Esci |

## Template Bancari Inclusi

### Bonifico SEPA
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

### Pagamento POS
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

## Esempio JSON Custom

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

## Licenza

MIT
