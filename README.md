# Student Support & Ticket Management System

Full-stack Student Support & Ticket Management System for Assignment 4.

## Stack
- React + Vite frontend
- Flask REST API
- PostgreSQL database
- JWT authentication

## Features
- Student, Staff, and Admin roles
- Ticket creation, assignment, priority and status management
- SLA and ageing indicators
- Replies and activity history
- Staff dashboard and overdue visibility

## Demo accounts
- Student: `student@demo.com` / `student123`
- Staff: `staff@demo.com` / `staff123`
- Admin: `admin@demo.com` / `admin123`

## Render deployment
Render supports Flask web services and React static sites. Deploy the backend as a Python Web Service and the frontend as a Static Site.

### Backend
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app`
- Environment variables:
  - `DATABASE_URL` = Render Postgres internal URL
  - `JWT_SECRET` = long random secret
  - `FRONTEND_ORIGIN` = frontend Render URL
  - `PGSSLMODE` = `require`

### Database
Run `database/schema.sql` against the Render Postgres database, then run `backend/seed.py` once to create demo users.

### Frontend
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment variable: `VITE_API_URL=https://YOUR-BACKEND.onrender.com/api`

### Local development
Backend:
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Frontend:
```bash
cd frontend
npm install
npm run dev
```
