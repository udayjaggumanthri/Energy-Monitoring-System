"""
Script to create test users for Module 1
Run: python manage.py shell < create_test_users.py
Or: python manage.py shell, then copy-paste this code
"""
from accounts.models import User

# Create Super Admin
super_admin, created = User.objects.get_or_create(
    username='superadmin',
    defaults={
        'email': 'superadmin@example.com',
        'role': 'super_admin',
        'is_staff': True,
        'is_superuser': True,
    }
)
if created:
    super_admin.set_password('password')
    super_admin.save()
    print(f"✅ Created Super Admin: {super_admin.username}")
else:
    print(f"ℹ️  Super Admin already exists: {super_admin.username}")

# Create Admin
admin_user, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@example.com',
        'role': 'admin',
        'is_staff': True,
    }
)
if created:
    admin_user.set_password('password')
    admin_user.save()
    print(f"✅ Created Admin: {admin_user.username}")
else:
    print(f"ℹ️  Admin already exists: {admin_user.username}")

# Create Regular User
regular_user, created = User.objects.get_or_create(
    username='user',
    defaults={
        'email': 'user@example.com',
        'role': 'user',
    }
)
if created:
    regular_user.set_password('password')
    regular_user.save()
    print(f"✅ Created User: {regular_user.username}")
else:
    print(f"ℹ️  User already exists: {regular_user.username}")

print("\n📋 Test Users Created:")
print("=" * 50)
for user in User.objects.all():
    print(f"Username: {user.username:15} | Email: {user.email:25} | Role: {user.role}")
