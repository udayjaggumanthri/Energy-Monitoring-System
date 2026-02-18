from rest_framework.pagination import PageNumberPagination


class DeviceListPagination(PageNumberPagination):
    """Pagination for device list with optional page_size query param (capped at 500)."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500

    def get_page_size(self, request):
        try:
            value = request.query_params.get(self.page_size_query_param)
            if value is not None:
                size = int(value)
                if 1 <= size <= self.max_page_size:
                    return size
        except (ValueError, TypeError):
            pass
        return self.page_size


class DeviceDataListPagination(PageNumberPagination):
    """Pagination for device-data list (Module 7). Export-friendly: max_page_size 10000."""
    page_size = 500
    page_size_query_param = 'page_size'
    max_page_size = 10000

    def get_page_size(self, request):
        try:
            value = request.query_params.get(self.page_size_query_param)
            if value is not None:
                size = int(value)
                if 1 <= size <= self.max_page_size:
                    return size
        except (ValueError, TypeError):
            pass
        return self.page_size
