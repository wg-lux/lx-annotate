"""Shared typed HTTPS/mTLS transport contract for hub transfer clients."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TypedDict


class TransferRequestKwargs(TypedDict, total=False):
    allow_redirects: bool
    verify: str | bool
    cert: tuple[str, str]


@dataclass(frozen=True, slots=True)
class TransferTransportConfig:
    """Requests-compatible transport settings with redirects always disabled."""

    cert: tuple[str, str] | None
    verify: str | bool

    def request_kwargs(self) -> TransferRequestKwargs:
        kwargs: TransferRequestKwargs = {
            "allow_redirects": False,
            "verify": self.verify,
        }
        if self.cert is not None:
            kwargs["cert"] = self.cert
        return kwargs


__all__ = ["TransferRequestKwargs", "TransferTransportConfig"]
