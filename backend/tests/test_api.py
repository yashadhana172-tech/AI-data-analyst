from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_api_demo_login():
    res = client.post("/api/auth/demo")
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "demo@insightai.com"

def test_api_dashboard_stats():
    # Login
    auth_res = client.post("/api/auth/demo")
    token = auth_res.json()["access_token"]
    
    res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_datasets" in data
    assert "demo_questions" in data
    assert len(data["demo_questions"]) >= 5

def test_api_dataset_list():
    auth_res = client.post("/api/auth/demo")
    token = auth_res.json()["access_token"]

    res = client.get("/api/datasets", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    datasets = res.json()
    assert len(datasets) > 0
    assert datasets[0]["name"] is not None

def test_api_chat_flow():
    auth_res = client.post("/api/auth/demo")
    token = auth_res.json()["access_token"]

    # Get sample dataset id
    ds_res = client.get("/api/datasets", headers={"Authorization": f"Bearer {token}"})
    dataset_id = ds_res.json()[0]["id"]

    chat_payload = {
        "dataset_id": dataset_id,
        "message": "Which region generated the highest revenue?"
    }
    chat_res = client.post("/api/chat", json=chat_payload, headers={"Authorization": f"Bearer {token}"})
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert "answer" in data
    assert "sql_query" in data
    assert "key_findings" in data
    assert "visualization" in data
