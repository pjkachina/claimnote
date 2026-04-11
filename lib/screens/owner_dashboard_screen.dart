import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';

class OwnerDashboardScreen extends ConsumerWidget {
  const OwnerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('ClaimNote'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).signOut();
              context.go('/');
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ユーザー名表示
            authState.when(
              data: (profile) => Text(
                'こんにちは、${profile?.displayName ?? ''}さん',
                style: const TextStyle(fontSize: 18),
              ),
              loading: () => const CircularProgressIndicator(),
              error: (_, __) => const Text('エラー'),
            ),
            const SizedBox(height: 24),
            // ステータスカード
            Row(
              children: [
                _buildStatusCard('未対応', '0', Colors.red),
                const SizedBox(width: 12),
                _buildStatusCard('対応中', '0', Colors.orange),
                const SizedBox(width: 12),
                _buildStatusCard('完了', '0', Colors.green),
              ],
            ),
            const SizedBox(height: 24),
            // ナビゲーションボタン
            FilledButton.icon(
              onPressed: () => context.go('/property-management'),
              icon: const Icon(Icons.apartment),
              label: const Text('物件管理'),
            ),
            const SizedBox(height: 12),
            // クレーム一覧（仮）
            const Text(
              'クレーム一覧',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: Card(
                child: Center(
                  child: Text(
                    'クレームがありません',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard(String title, String count, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              Text(
                count,
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Text(title),
            ],
          ),
        ),
      ),
    );
  }
}

class TenantDashboardScreen extends ConsumerWidget {
  const TenantDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ClaimNote'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).signOut();
              context.go('/');
            },
          ),
        ],
      ),
      body: const Center(
        child: Text('テナント画面（準備中）'),
      ),
    );
  }
}
