from __future__ import annotations

import ipaddress
import ssl
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import cast

import pytest
import requests
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID, ObjectIdentifier

from lx_annotate.hub.hub_export_worker import HubTransportConfig


@dataclass(frozen=True)
class _CertificatePaths:
    ca: Path
    wrong_ca: Path
    server_certificate: Path
    server_key: Path
    valid_client_certificate: Path
    valid_client_key: Path
    expired_client_certificate: Path
    expired_client_key: Path


def _new_key() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _name(common_name: str) -> x509.Name:
    return x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])


def _write_key(path: Path, key: rsa.RSAPrivateKey) -> None:
    path.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )


def _write_certificate(path: Path, certificate: x509.Certificate) -> None:
    path.write_bytes(certificate.public_bytes(serialization.Encoding.PEM))


def _build_ca(
    *,
    key: rsa.RSAPrivateKey,
    common_name: str,
    now: datetime,
) -> x509.Certificate:
    name = _name(common_name)
    return (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(days=1))
        .not_valid_after(now + timedelta(days=30))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )


def _build_leaf_certificate(
    *,
    key: rsa.RSAPrivateKey,
    common_name: str,
    ca_certificate: x509.Certificate,
    ca_key: rsa.RSAPrivateKey,
    not_valid_before: datetime,
    not_valid_after: datetime,
    extended_key_usage: ObjectIdentifier,
    subject_alternative_name: x509.SubjectAlternativeName | None = None,
) -> x509.Certificate:
    builder = (
        x509.CertificateBuilder()
        .subject_name(_name(common_name))
        .issuer_name(ca_certificate.subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(not_valid_before)
        .not_valid_after(not_valid_after)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.ExtendedKeyUsage([extended_key_usage]),
            critical=False,
        )
    )
    if subject_alternative_name is not None:
        builder = builder.add_extension(subject_alternative_name, critical=False)
    return builder.sign(ca_key, hashes.SHA256())


def _create_certificate_paths(tmp_path: Path) -> _CertificatePaths:
    now = datetime.now(UTC)
    ca_key = _new_key()
    ca_certificate = _build_ca(key=ca_key, common_name="hub-test-ca", now=now)
    wrong_ca_key = _new_key()
    wrong_ca_certificate = _build_ca(
        key=wrong_ca_key,
        common_name="wrong-hub-test-ca",
        now=now,
    )

    server_key = _new_key()
    server_certificate = _build_leaf_certificate(
        key=server_key,
        common_name="127.0.0.1",
        ca_certificate=ca_certificate,
        ca_key=ca_key,
        not_valid_before=now - timedelta(minutes=5),
        not_valid_after=now + timedelta(days=1),
        extended_key_usage=ExtendedKeyUsageOID.SERVER_AUTH,
        subject_alternative_name=x509.SubjectAlternativeName(
            [x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]
        ),
    )
    valid_client_key = _new_key()
    valid_client_certificate = _build_leaf_certificate(
        key=valid_client_key,
        common_name="site-node-valid",
        ca_certificate=ca_certificate,
        ca_key=ca_key,
        not_valid_before=now - timedelta(minutes=5),
        not_valid_after=now + timedelta(days=1),
        extended_key_usage=ExtendedKeyUsageOID.CLIENT_AUTH,
    )
    expired_client_key = _new_key()
    expired_client_certificate = _build_leaf_certificate(
        key=expired_client_key,
        common_name="site-node-expired",
        ca_certificate=ca_certificate,
        ca_key=ca_key,
        not_valid_before=now - timedelta(days=2),
        not_valid_after=now - timedelta(days=1),
        extended_key_usage=ExtendedKeyUsageOID.CLIENT_AUTH,
    )

    paths = _CertificatePaths(
        ca=tmp_path / "ca.pem",
        wrong_ca=tmp_path / "wrong-ca.pem",
        server_certificate=tmp_path / "server.pem",
        server_key=tmp_path / "server-key.pem",
        valid_client_certificate=tmp_path / "client.pem",
        valid_client_key=tmp_path / "client-key.pem",
        expired_client_certificate=tmp_path / "expired-client.pem",
        expired_client_key=tmp_path / "expired-client-key.pem",
    )
    _write_certificate(paths.ca, ca_certificate)
    _write_certificate(paths.wrong_ca, wrong_ca_certificate)
    _write_certificate(paths.server_certificate, server_certificate)
    _write_key(paths.server_key, server_key)
    _write_certificate(paths.valid_client_certificate, valid_client_certificate)
    _write_key(paths.valid_client_key, valid_client_key)
    _write_certificate(paths.expired_client_certificate, expired_client_certificate)
    _write_key(paths.expired_client_key, expired_client_key)
    return paths


@contextmanager
def _mutual_tls_server(
    paths: _CertificatePaths,
) -> Iterator[tuple[str, list[bytes]]]:
    received_bodies: list[bytes] = []

    class _Handler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:  # noqa: N802
            content_length = int(self.headers.get("Content-Length", "0"))
            received_bodies.append(self.rfile.read(content_length))
            self.send_response(204)
            self.end_headers()

        def log_message(self, format: str, *_args: object) -> None:  # noqa: A002
            del format
            return

    server = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    tls_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    tls_context.load_cert_chain(paths.server_certificate, paths.server_key)
    tls_context.load_verify_locations(cafile=paths.ca)
    tls_context.verify_mode = ssl.CERT_REQUIRED
    server.socket = tls_context.wrap_socket(server.socket, server_side=True)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    try:
        host, port = cast(tuple[str, int], server.server_address)
        yield f"https://{host}:{port}/hub/transfers", received_bodies
    finally:
        server.shutdown()
        server.server_close()
        server_thread.join(timeout=2)


def _post_with_transport(
    *,
    url: str,
    body: bytes,
    transport: HubTransportConfig,
) -> requests.Response:
    return requests.post(
        url,
        data=body,
        timeout=2,
        **transport.request_kwargs(),
    )


def test_sender_mtls_rejects_expired_client_and_wrong_ca_before_body_disclosure(
    tmp_path: Path,
) -> None:
    paths = _create_certificate_paths(tmp_path)
    valid_transport = HubTransportConfig(
        cert=(str(paths.valid_client_certificate), str(paths.valid_client_key)),
        verify=str(paths.ca),
    )
    expired_client_transport = HubTransportConfig(
        cert=(
            str(paths.expired_client_certificate),
            str(paths.expired_client_key),
        ),
        verify=str(paths.ca),
    )
    wrong_ca_transport = HubTransportConfig(
        cert=(str(paths.valid_client_certificate), str(paths.valid_client_key)),
        verify=str(paths.wrong_ca),
    )

    with _mutual_tls_server(paths) as (url, received_bodies):
        valid_body = b"validated anonymized metadata"
        response = _post_with_transport(
            url=url,
            body=valid_body,
            transport=valid_transport,
        )
        assert response.status_code == 204
        assert received_bodies == [valid_body]

        received_bodies.clear()
        with pytest.raises(requests.exceptions.SSLError):
            _post_with_transport(
                url=url,
                body=b"must not cross expired-client handshake",
                transport=expired_client_transport,
            )
        assert received_bodies == []

        with pytest.raises(requests.exceptions.SSLError):
            _post_with_transport(
                url=url,
                body=b"must not cross wrong-ca handshake",
                transport=wrong_ca_transport,
            )
        assert received_bodies == []
