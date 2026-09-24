import React, {useEffect, useState} from "react";
import {createRoot} from "react-dom/client";
import axios from "axios";
import "./styles.css";

const API=import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const api=axios.create({baseURL:API});
api.interceptors.request.use(c=>{
  const t=localStorage.getItem("token");
  if(t)c.headers.Authorization=`Bearer ${t}`;
  return c;
});

function Login({onLogin}) {
  const [email,setEmail]=useState("student@demo.com");
  const [password,setPassword]=useState("student123");
  const [error,setError]=useState("");
  async function submit(e){
    e.preventDefault(); setError("");
    try{const r=await api.post("/login",{email,password}); localStorage.setItem("token",r.data.token); localStorage.setItem("user",JSON.stringify(r.data.user)); onLogin(r.data.user)}
    catch(e){setError(e.response?.data?.error||"Login failed")}
  }
  return <div className="login"><form onSubmit={submit} className="card">
    <h1>Student Support</h1><p className="muted">Ticket Management System</p>
    <label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)}/>
    <label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)}/>
    {error&&<div className="error">{error}</div>}
    <button>Login</button>
    <div className="demo"><b>Demo accounts</b><br/>Student: student@demo.com / student123<br/>Staff: staff@demo.com / staff123<br/>Admin: admin@demo.com / admin123</div>
  </form></div>
}

function App(){
  const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem("user")||"null"));
  if(!user) return <Login onLogin={setUser}/>;
  return <Dashboard user={user} logout={()=>{localStorage.clear();setUser(null)}}/>
}

function getTicketAge(createdAt){
  if(!createdAt) return 0;
  const created=new Date(createdAt);
  const diff=Math.max(0,new Date()-created);
  return Math.floor(diff/(1000*60*60));
}

function getSlaStatus(ticket){
  if(["RESOLVED","CLOSED"].includes(ticket.status)) return "COMPLETED";
  const age=getTicketAge(ticket.created_at);
  const limits={URGENT:4,HIGH:12,MEDIUM:24,LOW:48};
  return age >= (limits[ticket.priority]||24) ? "OVERDUE" : "WITHIN SLA";
}

function SlaBadge({ticket}){
  const status=getSlaStatus(ticket);
  return <span className={`pill sla ${status.toLowerCase().replace(/ /g,"-")}`}>{status}</span>;
}

function Dashboard({user,logout}){
  const [tickets,setTickets]=useState([]);
  const [summary,setSummary]=useState(null);
  const [showCreate,setShowCreate]=useState(false);
  const [selected,setSelected]=useState(null);
  const [filter,setFilter]=useState("ALL");
  const [message,setMessage]=useState("");

  async function load(){
    const r=await api.get("/tickets");
    setTickets(r.data);
    if(user.role!=="STUDENT"){const d=await api.get("/dashboard");setSummary(d.data.summary)}
  }
  useEffect(()=>{load()},[]);

  const visible=tickets.filter(t=>filter==="ALL"||t.status===filter);

  return <div>
    <header><div><h2>Student Support Portal</h2><small>Welcome, {user.name} ({user.role})</small></div>
      <button className="secondary" onClick={logout}>Logout</button></header>

    <main>
      {summary && <div className="stats">
        <Stat n={summary.total||0} t="Total"/>
        <Stat n={summary.open_count||0} t="Open"/>
        <Stat n={summary.in_progress||0} t="In Progress"/>
        <Stat n={summary.pending||0} t="Pending"/>
        <Stat n={summary.resolved||0} t="Resolved"/>
        <Stat n={summary.overdue||0} t="Overdue"/>
      </div>}

      <div className="toolbar">
        <h3>{user.role==="STUDENT"?"My Tickets":"Ticket Queue"}</h3>
        {user.role==="STUDENT"&&<button onClick={()=>setShowCreate(true)}>+ New Ticket</button>}
        <select value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="ALL">All statuses</option><option>OPEN</option><option>ASSIGNED</option>
          <option>IN_PROGRESS</option><option>PENDING</option><option>RESOLVED</option><option>CLOSED</option>
        </select>
      </div>

      {message&&<div className="success">{message}</div>}

      <div className="tableWrap"><table><thead><tr>
        <th>ID</th><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Student</th><th>Assigned To</th><th>Created</th><th>Age</th><th>SLA</th>
      </tr></thead><tbody>
      {visible.map(t=><tr key={t.id} onClick={()=>setSelected(t)}>
        <td>#{t.id}</td><td><b>{t.subject}</b></td><td>{t.category}</td>
        <td><span className={"pill "+t.priority.toLowerCase()}>{t.priority}</span></td>
        <td><span className={"pill status"}>{t.status}</span></td>
        <td>{t.student_name}</td><td>{t.assigned_to||"Unassigned"}</td>
        <td>{new Date(t.created_at).toLocaleDateString()}</td><td>{getTicketAge(t.created_at)}h</td><td><SlaBadge ticket={t}/></td>
      </tr>)}
      {!visible.length&&<tr><td colSpan="10" className="empty">No tickets found.</td></tr>}
      </tbody></table></div>
    </main>

    {showCreate&&<CreateTicket close={()=>setShowCreate(false)} done={()=>{setShowCreate(false);load();setMessage("Ticket created successfully.")}}/>}
    {selected&&<TicketModal ticket={selected} user={user} close={()=>setSelected(null)} refresh={load} setMessage={setMessage}/>}
  </div>
}

