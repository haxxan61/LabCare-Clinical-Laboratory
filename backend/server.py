from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr

from seed_data import SEED_TESTS, SEED_PATIENTS
from full_catalog import FULL_CATALOG, categorize
from storage import init_storage, put_object, get_object, APP_NAME

# -----------------------------
# Setup
# -----------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

app = FastAPI(title="LabCare Clinical Laboratory API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# -----------------------------
# Helpers
# -----------------------------
def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# -----------------------------
# Models
# -----------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str


class Patient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    mr_number: str
    name: str
    age: int
    gender: str
    phone: Optional[str] = ""
    address: Optional[str] = ""
    referring_physician: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)


class PatientIn(BaseModel):
    mr_number: Optional[str] = None
    name: str
    age: int
    gender: str
    phone: Optional[str] = ""
    address: Optional[str] = ""
    referring_physician: Optional[str] = ""


class TestParameter(BaseModel):
    name: str
    unit: str = ""
    ref_male: str = ""
    ref_female: str = ""
    low: Optional[float] = None
    high: Optional[float] = None
    group: str = ""  # optional section header, e.g. "RBCs Parameter"


class TestItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    code: str
    name: str
    category: str
    specimen: str = ""
    price: float = 0
    tat_hours: int = 24
    parameters: List[TestParameter] = []


class TestItemIn(BaseModel):
    code: str
    name: str
    category: str
    specimen: str = ""
    price: float = 0
    tat_hours: int = 24
    parameters: List[TestParameter] = []


class ReportResult(BaseModel):
    test_id: str
    test_code: str
    test_name: str
    category: str
    parameters: List[dict]  # [{name, unit, value, ref, flag}]


class Report(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    report_no: str
    patient_id: str
    patient_snapshot: dict
    results: List[ReportResult]
    total_amount: float = 0
    status: str = "completed"  # draft | completed
    pathologist: str = ""
    clinical_notes: str = ""
    created_at: str = Field(default_factory=now_iso)


class ReportIn(BaseModel):
    patient_id: str
    results: List[ReportResult]
    total_amount: float = 0
    status: str = "completed"
    pathologist: str = ""
    clinical_notes: str = ""


# -----------------------------
# Auth endpoints
# -----------------------------
@api_router.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=8 * 3600, path="/",
    )
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"], "token": token}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}


# -----------------------------
# Patients
# -----------------------------
@api_router.get("/patients")
async def list_patients(user: dict = Depends(get_current_user)):
    docs = await db.patients.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/patients")
async def create_patient(data: PatientIn, user: dict = Depends(get_current_user)):
    mr = data.mr_number
    if not mr:
        count = await db.patients.count_documents({})
        mr = f"LC-{datetime.now().year}-{(count + 1):04d}"
    if await db.patients.find_one({"mr_number": mr}):
        raise HTTPException(status_code=400, detail="MR number already exists")
    p = Patient(mr_number=mr, **data.model_dump(exclude={"mr_number"}))
    await db.patients.insert_one(p.model_dump())
    return p.model_dump()


@api_router.get("/patients/{pid}")
async def get_patient(pid: str, user: dict = Depends(get_current_user)):
    p = await db.patients.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p


@api_router.put("/patients/{pid}")
async def update_patient(pid: str, data: PatientIn, user: dict = Depends(get_current_user)):
    update = data.model_dump(exclude_none=True)
    update.pop("mr_number", None)
    await db.patients.update_one({"id": pid}, {"$set": update})
    return await db.patients.find_one({"id": pid}, {"_id": 0})


@api_router.delete("/patients/{pid}")
async def delete_patient(pid: str, user: dict = Depends(get_current_user)):
    await db.patients.delete_one({"id": pid})
    return {"ok": True}


