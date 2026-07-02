import re

PDF_STREAM_PATH_RE = re.compile(r"^/api/media/pdfs/\d+/stream/?$")


class PdfStreamFrameOptionsMiddleware:
    """
    Allow embedding only for PDF stream endpoints via SAMEORIGIN.

    This is intentionally narrow: all other routes keep the default
    clickjacking policy (typically DENY in production).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if PDF_STREAM_PATH_RE.match(request.path_info):
            response["X-Frame-Options"] = "SAMEORIGIN"

        return response
