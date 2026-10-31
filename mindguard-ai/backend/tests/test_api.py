"""API endpoints, error handling and the frontend contract."""

from __future__ import annotations

import json
from pathlib import Path

CONTRACT = json.loads((Path(__file__).parent / "fixtures" / "frontend_contract.json").read_text())


def missing_keys(expected, actual, path=""):
    """Keys the frontend reads (from the mock backend) that the API does not return."""
    out = []
    if isinstance(expected, dict):
        if not isinstance(actual, dict):
            return [f"{path} (not an object)"]
        for k, v in expected.items():
            if k not in actual:
                out.append(f"{path}.{k}")
            elif v is not None and actual[k] is not None:
                out += missing_keys(v, actual[k], f"{path}.{k}")
    elif isinstance(expected, list) and expected and isinstance(actual, list) and actual:
        out += missing_keys(expected[0], actual[0], f"{path}[]")
    return out


def data(resp):
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert set(body) == {"data", "meta"}
    return body["data"]


def an_employee(client, level=None):
    rows = data(client.get("/employees", params={"level": level} if level else None))
    return rows[0]["id"]


def test_health(client):
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["database"]["employees"] == 40
    assert body["model"]["available"] is True


def test_employee_listing_pagination_search_filters(client):
    rows = data(client.get("/employees"))
    assert len(rows) == 40
    page = client.get("/employees", params={"page": 2, "page_size": 15}).json()
    assert len(page["data"]) == 15 and page["meta"]["pagination"] == {"page": 2, "pageSize": 15, "total": 40, "pages": 3}
    eng = data(client.get("/employees", params={"department": "Engineering"}))
    assert eng and all(e["department"] == "Engineering" for e in eng)
    target = rows[3]
    found = data(client.get("/employees", params={"search": target["name"].split()[1].lower()}))
    assert target["id"] in [e["id"] for e in found]
    assert client.get("/employees", params={"level": "nope"}).status_code == 422
    assert client.get("/employees", params={"page_size": 0}).status_code == 422


def test_employee_detail_and_invalid_id(client):
    emp_id = an_employee(client)
    d = data(client.get(f"/employees/{emp_id}"))
    assert d["id"] == emp_id and len(d["factors"]) == 5 and d["recommendations"]
    r = client.get("/employees/XX-0000")
    assert r.status_code == 404 and "not found" in r.json()["detail"]


def test_employee_history_and_date_filters(client):
    emp_id = an_employee(client)
    h = data(client.get(f"/employees/{emp_id}/history"))
    assert len(h["daily"]) == 30 and h["weekly"]
    end = h["range"]["end"]
    start = h["daily"][-5]["date"]
    short = data(client.get(f"/employees/{emp_id}/history", params={"start": start, "end": end}))
    assert [d["date"] for d in short["daily"]] == [d["date"] for d in h["daily"][-5:]]
    assert client.get(f"/employees/{emp_id}/history", params={"start": end, "end": start}).status_code == 400
    assert client.get(f"/employees/{emp_id}/history", params={"start": "31-12-2026"}).status_code == 422
    assert client.get("/employees/XX-0000/history").status_code == 404


def test_overview(client):
    o = data(client.get("/analytics/overview"))
    k = o["kpis"]
    assert k["totalEmployees"] == 40
    assert sum(d["count"] for d in o["distribution"]) == 40
    assert len(o["weeklyHours"]) == 8 and len(o["departments"]) == 6
    assert all(c["indicator"]["level"] in ("moderate", "elevated") for c in o["checkIns"])


def test_trends_calculation_matches_raw_records(client, engine):
    t = data(client.get("/analytics/trends", params={"range": 7}))
    assert t["range"] == 7 and len(t["daily"]) + len(t["weekend"]) == 7
    first = t["daily"][0]
    workers = [tl.by_date[first["date"]] for tl in engine.timelines.values() if first["date"] in tl.by_date]
    hours = [r["working_hours"] for r in workers if r["working_hours"]]
    assert first["hours"] == round(sum(hours) / len(hours), 2)
    t30 = data(client.get("/analytics/trends"))
    assert t30["range"] == 30
    assert client.get("/analytics/trends", params={"range": 14}).status_code == 422


