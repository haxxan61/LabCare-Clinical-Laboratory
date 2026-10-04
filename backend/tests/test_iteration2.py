"""Iteration 2: Full catalog import + Settings (branding) + Logo upload tests."""
import io
import os
import struct
import zlib
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@labcare.com", "password": "admin123"}


def _make_png_bytes(w=4, h=4, color=(255, 0, 0)):
    """Build minimal valid PNG bytes without PIL."""
    def chunk(ctype, data):
        return (struct.pack(">I", len(data)) + ctype + data +
                struct.pack(">I", zlib.crc32(ctype + data) & 0xffffffff))
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # 8-bit RGB
    raw = b""
    for _ in range(h):
        raw += b"\x00" + bytes(color) * w
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture(scope="module")
def auth_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=20)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ------ Full Catalog Import ------
class TestFullCatalogImport:
    def test_import_full_catalog(self, auth_session):
        r = auth_session.post(f"{API}/tests/import-full", timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "added" in data and "total" in data
        assert data["total"] >= 684, f"total={data['total']}"
        pytest.first_added = data["added"]
        pytest.first_total = data["total"]

    def test_import_full_idempotent(self, auth_session):
        r = auth_session.post(f"{API}/tests/import-full", timeout=120)
        assert r.status_code == 200
        data = r.json()
        assert data["added"] == 0, f"second import added={data['added']}"
        assert data["total"] == pytest.first_total

    def test_categories_present(self, auth_session):
        r = auth_session.get(f"{API}/tests", timeout=30)
        assert r.status_code == 200
        tests = r.json()
        cats = {t["category"] for t in tests}
        # Expected categories per request
        expected = {"Hematology", "Biochemistry", "Immunology", "Virology",
                    "Microbiology", "Endocrinology"}
        missing = expected - cats
        assert not missing, f"Missing categories: {missing}; got {cats}"


# ------ Settings CRUD ------
class TestSettings:
    def test_get_settings_public(self):
        r = requests.get(f"{API}/settings", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("lab_name", "tagline", "primary_color", "accent_color"):
            assert k in d

    def test_put_settings_persists(self, auth_session):
        original = requests.get(f"{API}/settings", timeout=15).json()
        new_name = "TEST_LabCare Diagnostics"
        new_color = "#123456"
        r = auth_session.put(f"{API}/settings",
                             json={"lab_name": new_name, "primary_color": new_color},
                             timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["lab_name"] == new_name
        assert d["primary_color"] == new_color

        # verify persistence via public GET
        g = requests.get(f"{API}/settings", timeout=15).json()
        assert g["lab_name"] == new_name
        assert g["primary_color"] == new_color

        # restore
        auth_session.put(f"{API}/settings",
                         json={"lab_name": original["lab_name"],
                               "primary_color": original["primary_color"]},
                         timeout=15)

    def test_put_settings_requires_auth(self):
        r = requests.put(f"{API}/settings", json={"lab_name": "x"}, timeout=15)
        assert r.status_code == 401


# ------ Logo upload / serve ------
class TestLogo:
    def test_upload_logo_png(self, auth_session):
        png = _make_png_bytes()
        files = {"file": ("logo.png", png, "image/png")}
        # requests needs no Content-Type header set manually for multipart
        s2 = requests.Session()
        s2.headers.update({"Authorization": auth_session.headers["Authorization"]})
        r = s2.post(f"{API}/settings/logo", files=files, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("logo_path", "").startswith("labcare/branding/logo-")

    def test_get_logo_public(self):
        r = requests.get(f"{API}/settings/logo", timeout=30)
        assert r.status_code == 200, r.text
        assert r.headers.get("Content-Type", "").startswith("image/")
        assert len(r.content) > 0
        # verify PNG signature
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_upload_rejects_non_image(self, auth_session):
        s2 = requests.Session()
        s2.headers.update({"Authorization": auth_session.headers["Authorization"]})
        files = {"file": ("x.txt", b"hello", "text/plain")}
        r = s2.post(f"{API}/settings/logo", files=files, timeout=30)
        assert r.status_code == 400
