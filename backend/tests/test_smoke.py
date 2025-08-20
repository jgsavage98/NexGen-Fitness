from fastapi.testclient import TestClient
from backend.app.main import app

def test_health():
    c = TestClient(app)
    r = c.get('/health')
    assert r.status_code == 200
    assert r.json()['status'] == 'ok'

def test_post_message():
    c = TestClient(app)
    r = c.post('/chats/room1/messages', json={'text':'Hello','display_role':'coach'})
    assert r.status_code == 200
    assert r.json()['display_role'] == 'coach'
