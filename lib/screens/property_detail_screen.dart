import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/models.dart';
import '../main.dart';

class PropertyDetailScreen extends StatefulWidget {
  final Property property;

  const PropertyDetailScreen({super.key, required this.property});

  @override
  State<PropertyDetailScreen> createState() => _PropertyDetailScreenState();
}

class _PropertyDetailScreenState extends State<PropertyDetailScreen> {
  List<Unit> _units = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadUnits();
  }

  Future<void> _loadUnits() async {
    try {
      final response = await supabase
          .from('units')
          .select()
          .eq('property_id', widget.property.id)
          .order('unit_number');

      setState(() {
        _units = (response as List).map((json) => Unit.fromJson(json)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('部屋の読み込みに失敗しました: $e')),
      );
    }
  }

  Future<void> _addUnit() async {
    final unitNumberController = TextEditingController();

    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('新規部屋を追加'),
        content: TextField(
          controller: unitNumberController,
          decoration: const InputDecoration(
            labelText: '部屋番号',
            hintText: '例：101号室',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('キャンセル'),
          ),
          FilledButton(
            onPressed: () async {
              if (unitNumberController.text.isEmpty) return;

              try {
                final user = supabase.auth.currentUser;
                if (user == null) return;

                await supabase.from('units').insert({
                  'property_id': widget.property.id,
                  'unit_number': unitNumberController.text,
                  'owner_id': user.id,
                });

                // 即座にUIに反映（楽観的更新）
                setState(() {
                  _units.add(Unit(
                    id: DateTime.now().toString(), // 仮ID
                    propertyId: widget.property.id,
                    unitNumber: unitNumberController.text,
                    createdAt: DateTime.now(),
                  ));
                });

                Navigator.pop(context);
                _loadUnits(); // 最新データを再取得
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('追加に失敗しました: $e')),
                );
              }
            },
            child: const Text('追加'),
          ),
        ],
      ),
    );
  }

  Future<void> _generateInvitation(Unit unit) async {
    try {
      final user = supabase.auth.currentUser;
      if (user == null) return;

      final response = await supabase
          .from('invitations')
          .insert({
            'unit_id': unit.id,
            'created_by': user.id,
          })
          .select('token')
          .single();

      final token = response['token'] as String;
      final inviteUrl = 'https://claimnote-x4ix.vercel.app/invite/$token';

      // クリップボードにコピー
      await Clipboard.setData(ClipboardData(text: inviteUrl));

      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('招待リンクをコピーしました'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('テナントにこのURLを共有してください：'),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: SelectableText(
                    inviteUrl,
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
            actions: [
              FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('招待リンクの発行に失敗しました: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.property.name),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadUnits,
              child: Column(
                children: [
                  // 物件情報カード
                  Card(
                    margin: const EdgeInsets.all(16),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.property.name,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (widget.property.address != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              widget.property.address!,
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                          const SizedBox(height: 12),
                          Text('部屋数: ${_units.length}'),
                        ],
                      ),
                    ),
                  ),
                  // 部屋追加ボタン
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: FilledButton.icon(
                      onPressed: _addUnit,
                      icon: const Icon(Icons.add),
                      label: const Text('部屋を追加'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // 部屋一覧
                  Expanded(
                    child: _units.isEmpty
                        ? const Center(child: Text('部屋が登録されていません'))
                        : ListView.builder(
                            itemCount: _units.length,
                            itemBuilder: (context, index) {
                              final unit = _units[index];
                              return Card(
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                child: ListTile(
                                  title: Text(
                                    unit.unitNumber,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  subtitle: const Text('テナント未登録'),
                                  trailing: FilledButton.tonal(
                                    onPressed: () => _generateInvitation(unit),
                                    child: const Text('招待リンク'),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}
