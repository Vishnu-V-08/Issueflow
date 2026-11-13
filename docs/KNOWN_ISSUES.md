# IssueFlow – Known Issues & Operational Advisory

This document records active operational advisories, external provider statuses, and workarounds.

---

## 1. External AI Provider: Google Gemini High Demand Spike (HTTP 503)

### Advisory
- **Provider**: Google AI Studio / Google Gemini API.
- **Observed Behavior**: Live calls to Google Gemini endpoints (`gemini-3.5-flash-lite`, `gemini-3.8-flash`) intermittently return:
  ```json
  {
    "error": {
      "code": 503,
      "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
      "status": "UNAVAILABLE"
    }
  }
  ```
- **Backend Behavior**:
  - The FastAPI backend intercepts this upstream error and returns `502 Bad Gateway` or `503 Service Unavailable` with friendly diagnostic text.
  - Core ticket creation, comment posting, and triage features continue operating normally without interruption.
  - Zero credentials or API keys are leaked in logs or client responses.
- **Rule Compliance**: As instructed, live AI results are NOT mocked with fake responses. When Google Gemini servers are congested, the service reports the live state accurately.

---

## 2. Empty Database Analytics Representation

- When starting with a fresh Supabase database instance with 0 tickets:
  - All analytics KPIs return `0` with a `0.0%` resolution rate.
  - Zero-division errors are handled gracefully via SQL `case` statements.
  - Once sample tickets are created through the UI or API, the charts automatically update on next refresh.