@api_router.get("/patients/{pid}/history")
async def patient_history(pid: str, user: dict = Depends(get_current_user)):
    reports = await db.reports.find({"patient_id": pid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return reports


# -----------------------------
# Tests catalog
# -----------------------------
@api_router.get("/tests")
async def list_tests(user: dict = Depends(get_current_user)):
    docs = await db.tests.find({}, {"_id": 0}).sort("name", 1).to_list(2000)
    return docs


@api_router.post("/tests/import-full")
async def import_full_catalog(user: dict = Depends(get_current_user)):
    """Bulk-insert all tests from the Umar PDF (skips any duplicates by code)."""
    existing_codes = {t["code"] async for t in db.tests.find({}, {"code": 1, "_id": 0})}
    added = 0
    for code, name, price in FULL_CATALOG:
        code_str = str(code)
        if code_str in existing_codes:
            continue
        doc = TestItem(
            code=code_str,
            name=name,
            category=categorize(name),
            specimen="",
            price=float(price),
            tat_hours=24,
            parameters=[],
        ).model_dump()
        await db.tests.insert_one(doc)
        added += 1
    total = await db.tests.count_documents({})
    return {"added": added, "total": total}


@api_router.post("/tests")
async def create_test(data: TestItemIn, user: dict = Depends(get_current_user)):
    t = TestItem(**data.model_dump())
    await db.tests.insert_one(t.model_dump())
    return t.model_dump()


@api_router.put("/tests/{tid}")
async def update_test(tid: str, data: TestItemIn, user: dict = Depends(get_current_user)):
    await db.tests.update_one({"id": tid}, {"$set": data.model_dump()})
    return await db.tests.find_one({"id": tid}, {"_id": 0})


@api_router.delete("/tests/{tid}")
async def delete_test(tid: str, user: dict = Depends(get_current_user)):
    await db.tests.delete_one({"id": tid})
    return {"ok": True}


# -----------------------------
# Reports
# -----------------------------
@api_router.get("/reports")
async def list_reports(user: dict = Depends(get_current_user)):
    docs = await db.reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/reports")
async def create_report(data: ReportIn, user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": data.patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    count = await db.reports.count_documents({})
    report_no = f"R-{datetime.now().year}-{(count + 1):05d}"
    r = Report(
        report_no=report_no,
        patient_id=data.patient_id,
        patient_snapshot=patient,
        results=data.results,
        total_amount=data.total_amount,
        status=data.status,
        pathologist=data.pathologist or user.get("name", ""),
        clinical_notes=data.clinical_notes,
    )
    await db.reports.insert_one(r.model_dump())
    return r.model_dump()


@api_router.get("/reports/{rid}")
async def get_report(rid: str, user: dict = Depends(get_current_user)):
    r = await db.reports.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return r


@api_router.delete("/reports/{rid}")
async def delete_report(rid: str, user: dict = Depends(get_current_user)):
    await db.reports.delete_one({"id": rid})
    return {"ok": True}


# -----------------------------
# Dashboard stats
# -----------------------------
@api_router.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    total_patients = await db.patients.count_documents({})
    total_reports = await db.reports.count_documents({})
    reports_today = await db.reports.count_documents({"created_at": {"$gte": today}})

    pipeline = [{"$group": {"_id": None, "sum": {"$sum": "$total_amount"}}}]
    agg_total = await db.reports.aggregate(pipeline).to_list(1)
    revenue_total = agg_total[0]["sum"] if agg_total else 0

    today_pipeline = [
        {"$match": {"created_at": {"$gte": today}}},
        {"$group": {"_id": None, "sum": {"$sum": "$total_amount"}}},
    ]
    agg_today = await db.reports.aggregate(today_pipeline).to_list(1)
    revenue_today = agg_today[0]["sum"] if agg_today else 0

    abnormal_count = 0
    async for r in db.reports.find({}, {"_id": 0, "results": 1}):
        for res in r.get("results", []):
            for p in res.get("parameters", []):
                if p.get("flag") in ("H", "L", "CRITICAL"):
                    abnormal_count += 1
                    break

    return {
        "total_patients": total_patients,
        "total_reports": total_reports,
        "reports_today": reports_today,
        "revenue_total": revenue_total,
        "revenue_today": revenue_today,
        "abnormal_results": abnormal_count,
    }


# -----------------------------
# Settings (lab branding)
# -----------------------------
DEFAULT_SETTINGS = {
    "lab_name": "LabCare Clinical Laboratory",
    "tagline": "Precision Diagnostics · ISO Accredited",
    "address": "Chichawatni Road, Burewala",
    "phone": "+92-300-0000000",
    "email": "",
    "primary_color": "#BE123C",
    "accent_color": "#0D9488",
    "logo_path": "",
}


class SettingsIn(BaseModel):
    lab_name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    logo_path: Optional[str] = None


async def _get_settings_doc():
    doc = await db.settings.find_one({"id": "lab"}, {"_id": 0})
    if not doc:
        doc = {"id": "lab", **DEFAULT_SETTINGS}
        await db.settings.insert_one(doc)
        doc.pop("_id", None)
    return doc


@api_router.get("/settings")
async def get_settings():
    """Public — needed to render login screen branding."""
    doc = await _get_settings_doc()
    return doc


@api_router.put("/settings")
async def update_settings(data: SettingsIn, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.settings.update_one({"id": "lab"}, {"$set": update}, upsert=True)
    return await _get_settings_doc()


@api_router.post("/settings/logo")
async def upload_logo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    data = await file.read()
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Logo must be under 2 MB")
    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "png").lower()
    path = f"{APP_NAME}/branding/logo-{uuid.uuid4().hex}.{ext}"
    result = put_object(path, data, file.content_type)
    canonical_path = result["path"]
    await db.settings.update_one({"id": "lab"}, {"$set": {"logo_path": canonical_path}}, upsert=True)
    return {"logo_path": canonical_path}


@api_router.get("/settings/logo")
async def serve_logo():
    """Public endpoint — returns raw image bytes of the stored lab logo."""
    doc = await _get_settings_doc()
    path = doc.get("logo_path")
    if not path:
        raise HTTPException(status_code=404, detail="No logo set")
    try:
        data, ct = get_object(path)
    except Exception as e:
        logger.error(f"Logo fetch failed: {e}")
        raise HTTPException(status_code=404, detail="Logo unavailable")
    return Response(content=data, media_type=ct or "image/png")


# -----------------------------
# Startup: seed admin + catalog
# -----------------------------
@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.patients.create_index("mr_number", unique=True)
    await db.tests.create_index("code")
    await db.reports.create_index("report_no", unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@labcare.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Dr. Sarah Tariq",
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin user: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )

    # Seed tests
    if await db.tests.count_documents({}) == 0:
        for t in SEED_TESTS:
            doc = TestItem(**t).model_dump()
            await db.tests.insert_one(doc)
        logger.info(f"Seeded {len(SEED_TESTS)} tests")

    # Always refresh the CBC structure so grouped layout stays in sync with seed_data
    cbc_seed = next((t for t in SEED_TESTS if t.get("code") == "CBC"), None)
    if cbc_seed:
        existing_cbc = await db.tests.find_one({"code": "CBC"}, {"_id": 0, "id": 1})
        if existing_cbc:
            new_cbc = TestItem(**cbc_seed).model_dump()
            new_cbc["id"] = existing_cbc["id"]  # keep same id to preserve references
            await db.tests.update_one({"id": existing_cbc["id"]}, {"$set": new_cbc})

    # Seed patients
    if await db.patients.count_documents({}) == 0:
        for p in SEED_PATIENTS:
            doc = Patient(**p).model_dump()
            await db.patients.insert_one(doc)
        logger.info(f"Seeded {len(SEED_PATIENTS)} patients")

    # Seed settings
    if await db.settings.count_documents({}) == 0:
        await db.settings.insert_one({"id": "lab", **DEFAULT_SETTINGS})

    # Warm up object storage (non-fatal)
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Object storage init failed (uploads will retry on first call): {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