def test_insights_and_departments(client):
    items = data(client.get("/analytics/insights"))
    assert items
    elevated = data(client.get("/analytics/insights", params={"severity": "elevated"}))
    assert all(i["severity"] == "elevated" for i in elevated)
    assert client.get("/analytics/insights", params={"type": "bad"}).status_code == 422
    depts = data(client.get("/analytics/departments"))
    assert sum(d["headcount"] for d in depts) == 40


def test_forecast_endpoints(client):
    f = data(client.get("/analytics/forecast"))
    assert len(f["days"]) == 7 and f["model"]["backtest"]["samples"] > 0
    emp_id = an_employee(client)
    ef = data(client.get(f"/employees/{emp_id}/forecast"))
    assert len(ef["days"]) == 7


def test_analyze_saves_assessment(client):
    emp_id = an_employee(client, "elevated")
    result = data(client.post(f"/analyze/{emp_id}"))
    assert result["status"] == "completed"
    assert result["indicator_level"] == "Elevated"
    assert result["anomaly_detected"] in (True, False)
    assert isinstance(result["anomaly_score"], float)
    assert result["recommendations"] and result["assessment_id"]
    saved = data(client.get(f"/assessments/{emp_id}"))
    assert saved[0]["id"] == result["assessment_id"]
    assert saved[0]["indicator_score"] == result["indicator_score"]
    assert client.post("/analyze/XX-0000").status_code == 404


def test_analyze_insufficient_data(client, engine):
    short = [e["employee_id"] for e in engine.employees if engine.features(e["employee_id"])["data_sufficiency"] != "sufficient"]
    assert short, "the generator adds recent joiners for histories of 45+ days"
    result = data(client.post(f"/analyze/{short[0]}"))
    assert result["status"] == "insufficient_data"
    assert result["indicator_score"] is None
    assert result["recommendations"][0]["key"] == "data"


def test_simulation_endpoint(client):
    before = len(data(client.get(f"/assessments/{an_employee(client)}")))
    snake = data(client.post("/simulate", json={"working_hours": 10.5, "break_count": 1, "night_sessions": 4, "weekend_days": 3, "productivity_change": -15}))
    assert snake["indicator_score"] == 100 and snake["indicator_level"] == "Elevated" and snake["is_simulation"] is True
    assert snake["recommendations"] and snake["contributing_factors"]
    camel = data(client.post("/simulate", json={"avgWorkingHours": 8, "dailyBreaks": 3, "lateNightSessions": 0, "weekendDays": 0, "productivityChange": 0}))
    assert camel["score"] == 0 and camel["level"] == "low" and camel["inputs"]["avgWorkingHours"] == 8
    assert data(client.post("/simulate", json={}))["score"] == 0
    assert client.post("/simulate", json={"working_hours": 40}).status_code == 422
    assert client.post("/simulate", json={"unknown": 1}).status_code == 422
    after = len(data(client.get(f"/assessments/{an_employee(client)}")))
    assert before == after  # simulations are never stored


def test_frontend_contract(client):
    """Every field the React pages read from the mock backend is present in the API."""
    calls = {
        "overview": "/analytics/overview",
        "employees": "/employees",
        "insights": "/analytics/insights",
        "trends": "/analytics/trends?range=7",
        "forecast": "/analytics/forecast",
    }
    emp_id = an_employee(client, "elevated")
    calls.update({"employee": f"/employees/{emp_id}", "history": f"/employees/{emp_id}/history", "employeeForecast": f"/employees/{emp_id}/forecast"})
    for key, url in calls.items():
        assert missing_keys(CONTRACT[key], data(client.get(url))) == [], key
    sim = data(client.post("/simulate", json={"avgWorkingHours": 10}))
    assert missing_keys(CONTRACT["simulate"], sim) == []
    assert missing_keys(CONTRACT["meta"], client.get("/analytics/overview").json()["meta"]) == []


def test_cors_for_vite_dev_server(client):
    r = client.options("/employees", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
