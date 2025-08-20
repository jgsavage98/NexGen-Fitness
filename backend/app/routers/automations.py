from fastapi import APIRouter
router = APIRouter()

@router.get("/schedules")
def list_schedules():
    return [{"type":"daily_motivation","time":"08:00","enabled":True}]
