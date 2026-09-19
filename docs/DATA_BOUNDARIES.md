# Data boundaries and event history

By default, the demo service keeps the latest 100 guidance events in process memory: timestamp, observation category, confidence, severity and message text.

- Event history does not store raw video frames, audio, location, account identifiers or unique device identifiers.
- Restarting the service clears the history.
- Recording real-world scenarios is outside this demo's data flow and requires a separate consent, retention, access-control and deletion policy.
- Cloud model and speech integrations are outside the current demo. Their data flows require separate review. Service credentials belong in server-side environment variables.
