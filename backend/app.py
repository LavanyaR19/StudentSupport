from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import check_password_hash
from functools import wraps
import jwt
import datetime
from config import SECRET, FRONTEND_ORIGIN
from db import get_db, rows

app = Flask(__name__)
CORS(app, origins=FRONTEND_ORIGIN)

def token_for(user):
    payload={"user_id":user["id"],"name":user["name"],"role":user["role"],"exp":datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(hours=8)}
    return jwt.encode(payload, SECRET, algorithm="HS256")

def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header=request.headers.get("Authorization","")
        if not header.startswith("Bearer "): return jsonify({"error":"Authentication required"}),401
        try: request.user=jwt.decode(header.split(" ",1)[1],SECRET,algorithms=["HS256"])
        except jwt.ExpiredSignatureError: return jsonify({"error":"Token expired"}),401
        except jwt.InvalidTokenError: return jsonify({"error":"Invalid token"}),401
        return fn(*args,**kwargs)
    return wrapper

def roles(*allowed):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args,**kwargs):
            if request.user["role"] not in allowed: return jsonify({"error":"Permission denied"}),403
            return fn(*args,**kwargs)
        return wrapper
    return decorator

def iso_items(items):
    for item in items:
        for key,value in list(item.items()):
            if hasattr(value,"isoformat"): item[key]=value.isoformat()
    return items

@app.get("/api/health")
def health(): return jsonify({"status":"ok"})

@app.post("/api/login")
def login():
    data=request.get_json() or {}; email=data.get("email","").strip(); password=data.get("password","")
    if not email or not password: return jsonify({"error":"Email and password are required"}),400
    db=get_db(); cur=db.cursor(); cur.execute("SELECT id,name,email,password_hash,role FROM users WHERE email=%s",(email,)); user=rows(cur); db.close()
    if not user or not check_password_hash(user[0]["password_hash"],password): return jsonify({"error":"Invalid email or password"}),401
    u=user[0]
    return jsonify({"token":token_for(u),"user":{"id":u["id"],"name":u["name"],"email":u["email"],"role":u["role"]}})

@app.get("/api/tickets")
@auth_required
def list_tickets():
    db=get_db(); cur=db.cursor(); base="SELECT t.*, u.name AS student_name, a.name AS assigned_to FROM tickets t JOIN users u ON u.id=t.student_id LEFT JOIN users a ON a.id=t.assigned_to"
    if request.user["role"]=="STUDENT": cur.execute(base+" WHERE t.student_id=%s ORDER BY t.created_at DESC",(request.user["user_id"],))
    elif request.args.get("mine")=="true" and request.user["role"]=="STAFF": cur.execute(base+" WHERE t.assigned_to=%s ORDER BY t.created_at DESC",(request.user["user_id"],))
    else: cur.execute(base+" ORDER BY t.created_at DESC")
    data=iso_items(rows(cur)); db.close(); return jsonify(data)

@app.post("/api/tickets")
@auth_required
@roles("STUDENT")
def create_ticket():
    data=request.get_json() or {}; category=data.get("category","").strip(); subject=data.get("subject","").strip(); description=data.get("description","").strip(); priority=data.get("priority","MEDIUM").upper()
    if not category or not subject or not description: return jsonify({"error":"Category, subject and description are required"}),400
    if priority not in ("LOW","MEDIUM","HIGH","URGENT"): return jsonify({"error":"Invalid priority"}),400
    db=get_db(); cur=db.cursor(); cur.execute("INSERT INTO tickets(student_id,category,subject,description,priority,status) VALUES(%s,%s,%s,%s,%s,'OPEN') RETURNING id",(request.user["user_id"],category,subject,description,priority)); ticket_id=cur.fetchone()[0]
    cur.execute("INSERT INTO ticket_activity(ticket_id,user_id,action,details) VALUES(%s,%s,%s,%s)",(ticket_id,request.user["user_id"],"CREATED","Ticket created")); db.commit(); db.close(); return jsonify({"message":"Ticket created","ticket_id":ticket_id}),201

@app.get("/api/tickets/<int:ticket_id>")
@auth_required
def get_ticket(ticket_id):
    db=get_db(); cur=db.cursor(); cur.execute("SELECT t.*, u.name AS student_name, u.email AS student_email, a.name AS assigned_to FROM tickets t JOIN users u ON u.id=t.student_id LEFT JOIN users a ON a.id=t.assigned_to WHERE t.id=%s",(ticket_id,)); result=rows(cur)
    if not result: db.close(); return jsonify({"error":"Ticket not found"}),404
    t=result[0]
    if request.user["role"]=="STUDENT" and t["student_id"]!=request.user["user_id"]: db.close(); return jsonify({"error":"Permission denied"}),403
    cur.execute("SELECT ta.*, u.name AS user_name FROM ticket_activity ta JOIN users u ON u.id=ta.user_id WHERE ta.ticket_id=%s ORDER BY ta.created_at",(ticket_id,)); activity=rows(cur)
    cur.execute("SELECT r.*, u.name AS user_name FROM ticket_replies r JOIN users u ON u.id=r.user_id WHERE r.ticket_id=%s ORDER BY r.created_at",(ticket_id,)); replies=rows(cur); db.close(); iso_items([t]); iso_items(activity); iso_items(replies)
    return jsonify({"ticket":t,"activity":activity,"replies":replies})

