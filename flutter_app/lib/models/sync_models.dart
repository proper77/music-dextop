import 'dart:convert';
import 'package:crypto/crypto.dart';

class TrackItem {
  final String id;
  final String title;
  final String artist;
  final String album;
  final int durationSec;
  final String artworkUrl;
  final String? previewUrl;
  final String quality;

  const TrackItem({
    required this.id,
    required this.title,
    required this.artist,
    required this.album,
    required this.durationSec,
    required this.artworkUrl,
    this.previewUrl,
    this.quality = 'Hi-Res Lossless',
  });

  factory TrackItem.fromJson(Map<String, dynamic> json) => TrackItem(
        id: json['id'] as String,
        title: json['title'] as String,
        artist: json['artist'] as String,
        album: json['album'] as String? ?? 'Single',
        durationSec: (json['durationSec'] as num?)?.toInt() ?? 180,
        artworkUrl: json['artworkUrl'] as String? ?? '',
        previewUrl: json['previewUrl'] as String?,
        quality: json['quality'] as String? ?? 'Hi-Res Lossless',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'artist': artist,
        'album': album,
        'durationSec': durationSec,
        'artworkUrl': artworkUrl,
        'previewUrl': previewUrl,
        'quality': quality,
      };
}

class DeviceManifest {
  final String deviceId;
  final String deviceName;
  final String platform;
  final String appVersion;
  final int updatedAt;
  final Map<String, String> months;
  final int totalPlays;
  final int totalMinutes;

  const DeviceManifest({
    required this.deviceId,
    required this.deviceName,
    required this.platform,
    required this.appVersion,
    required this.updatedAt,
    required this.months,
    required this.totalPlays,
    required this.totalMinutes,
  });

  factory DeviceManifest.fromJson(Map<String, dynamic> json) => DeviceManifest(
        deviceId: json['deviceId'] as String,
        deviceName: json['deviceName'] as String,
        platform: json['platform'] as String,
        appVersion: json['appVersion'] as String? ?? '2.4.0',
        updatedAt: (json['updatedAt'] as num?)?.toInt() ?? 0,
        months: Map<String, String>.from(json['months'] as Map? ?? {}),
        totalPlays: (json['totalPlays'] as num?)?.toInt() ?? 0,
        totalMinutes: (json['totalMinutes'] as num?)?.toInt() ?? 0,
      );
}

class MonthlyChunk {
  final String deviceId;
  final String month;
  final String sha256Hash;
  final Map<String, int> playsByTrack;
  final Map<String, int> minutesByTrack;

  const MonthlyChunk({
    required this.deviceId,
    required this.month,
    required this.sha256Hash,
    required this.playsByTrack,
    required this.minutesByTrack,
  });

  factory MonthlyChunk.fromJson(Map<String, dynamic> json) => MonthlyChunk(
        deviceId: json['deviceId'] as String,
        month: json['month'] as String,
        sha256Hash: json['sha256'] as String? ?? '',
        playsByTrack: (json['playsByTrack'] as Map? ?? {})
            .map((k, v) => MapEntry(k.toString(), (v as num).toInt())),
        minutesByTrack: (json['minutesByTrack'] as Map? ?? {})
            .map((k, v) => MapEntry(k.toString(), (v as num).toInt())),
      );

  static String computeHash(Map<String, int> plays) {
    final encoded = utf8.encode(jsonEncode(plays));
    return sha256.convert(encoded).toString().substring(0, 16);
  }
}
