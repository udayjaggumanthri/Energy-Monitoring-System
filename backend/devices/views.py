from rest_framework import generics, status, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Device, ParameterMapping
from .serializers import (
    DeviceSerializer, DeviceListSerializer, ParameterMappingSerializer,
    MQTTTestSerializer, MQTTDeviceRegistrationSerializer, MQTTConfigSerializer
)
from .services import test_mqtt_connection
from core.pagination import DeviceListPagination


class DeviceListView(generics.ListCreateAPIView):
    """
    List all devices or create a new device
    - Admin and Super Admin can create devices
    - Users see only their assigned devices
    """
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DeviceListPagination

    def get_queryset(self):
        user = self.request.user
        
        # Super Admin and Admin see all devices
        if user.has_role('super_admin', 'admin'):
            queryset = Device.objects.all()
        else:
            # Regular users see only their assigned devices
            queryset = Device.objects.filter(assigned_users=user)
        
        # Filter by area, building, floor if provided
        area = self.request.query_params.get('area', None)
        building = self.request.query_params.get('building', None)
        floor = self.request.query_params.get('floor', None)
        is_active = self.request.query_params.get('is_active', None)
        
        if area:
            queryset = queryset.filter(area=area)
        if building:
            queryset = queryset.filter(building=building)
        if floor:
            queryset = queryset.filter(floor=floor)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.select_related().prefetch_related('assigned_users')
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return DeviceListSerializer
        return DeviceSerializer
    
    def create(self, request, *args, **kwargs):
        # Only Admin and Super Admin can create devices
        if not request.user.has_role('super_admin', 'admin'):
            return Response(
                {
                    'error': 'Permission denied',
                    'message': 'Only Admin and Super Admin can register devices'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if hardware address already exists
        hardware_address = serializer.validated_data['hardware_address']
        if Device.objects.filter(hardware_address=hardware_address).exists():
            return Response(
                {
                    'error': 'Device already exists',
                    'message': f'Device with hardware address {hardware_address} is already registered'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        device = serializer.save()
        
        return Response(
            {
                'message': 'Device registered successfully',
                'device': DeviceSerializer(device).data
            },
            status=status.HTTP_201_CREATED
        )


class DeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a device
    - Super Admin: Full access
    - Admin: Can update/delete (except Super Admin assigned devices)
    - User: Read-only access to assigned devices
    """
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_object(self):
        device = get_object_or_404(Device, id=self.kwargs['id'])
        user = self.request.user
        
        # Super Admin can access any device
        if user.has_role('super_admin'):
            return device
        
        # Admin can access any device
        if user.has_role('admin'):
            return device
        
        # Regular users can only access their assigned devices
        if device.assigned_users.filter(id=user.id).exists():
            return device
        
        self.permission_denied(
            self.request,
            message='You do not have access to this device'
        )
    
    def update(self, request, *args, **kwargs):
        device = self.get_object()
        user = request.user
        
        # Only Admin and Super Admin can update devices
        if not user.has_role('super_admin', 'admin'):
            return Response(
                {
                    'error': 'Permission denied',
                    'message': 'Only Admin and Super Admin can update devices'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            serializer = self.get_serializer(device, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            updated_device = serializer.save()
            
            # After successful update, trigger MQTT re-subscription via signal
            # The signal handler will automatically re-subscribe if MQTT config changed
            return Response(
                {
                    'message': 'Device updated successfully',
                    'device': DeviceSerializer(updated_device).data
                },
                status=status.HTTP_200_OK
            )
        except serializers.ValidationError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Validation error updating device {device.id}: {e.detail if hasattr(e, "detail") else e}')
            return Response(
                {
                    'error': 'Validation error',
                    'message': 'Please check the form fields',
                    'details': e.detail if hasattr(e, 'detail') else str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Error updating device {device.id}: {e}', exc_info=True)
            return Response(
                {
                    'error': 'Update failed',
                    'message': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        device = self.get_object()
        user = request.user
        
        # Only Super Admin can delete devices
        if not user.has_role('super_admin'):
            return Response(
                {
                    'error': 'Permission denied',
                    'message': 'Only Super Admin can delete devices'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)


class ParameterMappingListView(generics.ListCreateAPIView):
    """
    List all parameter mappings or create a new mapping
    - Super Admin only
    """
    queryset = ParameterMapping.objects.all()
    serializer_class = ParameterMappingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Only Super Admin can access parameter mappings"""
        if self.request.method == 'GET':
            # All authenticated users can view mappings
            return [IsAuthenticated()]
        # Only Super Admin can create/update/delete
        return [IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        # Only Super Admin can create parameter mappings
        if not request.user.has_role('super_admin'):
            return Response(
                {
                    'error': 'Permission denied',
                    'message': 'Only Super Admin can configure parameter mappings'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if hardware_key already exists
        hardware_key = serializer.validated_data['hardware_key']
        if ParameterMapping.objects.filter(hardware_key=hardware_key).exists():
            return Response(
                {
                    'error': 'Mapping already exists',
                    'message': f'Parameter mapping for "{hardware_key}" already exists'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        mapping = serializer.save()
        
        return Response(
            {
                'message': 'Parameter mapping created successfully',
                'mapping': ParameterMappingSerializer(mapping).data
            },
            status=status.HTTP_201_CREATED
        )


class ParameterMappingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a parameter mapping
    - Super Admin only
    """
    queryset = ParameterMapping.objects.all()
    serializer_class = ParameterMappingSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_permissions(self):
        """Only Super Admin can modify parameter mappings"""
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        # Only Super Admin can update/delete
        return [IsAuthenticated()]
    
    def update(self, request, *args, **kwargs):
        if not request.user.has_role('super_admin'):
            return Response(
                {
                    'error': 'Permission denied',
                    'message': 'Only Super Admin can update parameter mappings'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        if not request.user.has_role('super_admin'):
            return Response(
                {
                    'error': 'Permission denied',
                    'message': 'Only Super Admin can delete parameter mappings'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class MQTTTestView(APIView):
    """
    Test MQTT connection and capture sample messages.
    Admin and Super Admin only.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Only Admin and Super Admin can test MQTT connections
        if not request.user.has_role('super_admin', 'admin'):
            return Response(
                {
                    'error': 'Permission denied',
                    'message': 'Only Admin and Super Admin can test MQTT connections'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = MQTTTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract validated data
        validated_data = serializer.validated_data
        
        # Call MQTT testing service
        result = test_mqtt_connection(
            broker_host=validated_data['mqtt_broker_host'],
            broker_port=validated_data['mqtt_broker_port'],
            topic_prefix=validated_data['mqtt_topic_prefix'],
            username=validated_data.get('mqtt_username'),
            password=validated_data.get('mqtt_password'),
            use_tls=validated_data.get('mqtt_use_tls', False),
            tls_ca_certs=validated_data.get('mqtt_tls_ca_certs'),
            timeout_seconds=validated_data.get('timeout_seconds', 15)
        )
        
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class MQTTDeviceRegistrationView(APIView):
    """
    Register a device from MQTT test results.
    Admin and Super Admin only.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Only Admin and Super Admin can register devices
        if not request.user.has_role('super_admin', 'admin'):
            return Response(
                {
                    'error': 'Permission denied',
                    'message': 'Only Admin and Super Admin can register devices'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = MQTTDeviceRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        hardware_address = validated_data['hardware_address']
        
        # Check if device already exists
        if Device.objects.filter(hardware_address=hardware_address).exists():
            return Response(
                {
                    'error': 'Device already exists',
                    'message': f'Device with hardware address {hardware_address} is already registered'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extract MQTT config
        mqtt_config = validated_data['mqtt_config']
        field_mappings = validated_data.get('field_mappings', {})
        
        # Create device with MQTT configuration
        device = Device.objects.create(
            hardware_address=hardware_address,
            name=validated_data['name'],
            area=validated_data.get('area'),
            building=validated_data.get('building'),
            floor=validated_data.get('floor'),
            mqtt_broker_host=mqtt_config['mqtt_broker_host'],
            mqtt_broker_port=mqtt_config['mqtt_broker_port'],
            mqtt_topic_prefix=mqtt_config['mqtt_topic_prefix'],
            mqtt_topic_pattern=mqtt_config.get('mqtt_topic_pattern') or f"{mqtt_config['mqtt_topic_prefix']}/{hardware_address}",
            mqtt_username=mqtt_config.get('mqtt_username'),
            mqtt_password=mqtt_config.get('mqtt_password'),  # Store as plain text (can be encrypted later if needed)
            mqtt_use_tls=mqtt_config.get('mqtt_use_tls', False),
            mqtt_tls_ca_certs=mqtt_config.get('mqtt_tls_ca_certs'),
            is_active=True
        )
        
        # Immediately subscribe to MQTT for this device
        # The signal handler will also try, but we do it here explicitly to ensure it happens
        try:
            from .mqtt_service import get_mqtt_connection_manager
            import logging
            logger = logging.getLogger(__name__)
            manager = get_mqtt_connection_manager()
            manager.subscribe_device(device)
            logger.info(f'✓ Immediately subscribed device {device.id} ({device.name}) to MQTT during registration')
        except Exception as e:
            # Log but don't fail registration - signal handler will retry
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f'Failed to immediately subscribe device {device.id} to MQTT during registration: {e}', exc_info=True)
        
        # Note: Field mappings are stored in ParameterMapping model separately
        # They are not directly linked to devices, but can be referenced by parameter_key
        
        return Response(
            {
                'message': 'Device registered successfully with MQTT configuration. Data capture started automatically.',
                'device': DeviceSerializer(device).data
            },
            status=status.HTTP_201_CREATED
        )


class DeviceMQTTConfigView(generics.RetrieveAPIView):
    """
    Retrieve MQTT configuration for a device.
    """
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_object(self):
        device = get_object_or_404(Device, id=self.kwargs['id'])
        user = self.request.user
        
        # Super Admin can access any device
        if user.has_role('super_admin'):
            return device
        
        # Admin can access any device
        if user.has_role('admin'):
            return device
        
        # Regular users can only access their assigned devices
        if device.assigned_users.filter(id=user.id).exists():
            return device
        
        self.permission_denied(
            self.request,
            message='You do not have access to this device'
        )
    
    def retrieve(self, request, *args, **kwargs):
        device = self.get_object()
        
        # Return only MQTT configuration
        mqtt_config = {
            'mqtt_broker_host': device.mqtt_broker_host,
            'mqtt_broker_port': device.mqtt_broker_port,
            'mqtt_topic_prefix': device.mqtt_topic_prefix,
            'mqtt_topic_pattern': device.mqtt_topic_pattern,
            'mqtt_username': device.mqtt_username,
            'mqtt_use_tls': device.mqtt_use_tls,
            'mqtt_tls_ca_certs': device.mqtt_tls_ca_certs,
            # Don't return password for security
        }
        
        return Response(mqtt_config, status=status.HTTP_200_OK)