@app.post("/api/tickets/<int:ticket_id>/reply")
@auth_required
def reply(ticket_id):
    data=request.get_json() or {}; message=data.get("message","").strip()
    if not message: return jsonify({"error":"Message is required"}),400
    db=get_db(); cur=db.cursor(); cur.execute("SELECT student_id,status FROM tickets WHERE id=%s",(ticket_id,)); t=cur.fetchone()
    if not t: db.close(); return jsonify({"error":"Ticket not found"}),404
    if request.user["role"]=="STUDENT" and t[0]!=request.user["user_id"]: db.close(); return jsonify({"error":"Permission denied"}),403
    cur.execute("INSERT INTO ticket_replies(ticket_id,user_id,message) VALUES(%s,%s,%s)",(ticket_id,request.user["user_id"],message)); cur.execute("INSERT INTO ticket_activity(ticket_id,user_id,action,details) VALUES(%s,%s,%s,%s)",(ticket_id,request.user["user_id"],"REPLIED",message[:500])); db.commit(); db.close(); return jsonify({"message":"Reply added"})

@app.patch("/api/tickets/<int:ticket_id>")
@auth_required
@roles("STAFF","ADMIN")
def update_ticket(ticket_id):
    data=request.get_json() or {}; allowed_status={"OPEN","ASSIGNED","IN_PROGRESS","PENDING","RESOLVED","CLOSED"}; allowed_priority={"LOW","MEDIUM","HIGH","URGENT"}
    db=get_db(); cur=db.cursor(); cur.execute("SELECT id,status,priority,assigned_to FROM tickets WHERE id=%s",(ticket_id,)); old=cur.fetchone()
    if not old: db.close(); return jsonify({"error":"Ticket not found"}),404
    fields=[]; values=[]; changes=[]; new_status=None
    if "status" in data:
        status=str(data["status"]).upper()
        if status not in allowed_status: db.close(); return jsonify({"error":"Invalid status"}),400
        fields.append("status=%s"); values.append(status); new_status=status; changes.append(f"Status changed to {status}")
    if "priority" in data:
        priority=str(data["priority"]).upper()
        if priority not in allowed_priority: db.close(); return jsonify({"error":"Invalid priority"}),400
        fields.append("priority=%s"); values.append(priority); changes.append(f"Priority changed to {priority}")
    if "assigned_to" in data:
        assigned=data["assigned_to"]
        if assigned is not None:
            cur.execute("SELECT id FROM users WHERE id=%s AND role IN ('STAFF','ADMIN')",(assigned,))
            if not cur.fetchone(): db.close(); return jsonify({"error":"Invalid staff user"}),400
        fields.append("assigned_to=%s"); values.append(assigned); changes.append("Ticket assignment updated")
    if not fields: db.close(); return jsonify({"error":"No changes supplied"}),400
    fields.append("updated_at=NOW()")
    if new_status=="RESOLVED": fields.append("resolved_at=NOW()")
    elif new_status and new_status not in ("RESOLVED","CLOSED"): fields.append("resolved_at=NULL")
    values.append(ticket_id); cur.execute(f"UPDATE tickets SET {', '.join(fields)} WHERE id=%s",values)
    for change in changes: cur.execute("INSERT INTO ticket_activity(ticket_id,user_id,action,details) VALUES(%s,%s,%s,%s)",(ticket_id,request.user["user_id"],"UPDATED",change))
    db.commit(); db.close(); return jsonify({"message":"Ticket updated"})

@app.get("/api/users/staff")
@auth_required
@roles("STAFF","ADMIN")
def staff_users():
    db=get_db(); cur=db.cursor(); cur.execute("SELECT id,name,email,role FROM users WHERE role IN ('STAFF','ADMIN') ORDER BY name"); result=rows(cur); db.close(); return jsonify(result)

@app.get("/api/dashboard")
@auth_required
@roles("STAFF","ADMIN")
def dashboard():
    db=get_db(); cur=db.cursor(); cur.execute("SELECT COUNT(*) AS total, SUM(CASE WHEN status='OPEN' THEN 1 ELSE 0 END) AS open_count, SUM(CASE WHEN status='IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress, SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status='RESOLVED' THEN 1 ELSE 0 END) AS resolved, SUM(CASE WHEN status='CLOSED' THEN 1 ELSE 0 END) AS closed, SUM(CASE WHEN EXTRACT(EPOCH FROM (NOW()-created_at))/3600 > 48 AND status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS overdue FROM tickets"); result=rows(cur)[0]
    cur.execute("SELECT category, COUNT(*) AS count FROM tickets GROUP BY category ORDER BY count DESC"); categories=rows(cur); db.close(); return jsonify({"summary":result,"by_category":categories})

@app.errorhandler(Exception)
def handle_error(e):
    app.logger.exception(e); return jsonify({"error":"Server error","details":str(e)}),500

if __name__=="__main__": app.run(debug=True,port=5000)
