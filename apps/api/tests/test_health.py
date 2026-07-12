from app.main import app, health


def test_health_returns_api_status() -> None:
    assert health() == {
        "status": "ok",
        "service": "resume-agent-api",
    }


def test_health_route_is_registered() -> None:
    health_routes = [
        route
        for route in app.routes
        if getattr(route, "path", None) == "/health"
        and "GET" in getattr(route, "methods", set())
    ]

    assert len(health_routes) == 1
