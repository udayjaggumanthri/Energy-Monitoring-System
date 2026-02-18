from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    assigned_device_ids = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'mobile', 'role', 'role_display',
            'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser',
            'created_at', 'updated_at', 'assigned_device_ids', 'password'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_superuser']

    def get_assigned_device_ids(self, obj):
        return [d.id for d in obj.assigned_devices.all()]
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


def _validate_username(value):
    """Username: 3–150 chars, alphanumeric, underscore, no spaces."""
    if not value or len(value.strip()) < 3:
        raise serializers.ValidationError('Username must be at least 3 characters.')
    if len(value) > 150:
        raise serializers.ValidationError('Username must be 150 characters or fewer.')
    if not all(c.isalnum() or c == '_' for c in value):
        raise serializers.ValidationError('Username can only contain letters, numbers, and underscores.')
    return value.strip()


def _validate_mobile(value):
    """Mobile: digits, spaces, hyphens, plus; 8–15 chars."""
    if not value:
        return None
    cleaned = ''.join(c for c in value if c.isdigit() or c == '+')
    if len(cleaned) < 8 or len(cleaned) > 15:
        raise serializers.ValidationError('Enter a valid mobile number (8–15 digits).')
    return value.strip()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration. Either email or mobile is required."""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'mobile', 'password', 'password_confirm', 'role', 'first_name', 'last_name']
        extra_kwargs = {
            'password': {'write_only': True},
            'role': {'default': 'user'},
            'email': {'required': False, 'allow_blank': True},
            'mobile': {'required': False, 'allow_blank': True},
            'first_name': {'allow_blank': True, 'max_length': 150},
            'last_name': {'allow_blank': True, 'max_length': 150},
        }

    def validate_username(self, value):
        return _validate_username(value)

    def validate_email(self, value):
        if not value or not value.strip():
            return None
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_email(value.strip())
        except DjangoValidationError:
            raise serializers.ValidationError('Enter a valid email address.')
        return value.strip()

    def validate_mobile(self, value):
        if not value or not value.strip():
            return None
        return _validate_mobile(value)

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Password and confirmation do not match."})
        email = (attrs.get('email') or '').strip()
        mobile = (attrs.get('mobile') or '').strip()
        if not email and not mobile:
            raise serializers.ValidationError(
                {"email": "Either email or mobile number is required so you can sign in later."}
            )
        if email:
            attrs['email'] = email
        else:
            attrs['email'] = None
        if mobile:
            attrs['mobile'] = mobile
        else:
            attrs['mobile'] = None
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email_or_mobile = serializers.CharField(required=True, allow_blank=False)
    password = serializers.CharField(required=True, write_only=True)

    def validate_email_or_mobile(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('Enter your email or mobile number.')
        return str(value).strip()

    def validate_password(self, value):
        if not value:
            raise serializers.ValidationError('Enter your password.')
        return value


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for user listing"""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    assigned_device_ids = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'mobile', 'role', 'role_display',
                  'first_name', 'last_name', 'is_active', 'created_at', 'assigned_device_ids']
        read_only_fields = fields

    def get_assigned_device_ids(self, obj):
        return [d.id for d in obj.assigned_devices.all()]
