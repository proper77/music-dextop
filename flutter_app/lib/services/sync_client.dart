import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/sync_models.dart';

/// Shared sync client used by both Flutter Windows Desktop and Flutter Android.
/// Connects to the BitChord Sync Relay (`/api/sync/*`) using partitioned
/// per-device monthly manifests so Android and PC plays merge without double-counting.
class BitChordSyncClient {
  final String baseUrl;
  final String deviceId;

  BitChordSyncClient({
    required this.baseUrl,
    required this.deviceId,
  });

  Future<Map<String, dynamic>> fetchState() async {
    final resp = await http.get(Uri.parse('$baseUrl/api/sync/state'));
    if (resp.statusCode != 200) {
      throw Exception('Sync state fetch failed: ${resp.statusCode}');
    }
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> pushChanges({
    required List<String> likedTrackIds,
    required Map<String, int> lyricOffsetsMs,
    required Map<String, dynamic> settings,
  }) async {
    final resp = await http.post(
      Uri.parse('$baseUrl/api/sync/push'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'deviceId': deviceId,
        'likedTrackIds': likedTrackIds,
        'lyricOffsetsMs': lyricOffsetsMs,
        'settings': settings,
      }),
    );
    if (resp.statusCode != 200) {
      throw Exception('Sync push failed: ${resp.statusCode}');
    }
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }

  Future<void> recordPlay(TrackItem track) async {
    await http.post(
      Uri.parse('$baseUrl/api/sync/record-play'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'deviceId': deviceId,
        'track': track.toJson(),
      }),
    );
  }

  Future<List<TrackItem>> searchMusic(String query) async {
    final uri = Uri.parse('$baseUrl/api/music/search?q=${Uri.encodeQueryComponent(query)}');
    final resp = await http.get(uri);
    if (resp.statusCode != 200) return [];
    final data = jsonDecode(resp.body) as Map<String, dynamic>;
    final list = data['tracks'] as List? ?? [];
    return list.map((e) => TrackItem.fromJson(e as Map<String, dynamic>)).toList();
  }
}
