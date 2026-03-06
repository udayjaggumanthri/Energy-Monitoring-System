from rest_framework import serializers
from .models import Branding, WhiteLabel


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


class WhiteLabelSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = WhiteLabel
        fields = ('id', 'name', 'title', 'logo_url', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'logo_url', 'created_at', 'updated_at')

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return ''
