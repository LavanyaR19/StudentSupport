import os
SECRET = os.getenv("JWT_SECRET", "student-support-demo-secret-change-me")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")
