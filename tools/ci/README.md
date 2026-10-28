# CI workflows for the Unity port

The session's GitHub token cannot create workflow files, so these live here until the owner copies them into
`.github/workflows/` (same as the Pages workflow earlier):

- `android.yml` — builds the Android APK from `unity/` with game-ci on every push to `main` (needs the
  `UNITY_LICENSE`, `UNITY_EMAIL`, `UNITY_PASSWORD` secrets; see `docs/PORT.md` §3).
- `core.yml` — compiles the pure-C# core and runs its tests with the .NET SDK (no Unity needed).