const Stat=({n,t})=><div className="stat"><strong>{n}</strong><span>{t}</span></div>;

function CreateTicket({close,done}){
  const [f,setF]=useState({category:"Attendance",subject:"",description:"",priority:"MEDIUM"});
  const [error,setError]=useState("");
  async function submit(e){
    e.preventDefault();
    try{await api.post("/tickets",f);done()}catch(e){setError(e.response?.data?.error||"Could not create ticket")}
  }
  return <Modal title="Create New Ticket" close={close}><form onSubmit={submit}>
    <label>Category</label><select value={f.category} onChange={e=>setF({...f,category:e.target.value})}>
      <option>Attendance</option><option>Fees</option><option>ID Card</option><option>Certificate</option><option>Documents</option><option>Other</option>
    </select>
    <label>Subject</label><input required value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/>
    <label>Description</label><textarea required rows="5" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
    <label>Priority</label><select value={f.priority} onChange={e=>setF({...f,priority:e.target.value})}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select>
    {error&&<div className="error">{error}</div>}<button>Create Ticket</button>
  </form></Modal>
}

function TicketModal({ticket,user,close,refresh,setMessage}){
  const [data,setData]=useState(null); const [reply,setReply]=useState("");
  const [staff,setStaff]=useState([]); const [error,setError]=useState("");
  async function load(){
    try{
      setError("");
      const r=await api.get("/tickets/"+ticket.id);
      setData(r.data);
      if(user.role!=="STUDENT"){const s=await api.get("/users/staff");setStaff(s.data)}
    }catch(e){console.error(e);setError(e.response?.data?.error||e.response?.data?.details||e.message||"Could not load ticket details.")}
  }
  useEffect(()=>{load()},[ticket.id]);

  async function update(patch){
    try{await api.patch("/tickets/"+ticket.id,patch); await load(); await refresh(); setMessage("Ticket updated.");}
    catch(e){setError(e.response?.data?.error||e.response?.data?.details||"Could not update ticket.")}
  }
  async function sendReply(e){e.preventDefault(); if(!reply.trim())return;
    try{await api.post(`/tickets/${ticket.id}/reply`,{message:reply});setReply("");await load();}
    catch(e){setError(e.response?.data?.error||e.response?.data?.details||"Could not send reply.")}
  }

  if(error)return <Modal title={"Ticket #"+ticket.id} close={close}><div className="error"><b>Could not load ticket.</b><p>{error}</p></div></Modal>;
  if(!data)return <Modal title={"Ticket #"+ticket.id} close={close}><p className="loading">Loading...</p></Modal>;
  return <Modal title={`#${ticket.id} — ${data.ticket.subject}`} close={close}>
    <div className="detail"><p><b>Category:</b> {data.ticket.category}</p>
    <p><b>Priority:</b> {data.ticket.priority} &nbsp; <b>Status:</b> {data.ticket.status}</p>
    <p><b>Student:</b> {data.ticket.student_name} ({data.ticket.student_email})</p>
    <p><b>Assigned:</b> {data.ticket.assigned_to||"Unassigned"}</p>
    <div className="description">{data.ticket.description}</div></div>

    {user.role!=="STUDENT"&&<div className="adminControls">
      <label>Status</label><select value={data.ticket.status} onChange={e=>update({status:e.target.value})}>
        {["OPEN","ASSIGNED","IN_PROGRESS","PENDING","RESOLVED","CLOSED"].map(x=><option key={x}>{x}</option>)}
      </select>
      <label>Priority</label><select value={data.ticket.priority} onChange={e=>update({priority:e.target.value})}>
        {["LOW","MEDIUM","HIGH","URGENT"].map(x=><option key={x}>{x}</option>)}
      </select>
      <label>Assign</label><select value={data.ticket.assigned_to_id||""} onChange={e=>update({assigned_to:e.target.value?Number(e.target.value):null})}>
        <option value="">Unassigned</option>{staff.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
      </select>
    </div>}

    <h4>Conversation</h4>
    <div className="conversation">
      {data.replies.map(r=><div className="reply" key={r.id}><b>{r.user_name}</b><small>{new Date(r.created_at).toLocaleString()}</small><p>{r.message}</p></div>)}
      {!data.replies.length&&<p className="muted">No replies yet.</p>}
    </div>
    <form onSubmit={sendReply}><textarea rows="3" placeholder="Write a reply..." value={reply} onChange={e=>setReply(e.target.value)}/><button>Send Reply</button></form>
    <h4>Activity History</h4>
    <div className="activity">{data.activity.map(a=><div key={a.id}><b>{a.action}</b> — {a.details} <small>{new Date(a.created_at).toLocaleString()}</small></div>)}</div>
  </Modal>
}

function Modal({title,close,children}){return <div className="overlay"><div className="modal"><div className="modalHead"><h3>{title}</h3><button className="close" onClick={close}>×</button></div>{children}</div></div>}

createRoot(document.getElementById("root")).render(<App/>);
