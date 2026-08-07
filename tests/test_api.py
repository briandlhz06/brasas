import pytest
from fastapi.testclient import TestClient


class FakeRedis:
    def __init__(self):
        self.store: dict[str, str] = {}

    def ping(self):
        return True

    def setex(self, key: str, ttl: int, value: str):
        self.store[key] = value

    def getdel(self, key: str) -> str | None:
        return self.store.pop(key, None)


@pytest.fixture()
def client(monkeypatch):
    import app.main as main

    fake = FakeRedis()
    monkeypatch.setattr(main, "_redis", fake)
    monkeypatch.setattr(main, "get_redis", lambda: fake)
    return TestClient(main.app), fake


def test_health(client):
    c, _ = client
    r = c.get("/api/health")
    assert r.status_code == 200
    assert r.json()["redis"] is True


def test_create_and_burn(client):
    c, fake = client
    body = {
        "ciphertext": "dGVzdA",
        "iv": "AQIDBAUGBwgJCgsM",
        "ttl": 3600,
    }
    created = c.post("/api/secrets", json=body)
    assert created.status_code == 200
    secret_id = created.json()["id"]
    assert f"brasas:{secret_id}" in fake.store

    first = c.get(f"/api/secrets/{secret_id}")
    assert first.status_code == 200
    assert first.json()["ciphertext"] == body["ciphertext"]
    assert first.json()["iv"] == body["iv"]

    second = c.get(f"/api/secrets/{secret_id}")
    assert second.status_code == 404


def test_bad_ttl(client):
    c, _ = client
    r = c.post(
        "/api/secrets",
        json={"ciphertext": "aa", "iv": "bb", "ttl": 999},
    )
    assert r.status_code == 400
