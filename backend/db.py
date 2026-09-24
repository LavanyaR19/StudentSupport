import os
import psycopg2


def get_db():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url, sslmode=os.getenv("PGSSLMODE", "require"))
    return psycopg2.connect(host=os.getenv("PGHOST", "localhost"), port=int(os.getenv("PGPORT", "5432")), dbname=os.getenv("PGDATABASE", "StudentSupportDB"), user=os.getenv("PGUSER", "postgres"), password=os.getenv("PGPASSWORD", ""), sslmode=os.getenv("PGSSLMODE", "prefer"))

def rows(cursor):
    columns = [c.name for c in cursor.description] if cursor.description else []
    return [dict(zip(columns, row)) for row in cursor.fetchall()]
