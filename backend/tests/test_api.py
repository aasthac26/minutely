import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.seed import seed

SAMPLE = (
    "[00:00:05] Aastha: Let's kick off, we need to finalize the launch plan.\n"
    "[00:00:25] Rahul: I'll update the pricing page by Friday.\n"
    "[00:00:48] Meera: Can you share the analytics dashboard link with Rahul?\n"
)


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)
    with TestSession() as db:
        seed(db)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_list_meetings_seeded(client):
    assert len(client.get("/meetings").json()) == 6


def test_paste_meeting(client):
    r = client.post("/meetings/paste", json={"title": "Paste test", "transcript_text": SAMPLE})
    assert r.status_code == 201
    assert r.json()["title"] == "Paste test"


def test_upload_txt(client):
    r = client.post(
        "/meetings/upload", data={"title": "Upload test"},
        files={"file": ("sample.txt", SAMPLE, "text/plain")},
    )
    assert r.status_code == 201


def test_search(client):
    hits = client.get("/search", params={"q": "pricing"}).json()
    assert hits and all("pricing" in h["snippet"].lower() for h in hits)


def test_search_requires_min_length(client):
    assert client.get("/search", params={"q": "a"}).status_code == 422


def test_action_item_lifecycle(client):
    r = client.patch("/action-items/1", json={"is_done": True})
    assert r.status_code == 200 and r.json()["is_done"] is True

    r = client.post("/meetings/1/action-items", json={"text": "Review budget", "assignee": "Karan"})
    assert r.status_code == 201
    new_id = r.json()["id"]
    assert r.json()["assignee"]["name"] == "Karan"

    assert client.delete(f"/action-items/{new_id}").status_code == 204
    assert client.patch(f"/action-items/{new_id}", json={"is_done": True}).status_code == 404


def test_export_formats(client):
    md = client.get("/meetings/1/export", params={"format": "md"})
    assert md.status_code == 200 and md.text.startswith("# ")
    assert "attachment" in md.headers["content-disposition"]

    js = client.get("/meetings/1/export", params={"format": "json"}).json()
    assert js["transcript"] and js["participants"]

    csv_text = client.get("/export/action-items").text
    assert csv_text.startswith("id,meeting,action_item")


def test_export_404(client):
    assert client.get("/meetings/9999/export").status_code == 404


def test_meeting_analytics(client):
    data = client.get("/meetings/1/analytics").json()
    assert data["speakers"]
    assert abs(sum(s["share_pct"] for s in data["speakers"]) - 100) < 1


def test_overview(client):
    data = client.get("/analytics/overview").json()
    assert data["meetings"] == 6 and data["top_speakers"]


def test_ask_search(client):
    r = client.post("/meetings/3/ask", json={"question": "What did Arjun say about security?"})
    assert r.status_code == 200
    body = r.json()
    assert body["intent"] == "search" and "SOC 2" in body["answer"]


def test_ask_action_items(client):
    body = client.post("/meetings/1/ask", json={"question": "What are the action items?"}).json()
    assert body["intent"] == "action_items" and body["answer"]


def test_comments_lifecycle(client):
    r = client.post("/meetings/1/comments", json={"body": "Great point here"})
    assert r.status_code == 201
    cid = r.json()["id"]
    assert len(client.get("/meetings/1/comments").json()) == 1
    assert client.delete(f"/comments/{cid}").status_code == 204
    assert client.get("/meetings/1/comments").json() == []


def test_soundbites_generate_and_list(client):
    r = client.post("/meetings/1/soundbites/generate", params={"top_n": 3})
    assert r.status_code == 201
    created = r.json()
    assert 1 <= len(created) <= 3
    assert all(sb["end_sec"] >= sb["start_sec"] for sb in created)
    assert len(client.get("/meetings/1/soundbites").json()) == len(created)

    # regenerate replaces, does not duplicate
    client.post("/meetings/1/soundbites/generate", params={"top_n": 3})
    assert len(client.get("/meetings/1/soundbites").json()) == len(created)


def test_soundbite_delete(client):
    sb = client.post("/meetings/1/soundbites/generate").json()[0]
    assert client.delete(f"/soundbites/{sb['id']}").status_code == 204
    assert client.delete(f"/soundbites/{sb['id']}").status_code == 404

def test_meeting_patch_and_cascade_delete(client):
    r = client.patch("/meetings/1", json={"title": "Renamed", "tags": ["x"]})
    assert r.status_code == 200 and r.json()["title"] == "Renamed"
    assert client.delete("/meetings/1").status_code == 204
    assert client.get("/meetings/1").status_code == 404
    assert client.get("/meetings/1/comments").status_code == 404