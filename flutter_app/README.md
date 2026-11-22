# BitChord Unified — Flutter Desktop (Windows) & Android Shared Codebase

This directory provides the shared Flutter Dart codebase targeting **Windows Desktop (`flutter build windows`)** and **Android (`flutter build apk`)** from one repository, synchronized with the BitChord Sync Relay (`server.ts`).

## Shared Modules
- `lib/models/sync_models.dart`: Partitioned `DeviceManifest`, `MonthlyChunk` (SHA-256 verification matching `ReplaySync.kt`), and `TrackItem` models.
- `lib/services/sync_client.dart`: Unified HTTP client talking to `/api/sync/state`, `/api/sync/push`, `/api/sync/record-play`, and `/api/music/search`.
- `lib/ui/desktop_shell.dart`: Adaptive desktop `NavigationRail` + bottom `NavigationBar` mobile layout.

## Build on Windows / Android
```bash
flutter pub get
flutter create --platforms=windows,android .
flutter run -d windows --dart-define=BITCHORD_SYNC_URL=http://localhost:3000
flutter build windows --release
flutter build apk --release
```
