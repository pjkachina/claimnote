import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart';
import '../models/models.dart';

// 認証状態管理
final authProvider = StateNotifierProvider<AuthNotifier, AsyncValue<UserProfile?>>((ref) {
  return AuthNotifier();
});

class AuthNotifier extends StateNotifier<AsyncValue<UserProfile?>> {
  AuthNotifier() : super(const AsyncValue.loading()) {
    _init();
  }

  void _init() async {
    // 現在のセッション確認
    final session = supabase.auth.currentSession;
    if (session != null) {
      await _fetchProfile(session.user.id);
    } else {
      state = const AsyncValue.data(null);
    }
  }

  Future<void> _fetchProfile(String userId) async {
    try {
      final response = await supabase
          .from('profiles')
          .select()
          .eq('id', userId)
          .single();
      
      final profile = UserProfile.fromJson(response);
      state = AsyncValue.data(profile);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<void> signIn(String email, String password) async {
    try {
      state = const AsyncValue.loading();
      
      final response = await supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );
      
      if (response.user != null) {
        await _fetchProfile(response.user!.id);
      }
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
      rethrow;
    }
  }

  Future<void> signUp(String email, String password, String role, String displayName) async {
    try {
      state = const AsyncValue.loading();
      
      final response = await supabase.auth.signUp(
        email: email,
        password: password,
        data: {
          'role': role,
          'display_name': displayName,
        },
      );
      
      if (response.user != null) {
        await _fetchProfile(response.user!.id);
      }
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
      rethrow;
    }
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
    state = const AsyncValue.data(null);
  }
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _displayNameController = TextEditingController();
  bool _isSignUp = false;
  String _role = 'owner';
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _displayNameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (_isSignUp) {
        await ref.read(authProvider.notifier).signUp(
          _emailController.text.trim(),
          _passwordController.text,
          _role,
          _displayNameController.text.trim(),
        );
      } else {
        await ref.read(authProvider.notifier).signIn(
          _emailController.text.trim(),
          _passwordController.text,
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'ログインに失敗しました: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    // ログイン済みの場合はダッシュボードへ
    authState.whenData((profile) {
      if (profile != null) {
        if (profile.role == 'owner') {
          context.go('/owner-dashboard');
        } else {
          context.go('/tenant-dashboard');
        }
      }
    });

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 60),
                const Text(
                  'ClaimNote',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'テナントクレーム管理',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                if (_isSignUp) ...[
                  // ロール選択
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(
                        value: 'owner',
                        label: Text('物件オーナー'),
                      ),
                      ButtonSegment(
                        value: 'tenant',
                        label: Text('テナント'),
                      ),
                    ],
                    selected: {_role},
                    onSelectionChanged: (Set<String> newSelection) {
                      setState(() {
                        _role = newSelection.first;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  // 名前入力
                  TextField(
                    controller: _displayNameController,
                    decoration: const InputDecoration(
                      labelText: 'お名前',
                      hintText: '例：山田太郎',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                // メールアドレス
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'メールアドレス',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                // パスワード
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'パスワード',
                    border: OutlineInputBorder(),
                  ),
                ),
                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 24),
                // ログイン/登録ボタン
                FilledButton(
                  onPressed: _isLoading ? null : _submit,
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(_isSignUp ? '新規登録' : 'ログイン'),
                ),
                const SizedBox(height: 16),
                // 切り替えボタン
                TextButton(
                  onPressed: () {
                    setState(() {
                      _isSignUp = !_isSignUp;
                      _errorMessage = null;
                    });
                  },
                  child: Text(_isSignUp
                      ? 'すでにアカウントをお持ちですか？ログイン'
                      : 'アカウントをお持ちでないですか？新規登録'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
