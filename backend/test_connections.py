"""
Run this to verify all Day 1 connections are working.
Usage: python test_connections.py
"""
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings

settings = get_settings()

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def ok(msg): print(f"{GREEN}✓ {msg}{RESET}")
def fail(msg): print(f"{RED}✗ {msg}{RESET}")
def warn(msg): print(f"{YELLOW}⚠ {msg}{RESET}")


async def test_mongodb():
    print("\n[1/3] Testing MongoDB connection...")
    try:
        client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
        await client.admin.command("ping")
        ok("MongoDB Atlas connected")

        db = client[settings.mongodb_db_name]
        collections = await db.list_collection_names()
        ok(f"Database '{settings.mongodb_db_name}' accessible")

        expected = ["users", "health_logs", "plans", "agent_decisions", "forecasts", "gamification"]
        for col in expected:
            if col in collections:
                ok(f"  Collection '{col}' exists")
            else:
                warn(f"  Collection '{col}' missing — create it in Atlas UI")

        # Test write + delete
        test_doc = {"_test": True, "msg": "day1 connection test"}
        result = await db.users.insert_one(test_doc)
        await db.users.delete_one({"_id": result.inserted_id})
        ok("MongoDB write + delete test passed")

        client.close()
        return True
    except Exception as e:
        fail(f"MongoDB failed: {e}")
        return False


def test_google_cloud():
    print("\n[2/3] Testing Google Cloud setup...")
    try:
        import google.auth
        credentials, project = google.auth.default()
        ok("Google Cloud credentials found")
        if project == settings.google_cloud_project:
            ok(f"Project matches: {project}")
        else:
            warn(f"Project mismatch: credentials={project}, .env={settings.google_cloud_project}")
        return True
    except Exception as e:
        fail(f"Google Cloud auth failed: {e}")
        warn("  Run: gcloud auth application-default login")
        return False


async def test_gemini():
    print("\n[3/3] Testing Gemini API access...")
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel
        vertexai.init(
            project=settings.google_cloud_project,
            location=settings.google_cloud_region
        )
        model = GenerativeModel(settings.gemini_model)
        response = model.generate_content(
            "Say exactly: 'HealthOS Day 1 test passed' and nothing else."
        )
        ok(f"Gemini response: {response.text.strip()}")
        return True
    except Exception as e:
        fail(f"Gemini failed: {e}")
        warn("  Check: gcloud services enable aiplatform.googleapis.com")
        return False


async def main():
    print("=" * 50)
    print("  Adaptive HealthOS — Day 1 Connection Tests")
    print("=" * 50)

    results = []
    results.append(await test_mongodb())
    results.append(test_google_cloud())
    results.append(await test_gemini())

    print("\n" + "=" * 50)
    passed = sum(results)
    total = len(results)
    if passed == total:
        ok(f"ALL {total}/{total} TESTS PASSED — Day 1 complete!")
    else:
        fail(f"{passed}/{total} tests passed — fix failures above before Day 2")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
