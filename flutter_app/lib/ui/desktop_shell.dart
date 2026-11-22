import 'package:flutter/material.dart';
import '../models/sync_models.dart';
import '../services/sync_client.dart';

class DesktopShell extends StatefulWidget {
  final BitChordSyncClient syncClient;
  final bool isDesktop;

  const DesktopShell({
    super.key,
    required this.syncClient,
    required this.isDesktop,
  });

  @override
  State<DesktopShell> createState() => _DesktopShellState();
}

class _DesktopShellState extends State<DesktopShell> {
  int _selectedIndex = 0;
  List<DeviceManifest> _devices = [];
  List<TrackItem> _tracks = [];
  TrackItem? _currentTrack;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadInitial();
  }

  Future<void> _loadInitial() async {
    try {
      final stateResp = await widget.syncClient.fetchState();
      final state = stateResp['state'] as Map<String, dynamic>;
      final devicesJson = state['devices'] as List? ?? [];
      final tracksMap = state['tracksById'] as Map<String, dynamic>? ?? {};

      setState(() {
        _devices = devicesJson
            .map((e) => DeviceManifest.fromJson(e as Map<String, dynamic>))
            .toList();
        _tracks = tracksMap.values
            .map((e) => TrackItem.fromJson(e as Map<String, dynamic>))
            .toList();
        _currentTrack = _tracks.isNotEmpty ? _tracks.first : null;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final destinations = const [
      NavigationRailDestination(icon: Icon(Icons.home_outlined), label: Text('Home')),
      NavigationRailDestination(icon: Icon(Icons.search), label: Text('Search')),
      NavigationRailDestination(icon: Icon(Icons.library_music_outlined), label: Text('Library')),
      NavigationRailDestination(icon: Icon(Icons.bar_chart_rounded), label: Text('Replay')),
      NavigationRailDestination(icon: Icon(Icons.sync), label: Text('Sync')),
    ];

    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: Row(
              children: [
                if (widget.isDesktop || MediaQuery.of(context).size.width >= 760)
                  NavigationRail(
                    backgroundColor: const Color(0xFF0E1017),
                    selectedIndex: _selectedIndex,
                    onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
                    labelType: NavigationRailLabelType.all,
                    destinations: destinations,
                  ),
                Expanded(
                  child: _loading
                      ? const Center(child: CircularProgressIndicator())
                      : _selectedIndex == 4
                          ? _buildSyncView()
                          : _buildCatalogView(),
                ),
              ],
            ),
          ),
          if (_currentTrack != null) _buildPlayerBar(_currentTrack!),
        ],
      ),
      bottomNavigationBar: (!widget.isDesktop && MediaQuery.of(context).size.width < 760)
          ? NavigationBar(
              selectedIndex: _selectedIndex,
              onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
              destinations: const [
                NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
                NavigationDestination(icon: Icon(Icons.search), label: 'Search'),
                NavigationDestination(icon: Icon(Icons.library_music_outlined), label: 'Library'),
                NavigationDestination(icon: Icon(Icons.bar_chart_rounded), label: 'Replay'),
                NavigationDestination(icon: Icon(Icons.sync), label: 'Sync'),
              ],
            )
          : null,
    );
  }

  Widget _buildCatalogView() {
    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: _tracks.length,
      itemBuilder: (context, index) {
        final track = _tracks[index];
        return ListTile(
          title: Text(track.title),
          subtitle: Text('${track.artist} · ${track.album} · ${track.quality}'),
          trailing: IconButton(
            icon: const Icon(Icons.play_arrow_rounded),
            onPressed: () {
              setState(() => _currentTrack = track);
              widget.syncClient.recordPlay(track);
            },
          ),
        );
      },
    );
  }

  Widget _buildSyncView() {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const Text(
          'Cross-Platform Devices',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 16),
        ..._devices.map(
          (d) => Card(
            color: const Color(0xFF141722),
            child: ListTile(
              title: Text(d.deviceName),
              subtitle: Text('${d.platform} · ${d.totalPlays} plays · ${d.totalMinutes} min'),
              trailing: Text('v${d.appVersion}'),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPlayerBar(TrackItem track) {
    return Container(
      height: 76,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: const BoxDecoration(
        color: Color(0xFF11131B),
        border: Border(top: BorderSide(color: Color(0x14FFFFFF))),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(track.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(
                  '${track.artist} · ${track.quality}',
                  style: const TextStyle(fontSize: 12, color: Colors.white60),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.play_circle_filled_rounded, size: 36),
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}
