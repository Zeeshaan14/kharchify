from app.defaults import DEFAULT_CATEGORIES


def test_list_returns_defaults_sorted(client, auth_headers):
    res = client.get("/categories", headers=auth_headers)
    assert res.status_code == 200
    names = [c["name"] for c in res.json()]
    assert names == sorted(name for name, _, _ in DEFAULT_CATEGORIES)


def test_create_category(client, auth_headers):
    res = client.post("/categories", json={"name": "  Pets ", "icon": "🐶", "color": "#AABBCC"}, headers=auth_headers)
    assert res.status_code == 201
    assert res.json()["name"] == "Pets"
    assert res.json()["is_archived"] is False


def test_create_duplicate_name_is_case_insensitive(client, auth_headers):
    res = client.post("/categories", json={"name": "food"}, headers=auth_headers)
    assert res.status_code == 409


def test_bad_color_rejected(client, auth_headers):
    res = client.post("/categories", json={"name": "Pets", "color": "red"}, headers=auth_headers)
    assert res.status_code == 422


def test_rename_to_existing_name_conflicts(client, auth_headers, food_id):
    res = client.patch(f"/categories/{food_id}", json={"name": "Groceries"}, headers=auth_headers)
    assert res.status_code == 409


def test_rename_same_name_different_case_allowed(client, auth_headers, food_id):
    res = client.patch(f"/categories/{food_id}", json={"name": "FOOD"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["name"] == "FOOD"


def test_archive_hides_from_default_list(client, auth_headers, food_id):
    res = client.patch(f"/categories/{food_id}", json={"is_archived": True}, headers=auth_headers)
    assert res.json()["is_archived"] is True

    active = client.get("/categories", headers=auth_headers).json()
    everything = client.get("/categories?include_archived=true", headers=auth_headers).json()
    assert food_id not in [c["id"] for c in active]
    assert food_id in [c["id"] for c in everything]


def test_cannot_touch_another_users_category(client, auth_headers, other_headers, food_id):
    res = client.patch(f"/categories/{food_id}", json={"name": "Mine now"}, headers=other_headers)
    assert res.status_code == 404


def test_requires_login(client):
    assert client.get("/categories").status_code == 401
