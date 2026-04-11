import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/models.dart';
import '../main.dart';

class ClaimSubmissionScreen extends StatefulWidget {
  final Unit unit;
  final Property property;

  const ClaimSubmissionScreen({
    super.key,
    required this.unit,
    required this.property,
  });

  @override
  State<ClaimSubmissionScreen> createState() => _ClaimSubmissionScreenState();
}

class _ClaimSubmissionScreenState extends State<ClaimSubmissionScreen> {
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  String _category = 'water';
  String _priority = 'normal';
  File? _selectedImage;
  bool _isSubmitting = false;

  final List<Map<String, String>> _categories = [
    {'value': 'water', 'label': '水回り'},
    {'value': 'electric', 'label': '電気'},
    {'value': 'equipment', 'label': '設備'},
    {'value': 'noise', 'label': '騒音・トラブル'},
    {'value': 'other', 'label': 'その他'},
  ];

  final List<Map<String, String>> _priorities = [
    {'value': 'urgent', 'label': '緊急（当日対応）'},
    {'value': 'high', 'label': '高（1-2日以内）'},
    {'value': 'normal', 'label': '通常（1週間以内）'},
    {'value': 'low', 'label': '低（次回点検時）'},
  ];

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1200,
      maxHeight: 1200,
      imageQuality: 85,
    );

    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
      });
    }
  }

  Future<void> _submitClaim() async {
    if (_titleController.text.isEmpty || _contentController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('件名と内容を入力してください')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final user = supabase.auth.currentUser;
      if (user == null) {
        throw Exception('ログインが必要です');
      }

      // クレームを投稿
      final claimResponse = await supabase.from('claims').insert({
        'unit_id': widget.unit.id,
        'submitted_by': user.id,
        'category': _category,
        'priority': _priority,
        'title': _titleController.text,
        'content': _contentController.text,
        'status': 'pending',
      }).select().single();

      // 画像がある場合はアップロード
      if (_selectedImage != null) {
        final claimId = claimResponse['id'] as String;
        final fileExt = _selectedImage!.path.split('.').last;
        final fileName = '${claimId}_${_selectedImage!.path.hashCode}.$fileExt';
        
        await supabase.storage.from('claim-images').upload(
          fileName,
          _selectedImage!,
          fileOptions: const FileOptions(contentType: 'image/jpeg'),
        );

        // 画像URLをクレームに保存
        final imageUrl = supabase.storage.from('claim-images').getPublicUrl(fileName);
        await supabase.from('claims').update({
          'image_url': imageUrl,
        }).eq('id', claimId);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('クレームを投稿しました')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('投稿に失敗しました: $e')),
      );
    } finally {
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('クレームを投稿'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 部屋情報
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.property.name,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(widget.unit.unitNumber),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // カテゴリ
            DropdownButtonFormField<String>(
              value: _category,
              decoration: const InputDecoration(
                labelText: 'カテゴリ',
                border: OutlineInputBorder(),
              ),
              items: _categories.map((cat) {
                return DropdownMenuItem(
                  value: cat['value'],
                  child: Text(cat['label']!),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _category = value!;
                });
              },
            ),
            const SizedBox(height: 16),
            // 優先度
            DropdownButtonFormField<String>(
              value: _priority,
              decoration: const InputDecoration(
                labelText: '優先度',
                border: OutlineInputBorder(),
              ),
              items: _priorities.map((pri) {
                return DropdownMenuItem(
                  value: pri['value'],
                  child: Text(pri['label']!),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _priority = value!;
                });
              },
            ),
            const SizedBox(height: 16),
            // 件名
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: '件名',
                hintText: '例：エアコンが故障しました',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            // 内容
            TextField(
              controller: _contentController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: '内容',
                hintText: '詳細な症状を入力してください',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            // 写真添付
            if (_selectedImage != null) ...[
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(
                      _selectedImage!,
                      height: 200,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: IconButton(
                      onPressed: () {
                        setState(() {
                          _selectedImage = null;
                        });
                      },
                      icon: const Icon(Icons.close, color: Colors.white),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.black54,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            FilledButton.icon(
              onPressed: _pickImage,
              icon: const Icon(Icons.camera_alt),
              label: Text(_selectedImage == null ? '写真を撮影' : '写真を変更'),
            ),
            const SizedBox(height: 24),
            // 投稿ボタン
            FilledButton(
              onPressed: _isSubmitting ? null : _submitClaim,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('投稿'),
            ),
          ],
        ),
      ),
    );
  }
}
