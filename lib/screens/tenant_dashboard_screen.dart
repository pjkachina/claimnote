import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../main.dart';
import 'claim_submission_screen.dart';

class TenantDashboardScreen extends ConsumerStatefulWidget {
  const TenantDashboardScreen({super.key});

  @override
  ConsumerState<TenantDashboardScreen> createState() => _TenantDashboardScreenState();
}

class _TenantDashboardScreenState extends ConsumerState<TenantDashboardScreen> {
  List<Map<String, dynamic>> _units = [];
  List<Claim> _claims = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final user = supabase.auth.currentUser;
      if (user == null) return;

      // 自分の部屋を取得
      final unitsResponse = await supabase
          .from('tenant_assignments')
          .select('''
            unit_id,
            units!inner(
              id,
              unit_number,
              properties!inner(
                id,
                name
              )
            )
          ''')
          .eq('tenant_id', user.id)
          .eq('is_active', true);

      // クレームを取得
      final unitIds = (unitsResponse as List)
          .map((u) => u['units']['id'] as String)
          .toList();

      List<Claim> claims = [];
      if (unitIds.isNotEmpty) {
        final claimsResponse = await supabase
            .from('claims')
            .select()
            .inFilter('unit_id', unitIds)
            .order('created_at', ascending: false);

        claims = (claimsResponse as List)
            .map((json) => Claim.fromJson(json))
            .toList();
      }

      setState(() {
        _units = unitsResponse as List<Map<String, dynamic>>;
        _claims = claims;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('データの読み込みに失敗しました: $e')),
      );
    }
  }

  String _getCategoryLabel(String category) {
    final labels = {
      'water': '水回り',
      'electric': '電気',
      'equipment': '設備',
      'noise': '騒音・トラブル',
      'other': 'その他',
    };
    return labels[category] ?? category;
  }

  String _getPriorityLabel(String priority) {
    final labels = {
      'urgent': '緊急',
      'high': '高',
      'normal': '通常',
      'low': '低',
    };
    return labels[priority] ?? priority;
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.red;
      case 'in_progress':
        return Colors.orange;
      case 'completed':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _getStatusLabel(String status) {
    final labels = {
      'pending': '未対応',
      'in_progress': '対応中',
      'completed': '完了',
    };
    return labels[status] ?? status;
  }

  @override
  Widget build(BuildContext context) {
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
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ユーザー名
                    authState.when(
                      data: (profile) => Text(
                        'こんにちは、${profile?.displayName ?? ''}さん',
                        style: const TextStyle(fontSize: 18),
                      ),
                      loading: () => const SizedBox.shrink(),
                      error: (_, __) => const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 24),
                    // 部屋情報
                    if (_units.isEmpty)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Text(
                            '部屋に紐付いていません。オーナーからの招待リンクで登録してください。',
                            textAlign: TextAlign.center,
                          ),
                        ),
                      )
                    else
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'お部屋',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          ..._units.map((unitData) {
                            final unit = unitData['units'];
                            final property = unit['properties'];
                            return Card(
                              child: ListTile(
                                title: Text(property['name']),
                                subtitle: Text(unit['unit_number']),
                                trailing: FilledButton(
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => ClaimSubmissionScreen(
                                          unit: Unit(
                                            id: unit['id'],
                                            propertyId: property['id'],
                                            unitNumber: unit['unit_number'],
                                            createdAt: DateTime.now(),
                                          ),
                                          property: Property(
                                            id: property['id'],
                                            ownerId: '',
                                            name: property['name'],
                                            createdAt: DateTime.now(),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                  child: const Text('クレーム投稿'),
                                ),
                              ),
                            );
                          }).toList(),
                        ],
                      ),
                    const SizedBox(height: 24),
                    // クレーム一覧
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'クレーム一覧',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        // ステータスカウント
                        Row(
                          children: [
                            _buildStatusBadge('未', Colors.red, 
                              _claims.where((c) => c.status == 'pending').length),
                            const SizedBox(width: 8),
                            _buildStatusBadge('対', Colors.orange,
                              _claims.where((c) => c.status == 'in_progress').length),
                            const SizedBox(width: 8),
                            _buildStatusBadge('完', Colors.green,
                              _claims.where((c) => c.status == 'completed').length),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_claims.isEmpty)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: Center(
                            child: Text(
                              'まだクレームはありません',
                              style: TextStyle(color: Colors.grey),
                            ),
                          ),
                        ),
                      )
                    else
                      ..._claims.map((claim) {
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        claim.title,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: _getStatusColor(claim.status)
                                            .withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        _getStatusLabel(claim.status),
                                        style: TextStyle(
                                          color: _getStatusColor(claim.status),
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '${_getCategoryLabel(claim.category)} · ${_getPriorityLabel(claim.priority)}',
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(claim.content),
                                const SizedBox(height: 8),
                                Text(
                                  '${claim.createdAt.month}/${claim.createdAt.day} ${claim.createdAt.hour}:${claim.createdAt.minute.toString().padLeft(2, '0')}',
                                  style: TextStyle(
                                    color: Colors.grey[500],
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildStatusBadge(String label, Color color, int count) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            count.toString(),
            style: TextStyle(
              color: color,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
