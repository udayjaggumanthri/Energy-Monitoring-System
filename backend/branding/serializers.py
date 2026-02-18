from rest_framework import serializers
from .models import Branding


class BrandingSerializer(serializers.ModelSerializer):
    """Read-only exposure of title and logo_url for GET; used for PATCH response too."""
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Branding
        fields = ('title', 'logo_url')
        read_only_fields = ('title', 'logo_url')

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return ''
