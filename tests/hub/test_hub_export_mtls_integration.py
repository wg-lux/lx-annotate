from __future__ import annotations

import ipaddress
import ssl
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
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


def _tls_contexts(
    paths: _CertificatePaths,
    transport: HubTransportConfig,
) -> tuple[ssl.SSLContext, ssl.SSLContext]:
    if transport.cert is None or not isinstance(transport.verify, str):
        raise ValueError(
            "The integration harness requires client identity and CA files."
        )
    client_certificate, client_key = transport.cert

    server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    server_context.load_cert_chain(paths.server_certificate, paths.server_key)
    server_context.load_verify_locations(cafile=paths.ca)
    server_context.verify_mode = ssl.CERT_REQUIRED

    client_context = ssl.create_default_context(
        ssl.Purpose.SERVER_AUTH,
        cafile=transport.verify,
    )
    client_context.load_cert_chain(client_certificate, client_key)
    return client_context, server_context


def _transfer_tls_records(source: ssl.MemoryBIO, target: ssl.MemoryBIO) -> None:
    while data := source.read():
        target.write(data)


def _exchange_after_mutual_tls_handshake(
    *,
    paths: _CertificatePaths,
    body: bytes,
    transport: HubTransportConfig,
) -> bytes:
    client_context, server_context = _tls_contexts(paths, transport)
    client_incoming = ssl.MemoryBIO()
    client_outgoing = ssl.MemoryBIO()
    server_incoming = ssl.MemoryBIO()
    server_outgoing = ssl.MemoryBIO()
    client = client_context.wrap_bio(
        client_incoming,
        client_outgoing,
        server_hostname="127.0.0.1",
    )
    server = server_context.wrap_bio(
        server_incoming,
        server_outgoing,
        server_side=True,
    )

    client_complete = False
    server_complete = False
    for _ in range(20):
        if not client_complete:
            try:
                client.do_handshake()
                client_complete = True
            except ssl.SSLWantReadError:
                pass
        _transfer_tls_records(client_outgoing, server_incoming)

        if not server_complete:
            try:
                server.do_handshake()
                server_complete = True
            except ssl.SSLWantReadError:
                pass
        _transfer_tls_records(server_outgoing, client_incoming)

        if client_complete and server_complete:
            break
    else:
        raise AssertionError("Mutual TLS handshake did not complete.")

    # The application body is deliberately written only after both peers have
    # authenticated. Failed client identity or CA validation therefore cannot
    # disclose even the first payload byte.
    client.write(body)
    _transfer_tls_records(client_outgoing, server_incoming)
    return server.read(len(body))


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

    valid_body = b"validated anonymized metadata"
    assert (
        _exchange_after_mutual_tls_handshake(
            paths=paths,
            body=valid_body,
            transport=valid_transport,
        )
        == valid_body
    )

    with pytest.raises(ssl.SSLError):
        _exchange_after_mutual_tls_handshake(
            paths=paths,
            body=b"must not cross expired-client handshake",
            transport=expired_client_transport,
        )

    with pytest.raises(ssl.SSLError):
        _exchange_after_mutual_tls_handshake(
            paths=paths,
            body=b"must not cross wrong-ca handshake",
            transport=wrong_ca_transport,
        )
