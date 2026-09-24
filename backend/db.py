import pyodbc
from config import connection_string

def get_db():
    return pyodbc.connect(connection_string())

def rows(cursor):
    columns = [c[0] for c in cursor.description] if cursor.description else []
    return [dict(zip(columns, row)) for row in cursor.fetchall()]
