## AI Analysis Approach

### Prompt Design
- Input transcript is rendered as one line per segment in the format: `[mm:ss] Speaker: text`.
- The prompt explicitly lists all allowed timestamps, and mandates that every generated item cites one or more timestamps from that list.
- The model is instructed to omit anything not directly supported by transcript content.

### Output Shape
The API requests a single JSON object with:
- `summary` (string)
- `decisions` (array of `{ text, citations }`)
- `followUps` (array of `{ text, citations }`)
- `actionItems` (array of `{ task, assignee, dueDate?, citations }`)

### Citation Strategy
- Citations are timestamp strings, e.g. `"12:34"` or `"1:02:10"` (matching the transcript input).
- Citations are required for every decision, follow-up, and action item.

### Hallucination Prevention
- `temperature: 0` is used to reduce creative variance.
- Strict “transcript-only” rules are included in the system and user prompts.
- The service validates AI output:
  - JSON parse must succeed.
  - Output must match the expected schema.
  - Every citation timestamp must exist in the stored transcript.
- If any validation fails, the API returns a `502` with `AI_OUTPUT_INVALID`.

### Output Validation
Validation is implemented in `analysis.service.js`:
- Zod schema validation for structure and required fields.
- Citation timestamp whitelist validation against transcript segments.

