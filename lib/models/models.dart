class UserProfile {
  final String id;
  final String role;
  final String displayName;
  final DateTime createdAt;

  UserProfile({
    required this.id,
    required this.role,
    required this.displayName,
    required this.createdAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      role: json['role'] as String,
      displayName: json['display_name'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'role': role,
      'display_name': displayName,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class Property {
  final String id;
  final String ownerId;
  final String name;
  final String? address;
  final DateTime createdAt;

  Property({
    required this.id,
    required this.ownerId,
    required this.name,
    this.address,
    required this.createdAt,
  });

  factory Property.fromJson(Map<String, dynamic> json) {
    return Property(
      id: json['id'] as String,
      ownerId: json['owner_id'] as String,
      name: json['name'] as String,
      address: json['address'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'owner_id': ownerId,
      'name': name,
      'address': address,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class Unit {
  final String id;
  final String propertyId;
  final String unitNumber;
  final DateTime createdAt;

  Unit({
    required this.id,
    required this.propertyId,
    required this.unitNumber,
    required this.createdAt,
  });

  factory Unit.fromJson(Map<String, dynamic> json) {
    return Unit(
      id: json['id'] as String,
      propertyId: json['property_id'] as String,
      unitNumber: json['unit_number'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'property_id': propertyId,
      'unit_number': unitNumber,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class Claim {
  final String id;
  final String unitId;
  final String submittedBy;
  final String category;
  final String priority;
  final String title;
  final String content;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;

  Claim({
    required this.id,
    required this.unitId,
    required this.submittedBy,
    required this.category,
    required this.priority,
    required this.title,
    required this.content,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Claim.fromJson(Map<String, dynamic> json) {
    return Claim(
      id: json['id'] as String,
      unitId: json['unit_id'] as String,
      submittedBy: json['submitted_by'] as String,
      category: json['category'] as String,
      priority: json['priority'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'unit_id': unitId,
      'submitted_by': submittedBy,
      'category': category,
      'priority': priority,
      'title': title,
      'content': content,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

class Invitation {
  final String id;
  final String unitId;
  final String token;
  final DateTime expiresAt;

  Invitation({
    required this.id,
    required this.unitId,
    required this.token,
    required this.expiresAt,
  });

  factory Invitation.fromJson(Map<String, dynamic> json) {
    return Invitation(
      id: json['id'] as String,
      unitId: json['unit_id'] as String,
      token: json['token'] as String,
      expiresAt: DateTime.parse(json['expires_at'] as String),
    );
  }
}
