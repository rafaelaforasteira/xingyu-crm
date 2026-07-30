# Automation engine

## Model

- `Automation` — name, triggerType, status, config
- `AutomationNode` — trigger | condition | action | wait | branch | end
- `AutomationEdge` — source → target with optional condition
- `AutomationExecution` + `AutomationExecutionLog`

## Initial triggers

Contact/deal created, stage changed, task overdue/completed, order created, payment approved, order delivered, message received, unanswered customer, days without purchase, tag added, field changed.

## Guardrails (v1)

- Max executions per automation per hour (config)
- Loop prevention via execution depth
- Inactive automations never run
- Errors stored on execution + notification type `AUTOMATION_ERROR`

## Demo

Seed includes 4 sample automations. “Test” endpoint runs a dry execution with mock context and writes logs.
