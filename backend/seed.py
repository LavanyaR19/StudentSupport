from werkzeug.security import generate_password_hash
from db import get_db


users = [
    ("Student Demo", "student@demo.com", generate_password_hash("student123"), "STUDENT"),
    ("Support Staff", "staff@demo.com", generate_password_hash("staff123"), "STAFF"),
    ("System Admin", "admin@demo.com", generate_password_hash("admin123"), "ADMIN"),
]

conn = get_db()
cur = conn.cursor()

for name, email, password_hash, role in users:
    cur.execute(
        """
        UPDATE users
        SET name = ?, password_hash = ?, role = ?
        WHERE email = ?
        """,
        (name, password_hash, role, email)
    )

conn.commit()
conn.close()

print("Demo user passwords updated successfully.")
print("student@demo.com / student123")
print("staff@demo.com / staff123")
print("admin@demo.com / admin123")