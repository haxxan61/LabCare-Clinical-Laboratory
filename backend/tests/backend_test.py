"""LabCare backend API tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://lab-results-portal-12.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@labcare.com", "password": "admin123"}


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(client):
    r = client.post(f"{API}/auth/login", json=ADMIN, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def auth(client, token):
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


# ----- Auth -----
class TestAuth:
    def test_login_bad(self, client):
        r = client.post(f"{API}/auth/login", json={"email": "admin@labcare.com", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, auth):
        r = auth.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]

    def test_me_unauth(self, client):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ----- Patients -----
class TestPatients:
    def test_list_patients_seeded(self, auth):
        r = auth.get(f"{API}/patients", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 8

    def test_create_get_update_delete_patient(self, auth):
        payload = {"name": "TEST_John Doe", "age": 30, "gender": "Male", "phone": "+92-300-0000000"}
        r = auth.post(f"{API}/patients", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        p = r.json()
        pid = p["id"]
        assert p["name"] == payload["name"] and p["mr_number"].startswith("LC-")

        g = auth.get(f"{API}/patients/{pid}", timeout=15)
        assert g.status_code == 200 and g.json()["name"] == payload["name"]

        u = auth.put(f"{API}/patients/{pid}", json={**payload, "name": "TEST_John Updated"}, timeout=15)
        assert u.status_code == 200 and u.json()["name"] == "TEST_John Updated"

        d = auth.delete(f"{API}/patients/{pid}", timeout=15)
        assert d.status_code == 200

        g2 = auth.get(f"{API}/patients/{pid}", timeout=15)
        assert g2.status_code == 404


# ----- Tests catalog -----
class TestCatalog:
    def test_tests_seeded(self, auth):
        r = auth.get(f"{API}/tests", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 40
        # Validate structure
        t = data[0]
        for key in ("id", "code", "name", "category", "price", "parameters"):
            assert key in t
        codes = {t["code"] for t in data}
        assert {"CBC", "LIPID", "LFT"}.issubset(codes)

    def test_update_test_price(self, auth):
        r = auth.get(f"{API}/tests", timeout=15)
        tests = r.json()
        cbc = next(t for t in tests if t["code"] == "CBC")
        new_price = 650
        payload = {**{k: v for k, v in cbc.items() if k != "id"}, "price": new_price}
        u = auth.put(f"{API}/tests/{cbc['id']}", json=payload, timeout=15)
        assert u.status_code == 200
        assert u.json()["price"] == new_price
        # restore
        auth.put(f"{API}/tests/{cbc['id']}", json={**payload, "price": cbc["price"]}, timeout=15)


# ----- Reports + Dashboard + History -----
class TestReports:
    def test_create_report_flow(self, auth):
        # pick a patient
        patients = auth.get(f"{API}/patients", timeout=15).json()
        pid = patients[0]["id"]
        tests = auth.get(f"{API}/tests", timeout=15).json()
        cbc = next(t for t in tests if t["code"] == "CBC")
        lipid = next(t for t in tests if t["code"] == "LIPID")

        def build_result(t, values):
            params = []
            for i, p in enumerate(t["parameters"]):
                val = values[i] if i < len(values) else ""
                try:
                    v = float(val)
                    flag = ""
                    if p.get("low") is not None and v < p["low"]:
                        flag = "L"
                    elif p.get("high") is not None and v > p["high"]:
                        flag = "H"
                except Exception:
                    flag = ""
                params.append({"name": p["name"], "unit": p["unit"], "value": str(val),
                               "ref": p.get("ref_male", ""), "flag": flag})
            return {"test_id": t["id"], "test_code": t["code"], "test_name": t["name"],
                    "category": t["category"], "parameters": params}

        # Abnormal: Hemoglobin 10 (L); Total Chol 250 (H)
        r1 = build_result(cbc, [10, 7, 5, 300, 42, 90, 30, 34, 55, 30])
        r2 = build_result(lipid, [250, 100, 50, 90, 20])
        total = cbc["price"] + lipid["price"]
        payload = {"patient_id": pid, "results": [r1, r2], "total_amount": total,
                   "status": "completed", "pathologist": "Dr. Sarah Tariq", "clinical_notes": ""}
        c = auth.post(f"{API}/reports", json=payload, timeout=20)
        assert c.status_code == 200, c.text
        report = c.json()
        assert report["report_no"].startswith("R-")
        assert report["total_amount"] == total
        # verify flag preserved
        hb = report["results"][0]["parameters"][0]
        assert hb["flag"] == "L"
        pytest.report_id = report["id"]
        pytest.patient_id = pid

    def test_list_reports(self, auth):
        r = auth.get(f"{API}/reports", timeout=15)
        assert r.status_code == 200
        assert any(rep["id"] == pytest.report_id for rep in r.json())

    def test_get_report(self, auth):
        r = auth.get(f"{API}/reports/{pytest.report_id}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == pytest.report_id

    def test_patient_history(self, auth):
        r = auth.get(f"{API}/patients/{pytest.patient_id}/history", timeout=15)
        assert r.status_code == 200
        reports = r.json()
        assert any(rep["id"] == pytest.report_id for rep in reports)

    def test_dashboard_stats(self, auth):
        r = auth.get(f"{API}/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for key in ("total_patients", "total_reports", "reports_today", "revenue_total", "revenue_today", "abnormal_results"):
            assert key in d
        assert d["total_patients"] >= 8
        assert d["total_reports"] >= 1
        assert d["abnormal_results"] >= 1

    def test_create_report_bad_patient(self, auth):
        r = auth.post(f"{API}/reports", json={"patient_id": "nonexistent", "results": [], "total_amount": 0}, timeout=15)
        assert r.status_code == 404
