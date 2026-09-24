# Student Support & Ticket Management System

## Stack
- React + Vite
- Flask REST API
- SQL Server
- PyODBC
- JWT authentication

## Features
- Student ticket creation
- Ticket status and priority
- Staff/admin assignment
- Replies/conversation
- Activity history
- Dashboard counts
- 48-hour overdue indicator
- Role-based API access

## Run

### 1. Database
Open SQL Server Management Studio and run `database/schema.sql`.

### 2. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Set database variables if needed:
```bash
set DB_SERVER=localhost
set DB_NAME=StudentSupportDB
```

For Windows Authentication, leave DB_USER and DB_PASSWORD empty.

Then:
```bash
python seed.py
python app.py
```

### 3. Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally http://localhost:5173.

## Demo accounts
- Student: student@demo.com / student123
- Staff: staff@demo.com / staff123
- Admin: admin@demo.com / admin123

## Important
For a real deployment, move the JWT secret and database credentials to secure environment variables and enable HTTPS.
