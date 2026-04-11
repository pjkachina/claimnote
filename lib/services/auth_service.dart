import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';
import '../main.dart';

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
