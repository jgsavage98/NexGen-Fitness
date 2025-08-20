from fastapi import APIRouter
from ..schemas.uploads import UploadIn, UploadOut

router = APIRouter()

@router.post("/mfp", response_model=UploadOut)
def upload_mfp(payload: UploadIn):
    # stub parse job
    return UploadOut(parse_job_id="job_abc123", status="queued")
