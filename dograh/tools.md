# Dograh HTTP API tools

Create one **HTTP API** tool per row in Dograh (Tools → Add tool → HTTP API) and attach them to your
agent's conversation node. Same tools and rules as the Vapi assistant.

For every tool:
- **Method**: `POST`
- **URL**: `https://YOUR-APP/api/dograh/tools/<name>` (the name below)
- **Authentication**: Bearer token = the value of `DOGRAH_WEBHOOK_SECRET`
- **Preset parameter**: `workflow_run_id` · number · value `{{initial_context.workflow_run_id}}` · required
- **Preset parameter** (outbound): `direction` · string · value `{{initial_context.direction}}`
- **Preset parameter** (outbound): `phone` · string · value `{{initial_context.phone_number}}`
- **Messages**: leave empty (the tools answer in well under a second), or one short "start" text like "One moment."

The agent receives the JSON answer as `data` and speaks from it.

## `search_knowledge`

**Description**: Search the uploaded documents (FAQs, PDFs, policies, product and technical guides). Call it for EVERY question before answering, then answer in one or two sentences from the passages.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `question` | string | yes | The caller's question in a few words |

## `save_contact_details`

**Description**: Save details the caller shared about themselves.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | no |  |
| `email` | string | no |  |
| `company` | string | no |  |
| `city` | string | no |  |
| `notes` | string | no | Anything useful for the team, in one or two sentences |

## `book_appointment`

**Description**: Book an appointment once the caller agreed a date and time. Read back the 'when' value returned.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `date` | string | yes | YYYY-MM-DD |
| `time` | string | yes | HH:MM, 24-hour, business time zone |
| `notes` | string | no |  |

## `schedule_callback`

**Description**: The caller wants to be called back later. The system calls them again at that time.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `date` | string | yes | YYYY-MM-DD |
| `time` | string | no | HH:MM, 24-hour (optional) |

## `create_follow_up`

**Description**: Create a task for the team: a question you could not answer, a request for a human, or anything that needs action.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `reason` | string | yes | Short title |
| `details` | string | no | The exact question or request |

## `mark_do_not_call`

**Description**: The caller asked never to be called again.

No parameters (only the presets).

## `record_outcome`

**Description**: Record how the conversation ended when no other tool did.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `outcome` | string | yes | One of: INTERESTED, NOT_INTERESTED, COMPLETED |
