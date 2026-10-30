from fastapi.testclient import TestClient
from main import app
client=TestClient(app)
def test_health():
    r=client.get('/api/v1/health')
    assert r.status_code==200 and r.json()['status']=='ok'
