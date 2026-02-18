from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Branding
from .serializers import BrandingSerializer
from accounts.permissions import IsSuperAdmin

# Singleton pk used for get_or_create
BRANDING_PK = 1
MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024  # 2MB
ALLOWED_IMAGE_TYPES = ('image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif')


def get_branding_instance():
    """Return the single Branding row, creating default if needed."""
    branding, _ = Branding.objects.get_or_create(
        pk=BRANDING_PK,
        defaults={'title': 'IoT Energy Monitoring System'}
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
