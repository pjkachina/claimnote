import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/models.dart';
import '../main.dart';

class PropertyManagementScreen extends ConsumerStatefulWidget {
  const PropertyManagementScreen({super.key});

  @override
  ConsumerState<PropertyManagementScreen> createState() => _PropertyManagementScreenState();
}

class _PropertyManagementScreenState extends ConsumerState<PropertyManagementScreen> {
  List<Property> _properties = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProperties();
  }

  Future<void> _loadProperties() async {
    try {
      final response = await supabase
          .from('properties')
          .select()
          .order('created_at', ascending: false);
      
      setState(() {
        _properties = (response as List)
            .map((json) => Property.fromJson(json))
            .toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('物件の読み込みに失敗しました: $e')),
      );
    }
  }

  Future<void> _addProperty() async {
    final nameController = TextEditingController();
    final addressController = TextEditingController();

    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('新規物件を追加'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: '物件名',
                hintText: '例：山田ビル',
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: addressController,
              decoration: const InputDecoration(
                labelText: '住所',
                hintText: '例：東京都新宿区...',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('キャンセル'),
          ),
          FilledButton(
            onPressed: () async {
              try {
                await supabase.from('properties').insert({
                  'name': nameController.text,
                  'address': addressController.text.isEmpty
                      ? null
                      : addressController.text,
                });
                Navigator.pop(context);
                _loadProperties();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('物件管理'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/owner-dashboard'),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadProperties,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: FilledButton.icon(
                      onPressed: _addProperty,
                      icon: const Icon(Icons.add),
                      label: const Text('物件を追加'),
                    ),
                  ),
                  Expanded(
                    child: _properties.isEmpty
                        ? const Center(child: Text('物件が登録されていません'))
                        : ListView.builder(
                            itemCount: _properties.length,
                            itemBuilder: (context, index) {
                              final property = _properties[index];
                              return Card(
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                child: ListTile(
                                  title: Text(property.name),
                                  subtitle: property.address != null
                                      ? Text(property.address!)
                                      : null,
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () {
                                    // 詳細画面へ（後で実装）
                                  },
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
