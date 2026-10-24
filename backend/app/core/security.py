import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.config.settings import settings

JWT_ALGORITHM = "HS256"

# scrypt from the standard library, so no extra dependency is needed.
# Stored format: scrypt$<n>$<r>$<p>$<salt_b64>$<hash_b64>
_N, _R, _P = 2**14, 8, 1
_DKLEN = 32


def hash_pin(pin: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(pin.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=_DKLEN)
    return "scrypt${}${}${}${}${}".format(
        _N,
        _R,
        _P,
        base64.b64encode(salt).decode(),
        base64.b64encode(digest).decode(),
    )


def verify_pin(pin: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt_b64, hash_b64 = stored.split("$")
    except ValueError:
        return False

    if scheme != "scrypt":
        return False

    expected = base64.b64decode(hash_b64)
    digest = hashlib.scrypt(
        pin.encode(),
        salt=base64.b64decode(salt_b64),
        n=int(n),
        r=int(r),
        p=int(p),
        dklen=len(expected),
    )
    return hmac.compare_digest(digest, expected)


# A real hash of a random PIN. Checking against it when the login is unknown
# makes "no such volunteer" take as long as "wrong PIN", so response time
# does not reveal which IDs exist.
DUMMY_PIN_HASH = hash_pin(secrets.token_hex(8))


def get_signing_key() -> str:
    """Ensure signing key has at least 32 bytes for HS256 to comply with RFC 7518 Section 3.2
    and prevent PyJWT InsecureKeyLengthWarning."""
    raw = settings.SECRET_KEY or "onehealth_secret_key_default_32bytes_minimum_length_required"
    if len(raw.encode("utf-8")) < 32:
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw


def create_access_token(subject_id: int, code: str, role: str = "COHV") -> tuple[str, int]:
    """Signed JWT for a volunteer (role COHV) or supervisor (role SUPERVISOR).
    Returns (token, lifetime in seconds).

    Carries a unique jti so one token can be revoked on logout without
    touching that account's other sessions.
    """
    lifetime = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject_id),
        "code": code,
        "role": role,
        "jti": secrets.token_urlsafe(16),
        "iat": now,
        "exp": now + lifetime,
    }
    token = jwt.encode(payload, get_signing_key(), algorithm=JWT_ALGORITHM)
    return token, int(lifetime.total_seconds())


def decode_access_token(token: str) -> dict | None:
    """The token's claims, or None if it is forged, malformed or expired."""
    try:
        return jwt.decode(token, get_signing_key(), algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
