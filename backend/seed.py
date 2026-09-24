from db import get_db
from werkzeug.security import generate_password_hash

users = [("Student Demo", "student@demo.com", "student123", "STUDENT"), ("Support Staff", "staff@demo.com", "staff123", "STAFF"), ("System Admin", "admin@demo.com", "admin123", "ADMIN")]

db = get_db()
cur = db.cursor()
for name, email, password, role in users:
    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
    if not cur.fetchone():
        cur.execute("INSERT INTO users(name,email,password_hash,role) VALUES(%s,%s,%s,%s)", (name, email, generate_password_hash(password), role))
db.commit()
db.close()
print("Demo users created.")
print("student@demo.com / student123")
print("staff@demo.com / staff123")
print("admin@demo.com / admin123")
