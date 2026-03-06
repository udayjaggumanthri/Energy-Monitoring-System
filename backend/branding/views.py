from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Branding, WhiteLabel
from .serializers import BrandingSerializer, WhiteLabelSerializer
from accounts.permissions import IsSuperAdmin
from django.shortcuts import get_object_or_404

# Singleton pk used for get_or_create
BRANDING_PK = 1
MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024  # 2MB
ALLOWED_IMAGE_TYPES = ('image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif')


def get_branding_instance():
    """Return the single Branding row, creating default if needed."""
    branding, _ = Branding.objects.get_or_create(
        pk=BRANDING_PK,
        defaults={'title': 'IoT Monitoring System'}
    )
    return branding


class BrandingView(APIView):
    """
    GET: Public. Returns current branding (title, logo_url).
    PATCH: Super Admin only. Accepts multipart/form-data: title (optional), logo (optional file).
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsSuperAdmin()]

    def get(self, request):
        # If authenticated and a white-label is assigned, return that branding
        if request.user and request.user.is_authenticated:
            white_label = getattr(request.user, 'white_label', None)
            if white_label and getattr(white_label, 'is_active', True):
                logo_url = ''
                if white_label.logo:
                    logo_url = request.build_absolute_uri(white_label.logo.url)
                return Response({'title': white_label.title, 'logo_url': logo_url})

        branding = get_branding_instance()
        serializer = BrandingSerializer(branding, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        branding = get_branding_instance()
        data = {}
        if 'title' in request.data:
            data['title'] = request.data.get('title', branding.title)
        if 'logo' in request.FILES:
            logo_file = request.FILES['logo']
            if logo_file.size > MAX_LOGO_SIZE_BYTES:
                return Response(
                    {'error': 'Logo file too large. Max size: 2MB.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            content_type = getattr(logo_file, 'content_type', '') or ''
            if content_type and content_type.lower() not in [t.lower() for t in ALLOWED_IMAGE_TYPES]:
                return Response(
                    {'error': 'Invalid image type. Allowed: PNG, JPG, JPEG, SVG, GIF.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Remove old logo file if present
            if branding.logo:
                try:
                    branding.logo.delete(save=False)
                except Exception:
                    pass
            branding.logo = logo_file
        if 'title' in request.data:
            branding.title = request.data.get('title', branding.title).strip() or branding.title
        branding.save()
        serializer = BrandingSerializer(branding, context={'request': request})
        return Response(serializer.data)


class WhiteLabelListCreateView(APIView):
    """
    GET: Super Admin only. List all white-label configurations.
    POST: Super Admin only. Create a new configuration (multipart supported for logo).
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        qs = WhiteLabel.objects.all().order_by('name')
        serializer = WhiteLabelSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = WhiteLabelSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        logo_file = request.FILES.get('logo')
        if logo_file:
            if logo_file.size > MAX_LOGO_SIZE_BYTES:
                return Response(
                    {'error': 'Logo file too large. Max size: 2MB.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            content_type = getattr(logo_file, 'content_type', '') or ''
            if content_type and content_type.lower() not in [t.lower() for t in ALLOWED_IMAGE_TYPES]:
                return Response(
                    {'error': 'Invalid image type. Allowed: PNG, JPG, JPEG, SVG, GIF.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        obj = WhiteLabel.objects.create(
            name=serializer.validated_data['name'].strip(),
            title=(serializer.validated_data.get('title') or '').strip() or 'IoT Monitoring System',
            logo=logo_file if logo_file else None,
            created_by=request.user
        )
        out = WhiteLabelSerializer(obj, context={'request': request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class WhiteLabelDetailView(APIView):
    """
    PATCH: Super Admin only. Update name/title/logo/is_active.
    DELETE: Super Admin only. Delete configuration.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def patch(self, request, pk: int):
        obj = get_object_or_404(WhiteLabel, pk=pk)

        if 'name' in request.data:
            obj.name = (request.data.get('name') or obj.name).strip() or obj.name
        if 'title' in request.data:
            obj.title = (request.data.get('title') or obj.title).strip() or obj.title
        if 'is_active' in request.data:
            value = request.data.get('is_active')
            obj.is_active = bool(value) if isinstance(value, bool) else str(value).lower() in ('1', 'true', 'yes', 'on')

        if 'logo' in request.FILES:
            logo_file = request.FILES['logo']
            if logo_file.size > MAX_LOGO_SIZE_BYTES:
                return Response(
                    {'error': 'Logo file too large. Max size: 2MB.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            content_type = getattr(logo_file, 'content_type', '') or ''
            if content_type and content_type.lower() not in [t.lower() for t in ALLOWED_IMAGE_TYPES]:
                return Response(
                    {'error': 'Invalid image type. Allowed: PNG, JPG, JPEG, SVG, GIF.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if obj.logo:
                try:
                    obj.logo.delete(save=False)
                except Exception:
                    pass
            obj.logo = logo_file

        obj.save()
        serializer = WhiteLabelSerializer(obj, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, pk: int):
        obj = get_object_or_404(WhiteLabel, pk=pk)
        if obj.logo:
            try:
                obj.logo.delete(save=False)
            except Exception:
                pass
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
