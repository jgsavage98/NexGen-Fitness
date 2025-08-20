from pydantic import BaseModel
from typing import Optional

class UploadIn(BaseModel):
    blob_url: str
    client_local_date_hint: Optional[str] = None

class UploadOut(BaseModel):
    parse_job_id: str
    status: str
