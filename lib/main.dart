import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:go_router/go_router.dart';
import 'screens/login_screen.dart';
import 'screens/owner_dashboard_screen.dart';
import 'screens/tenant_dashboard_screen.dart';
import 'screens/property_management_screen.dart';
import 'screens/property_detail_screen.dart';
import 'models/models.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Supabase初期化
  await Supabase.initialize(
    url: 'https://alggpdroctlrxnszbjfe.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZ2dwZHJvY3Rscnhuc3piamZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTMxMTYsImV4cCI6MjA5MDc4OTExNn0.O9LvXgxfqoEHDyoDDvDRl8vzM_1-slqgLJbxlJjAcp4',
  );
  
  runApp(
    const ProviderScope(
      child: ClaimNoteApp(),
    ),
  );
}

class ClaimNoteApp extends StatelessWidget {
  const ClaimNoteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'ClaimNote',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        fontFamily: 'Hiragino Sans',
      ),
      routerConfig: _router,
    );
  }
}

// ルーティング設定
final _router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/owner-dashboard',
      builder: (context, state) => const OwnerDashboardScreen(),
    ),
    GoRoute(
      path: '/tenant-dashboard',
      builder: (context, state) => const TenantDashboardScreen(),
    ),
    GoRoute(
      path: '/property-management',
      builder: (context, state) => const PropertyManagementScreen(),
    ),
    GoRoute(
      path: '/property-detail',
      builder: (context, state) {
        final property = state.extra as Property;
        return PropertyDetailScreen(property: property);
      },
    ),
  ],
);

// Supabaseクライアント取得用
final supabase = Supabase.instance.client;
