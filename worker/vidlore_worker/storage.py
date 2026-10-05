"""Storage drivers matching packages/core/src/storage (same key layout)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional, Protocol


class Storage(Protocol):
    def get(self, key: str) -> Optional[bytes]: ...
    def put(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> None: ...
    def exists(self, key: str) -> bool: ...


class LocalStorage:
    def __init__(self, root: str):
        self.root = Path(root).resolve()

    def _path(self, key: str) -> Path:
        p = (self.root / key).resolve()
        if self.root not in p.parents and p != self.root:
            raise ValueError("Invalid storage key")
        return p

    def get(self, key: str) -> Optional[bytes]:
        p = self._path(key)
        return p.read_bytes() if p.exists() else None

    def put(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)

    def exists(self, key: str) -> bool:
        return self._path(key).exists()


class R2Storage:
    def __init__(self) -> None:
        import boto3

        self.bucket = os.environ["R2_BUCKET"]
        self.client = boto3.client(
            "s3",
            endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            region_name="auto",
        )

    def get(self, key: str) -> Optional[bytes]:
        try:
            return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        except self.client.exceptions.NoSuchKey:
            return None

    def put(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)

    def exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False


def get_storage() -> Storage:
    driver = os.environ.get("STORAGE_DRIVER", "local")
    if driver == "local":
        return LocalStorage(os.environ.get("LOCAL_STORAGE_DIR", "./storage"))
    if driver == "r2":
        return R2Storage()
    raise ValueError(f"Unknown STORAGE_DRIVER {driver}")
