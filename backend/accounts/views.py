from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from .permissions import IsSuperAdmin
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password
from django.db.models import Q
from .models import User
from .serializers import (
    UserSerializer, 
    UserRegistrationSerializer, 
    LoginSerializer,
    UserListSerializer
)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """API root endpoint"""
    return Response({
        'message': 'IoT Energy Monitoring System API',
        'version': '1.0.0',
        'modules': [
            'Module 1: Authentication & Role-Permission Matrix',
            'Module 2: Dynamic Parameter Mapping & Device Registry'
        ],
        'endpoints': {
            'root': '/api/',
            'admin': '/admin/',
            'authentication': {
                'login': '/api/auth/login/',
                'register': '/api/auth/register/',
                'refresh': '/api/auth/token/refresh/',
                'users': '/api/auth/users/',
            },
            'devices': {
                'list': '/api/devices/',
                'detail': '/api/devices/{id}/',
                'create_data': '/api/device-data/',
                'list_data': '/api/device-data/list/',
            },
            'parameter_mappings': {
                'list': '/api/parameter-mappings/',
                'detail': '/api/parameter-mappings/{id}/',
            }
        },
        'registration_permissions': {
            'super_admin': 'Can register Super Admin, Admin, and User',
            'admin': 'Can register User only',
            'user': 'Cannot register anyone'
        },
        'device_permissions': {
            'super_admin': 'Full access to all devices',
            'admin': 'Can create, update, and view all devices',
            'user': 'Can only view assigned devices'
        },
        'parameter_mapping_permissions': {
            'super_admin': 'Full access to configure parameter mappings',
            'admin': 'Can view parameter mappings',
            'user': 'Can view parameter mappings'
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Function-based login endpoint.
    This avoids any issues with GenericAPIView routing and makes the
    /api/auth/login/ endpoint respond reliably for POST requests.
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email_or_mobile = serializer.validated_data['email_or_mobile']
    password = serializer.validated_data['password']

    # Try to find user by email, mobile, or username
    user = None
    for field in ['email', 'mobile', 'username']:
        try:
            user = User.objects.get(**{field: email_or_mobile})
            break
        except User.DoesNotExist:
            continue

    if user is None or not user.check_password(password):
        return Response(
            {'error': 'Invalid email/mobile or password'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {'error': 'User account is disabled'},
            status=status.HTTP_403_FORBIDDEN,
        )

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
        },
        status=status.HTTP_200_OK,
    )


class LoginView(generics.GenericAPIView):
    """User login endpoint"""
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email_or_mobile = serializer.validated_data['email_or_mobile']
        password = serializer.validated_data['password']
        
        # Try to find user by email or mobile
        try:
            user = User.objects.get(email=email_or_mobile)
        except User.DoesNotExist:
            try:
                user = User.objects.get(mobile=email_or_mobile)
            except User.DoesNotExist:
                try:
                    user = User.objects.get(username=email_or_mobile)
                except User.DoesNotExist:
                    return Response(
                        {'error': 'Invalid email/mobile or password'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
        
        # Authenticate user
        if not user.check_password(password):
            return Response(
                {'error': 'Invalid email/mobile or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': 'User account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_200_OK)


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint - Super Admin only
    Only Super Admin can register new users (Admin or User roles)
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        # Super Admin can register Admin or User; Admin can register User only
        if not request.user.has_role('super_admin', 'admin'):
            return Response(
                {
                    'error': 'Permission denied',
                    'message': 'Only Super Admin or Admin can register new users.'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        requested_role = request.data.get('role', 'user')
        if request.user.has_role('admin') and requested_role != 'user':
            return Response(
                {
                    'error': 'Permission denied',
                    'message': 'Admin can only create User accounts. Contact Super Admin to create Admin accounts.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Prevent Super Admin from creating another Super Admin via API
        # Super Admins should be created using createsuperuser command
        requested_role = serializer.validated_data.get('role', 'user')
        if requested_role == 'super_admin':
            return Response(
                {
                    'error': 'Invalid role',
                    'message': 'Super Admin users cannot be created via API. Use Django createsuperuser command instead.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if email already exists (only when email provided)
        email = serializer.validated_data.get('email')
        if email and User.objects.filter(email=email).exists():
            return Response(
                {'error': 'User with this email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if username already exists
        if User.objects.filter(username=serializer.validated_data['username']).exists():
            return Response(
                {'error': 'Username already taken'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Enforce tenant / white-label inheritance rules
        requested_role = serializer.validated_data.get('role', 'user')
        white_label_id = serializer.validated_data.get('white_label_id') if isinstance(serializer.validated_data, dict) else None

        # Admin can only create Users under their own white-label (ignore any passed id)
        if request.user.has_role('admin'):
            white_label_id = None
        # Super Admin creating an Admin must choose a white-label
        if request.user.has_role('super_admin') and requested_role == 'admin' and not white_label_id:
            return Response(
                {
                    'error': 'white_label_required',
                    'message': 'Select a white-label configuration when creating an Admin.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = serializer.save()
        # Track who created this user so that Admins only see their own users
        if request.user.is_authenticated:
            user.created_by = request.user
            # If creator is Admin, inherit white-label from creator
            if request.user.has_role('admin'):
                user.white_label = request.user.white_label
                user.save(update_fields=['created_by', 'white_label'])
            else:
                user.save(update_fields=['created_by'])
        
        # Generate JWT tokens for the newly created user
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'note': 'New user can login with these credentials'
        }, status=status.HTTP_201_CREATED)


class UserListView(generics.ListAPIView):
    """List all users - Admin and Super Admin only"""
    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Super Admin sees all users
        if user.has_role('super_admin'):
            return User.objects.all()
        # Admin sees only:
        #  - themselves
        #  - users they created (typically role='user')
        if user.has_role('admin'):
            return User.objects.filter(
                Q(id=user.id) | Q(created_by=user)
            ).exclude(role='super_admin')
        # Regular users can only see themselves
        return User.objects.filter(id=user.id)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """User detail, update, delete - Role-based permissions"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Override permissions based on HTTP method"""
        # For APIView-based views, check request method instead of action
        if self.request.method == 'DELETE':
            # Only Super Admin can delete users
            return [IsSuperAdmin()]
        return [IsAuthenticated()]
    
    def get_object(self):
        user = self.request.user
        pk = self.kwargs.get('pk')
        target_user = get_object_or_404(User, pk=pk)

        # Super Admin can access any user
        if user.has_role('super_admin'):
            return target_user

        # Admin can access:
        #  - themselves
        #  - users they created
        if user.has_role('admin'):
            if target_user.has_role('super_admin'):
                self.permission_denied(self.request)
            if target_user.id != user.id and target_user.created_by_id != user.id:
                self.permission_denied(self.request)
            return target_user

        # Regular users can only access themselves
        if user.id != target_user.id:
            self.permission_denied(self.request)
        return target_user
    
    def update(self, request, *args, **kwargs):
        """Override update with role-based permissions"""
        user = request.user
        target_user = self.get_object()
        
        # Role change permissions
        if 'role' in request.data:
            new_role = request.data['role']
            
            # Only Super Admin can change roles
            if not user.has_role('super_admin'):
                return Response(
                    {
                        'error': 'Permission denied',
                        'message': 'Only Super Admin can change user roles'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Super Admin can change any role
            # No restrictions on role changes for Super Admin
        
        return super().update(request, *args, **kwargs)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Get/Update current authenticated user"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        """Prevent users from changing their own role"""
        user = request.user
        
        # Only Super Admin can change their own role
        if 'role' in request.data and not user.has_role('super_admin'):
            return Response(
                {
                    'error': 'Permission denied',
                    'message': 'You cannot change your own role. Contact Super Admin.'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
