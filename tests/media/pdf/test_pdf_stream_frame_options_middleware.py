from django.http import HttpResponse
from django.test import RequestFactory

from lx_annotate.middleware import PdfStreamFrameOptionsMiddleware


def _deny_response(_request):
    response = HttpResponse("ok")
    response["X-Frame-Options"] = "DENY"
    return response


def test_pdf_stream_path_sets_sameorigin():
    request = RequestFactory().get("/api/media/pdfs/1/stream/?type=raw")
    middleware = PdfStreamFrameOptionsMiddleware(_deny_response)

    response = middleware(request)

    assert response["X-Frame-Options"] == "SAMEORIGIN"


def test_non_pdf_stream_path_keeps_existing_header():
    request = RequestFactory().get("/api/media/videos/1/stream/?type=processed")
    middleware = PdfStreamFrameOptionsMiddleware(_deny_response)

    response = middleware(request)

    assert response["X-Frame-Options"] == "DENY"
