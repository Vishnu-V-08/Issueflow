"""
IssueFlow Supabase PostgreSQL Connectivity Test Script
Run from backend folder:
    python test_connection.py
"""
import sys
from sqlalchemy import text, inspect
from app.core.config import settings
from app.database.connection import engine, check_db_connection, get_normalized_database_url


def main():
    raw_url = settings.DATABASE_URL.strip() if settings.DATABASE_URL else ""

    print("=" * 70)
    print("IssueFlow - Supabase PostgreSQL Connectivity Diagnostic")
    print("=" * 70)

    # 1. Check for missing or placeholder URL
    if not raw_url:
        print("\n[CONFIG ERROR] DATABASE_URL is not set in backend/.env!")
        print("Please configure your Supabase connection string in backend/.env.")
        print("=" * 70)
        sys.exit(1)

    # 2. Check if user pasted the REST / Web URL instead of the DB URI
    if raw_url.startswith("https://") or raw_url.startswith("http://"):
        print(f"\n[CONFIG NOTICE] Your DATABASE_URL is currently set to a Web URL:")
        print(f"  {raw_url}")
        print("\nThis is your Supabase Project REST API URL, NOT the database connection string.")
        print("\nTo connect SQLAlchemy and Alembic directly to Supabase PostgreSQL:")
        print("  1. Go to https://supabase.com/dashboard")
        print("  2. Select your project: ymsjcqvoftwfgfregvpm")
        print("  3. Click 'Project Settings' (the gear icon on the left navigation)")
        print("  4. Click 'Database'")
        print("  5. Scroll down to 'Connection string'")
        print("  6. Click the 'URI' tab")
        print("  7. Select 'Session Pooler' (port 5432 - recommended for IPv4)")
        print("  8. Copy the URI string, which looks like:")
        print("     postgresql://postgres.ymsjcqvoftwfgfregvpm:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres")
        print("  9. Replace [YOUR-PASSWORD] with your actual Supabase database password.")
        print(" 10. Paste it into backend/.env as DATABASE_URL.")
        print("=" * 70)
        sys.exit(1)

    # Mask password for display
    display_url = raw_url
    if "@" in raw_url:
        protocol_user, host_part = raw_url.split("@", 1)
        if ":" in protocol_user:
            prefix, _ = protocol_user.rsplit(":", 1)
            display_url = f"{prefix}:****@{host_part}"

    print(f"Connection Target: {display_url}")
    print("Testing connection to Supabase PostgreSQL...")

    status = check_db_connection()
    if not status["connected"]:
        print(f"\n[CONNECTION FAILED]")
        print(f"Error details: {status.get('error')}")
        print("\nTroubleshooting tips:")
        print("  - Did you replace [YOUR-PASSWORD] with your real database password?")
        print("  - If your password contains special characters like '@', '#', or '%', URL-encode them.")
        print("  - Verify that your network/firewall allows outgoing connections on port 5432.")
        print("=" * 70)
        sys.exit(1)

    print("\n[SUCCESS] Successfully connected to Supabase PostgreSQL!")
    print(f"Server: {status.get('version')}")

    # Inspect tables in the database
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"\nExisting Database Tables ({len(tables)}):")
    if tables:
        for t in sorted(tables):
            cols = [c["name"] for c in inspector.get_columns(t)]
            print(f"  - {t:<18} ({len(cols)} columns: {', '.join(cols[:4])}...)")
    else:
        print("  (Database currently has 0 application tables.)")
        print("  -> Run 'alembic upgrade head' to apply the initial schema migration!")

    print("=" * 70)


if __name__ == "__main__":
    main()
