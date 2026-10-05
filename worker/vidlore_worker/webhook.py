"""Signed status callbacks to the web app (verified in apps/web/src/app/api/webhooks/render)."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
import urllib.request


def notify(url: str | None, payload: dict) -> None:
    if not url:
        return
    secret = os.environ.get("RENDER_WEBHOOK_SECRET")
    if not secret:
        print("[webhook] RENDER_WEBHOOK_SECRET not set, skipping callback")
        return
    body = json.dumps(payload, separators=(",", ":")).encode()
    ts = str(int(time.time()))
    sig = hmac.new(secret.encode(), ts.encode() + b"." + body, hashlib.sha256).hexdigest()
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "content-type": "application/json",
        "x-vidlore-timestamp": ts,
        "x-vidlore-signature": sig,
    })
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                if res.status < 300:
                    return
        except Exception as exc:  # noqa: BLE001 - best effort, retried
            print(f"[webhook] attempt {attempt + 1} failed: {exc}")
        time.sleep(2 * (attempt + 1))
