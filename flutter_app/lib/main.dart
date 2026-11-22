import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'services/sync_client.dart';
import 'ui/desktop_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final isDesktop = !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux);
  final deviceId = isDesktop ? 'dev-win-flutter-01' : 'dev-android-pixel9';

  final syncClient = BitChordSyncClient(
    baseUrl: const String.fromEnvironment(
      'BITCHORD_SYNC_URL',
      defaultValue: 'http://localhost:3000',
    ),
    deviceId: deviceId,
  );

  runApp(BitChordUnifiedApp(
    syncClient: syncClient,
    isDesktop: isDesktop,
  ));
}

class BitChordUnifiedApp extends StatelessWidget {
  final BitChordSyncClient syncClient;
  final bool isDesktop;

  const BitChordUnifiedApp({
    super.key,
    required this.syncClient,
    required this.isDesktop,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BitChord Unified',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF090A0F),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFA586A),
          surface: Color(0xFF11131B),
        ),
      ),
      home: DesktopShell(
        syncClient: syncClient,
        isDesktop: isDesktop,
      ),
    );
  }
}
