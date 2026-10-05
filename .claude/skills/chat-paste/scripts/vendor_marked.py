#!/usr/bin/env python3
"""Refresh chat-paste's offline parser from a pinned, integrity-checked package."""

import base64
import hashlib
import io
from pathlib import Path
import tarfile
import urllib.request

VERSION = "18.1.0"
INTEGRITY = "PamYXWWWg2nboG3oX5Ffzpy3EFZROqZJK9hSlMmUnekp7TxPs5DcT95vwd46m73/exfKCRVMtgXoPMI4FEJL6w=="


def main():
    url = f"https://registry.npmjs.org/marked/-/marked-{VERSION}.tgz"
    with urllib.request.urlopen(url, timeout=30) as response:
        archive = response.read()
    digest = base64.b64encode(hashlib.sha512(archive).digest()).decode()
    if digest != INTEGRITY:
        raise SystemExit("Marked package integrity mismatch; nothing written.")
    target = Path(__file__).resolve().parent.parent / "assets" / "vendor"
    target.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as package:
        for member, name in [
            ("package/lib/marked.umd.js", "marked.umd.js"),
            ("package/LICENSE", "marked-LICENSE.md"),
        ]:
            with package.extractfile(member) as source:
                (target / name).write_bytes(source.read())
    print(f"Vendored marked {VERSION} (SHA-512 verified).")


if __name__ == "__main__":
    main()
