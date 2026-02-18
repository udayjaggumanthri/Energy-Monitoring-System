from django.contrib import admin
from .models import Branding


@admin.register(Branding)
class BrandingAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'logo')
    list_editable = ('title',)
