import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import "./styles.css";

const API = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


/* =========================================================
   APP
========================================================= */

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  function loginSuccess(userData, token) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
  }

  if (!user) {
    return <Login onLogin={loginSuccess} />;
  }

  return (
    <Dashboard
      user={user}
      logout={logout}
    />
  );
}


/* =========================================================
   LOGIN
========================================================= */

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/login", {
        email,
        password,
      });

      onLogin(
        response.data.user,
        response.data.token
      );

    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.response?.data?.error ||
        err.response?.data?.details ||
        "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage">

      <div className="loginCard">

        <h1>
          Student Support
        </h1>

        <p className="loginSubtitle">
          Support & Ticket Management System
        </p>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <form onSubmit={submit}>

          <label>
            Email
          </label>

          <input
            type="email"
            value={email}
            placeholder="Enter your email"
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <label>
            Password
          </label>

          <input
            type="password"
            value={password}
            placeholder="Enter your password"
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <div className="demoLogin">

          <p>
            <b>Demo Accounts</b>
          </p>

          <p>
            Student: student@demo.com / student123
          </p>

          <p>
            Staff: staff@demo.com / staff123
          </p>

          <p>
            Admin: admin@demo.com / admin123
          </p>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({ user, logout }) {
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(null);

  const [selected, setSelected] = useState(null);

  const [showCreate, setShowCreate] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/tickets");

      setTickets(response.data);

      if (user.role !== "STUDENT") {
        try {
          const dashboardResponse =
            await api.get("/dashboard");

          setSummary(
            dashboardResponse.data.summary
          );
        } catch (dashboardError) {
          console.error(
            "Dashboard summary error:",
            dashboardError
          );
        }
      }

    } catch (err) {
      console.error("Ticket loading error:", err);

      setError(
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        "Could not load tickets."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visibleTickets = tickets.filter((ticket) => {

    const statusMatch =
      !statusFilter ||
      ticket.status === statusFilter;

    const priorityMatch =
      !priorityFilter ||
      ticket.priority === priorityFilter;

    return statusMatch && priorityMatch;
  });


  return (
    <div className="app">

      {/* HEADER */}
      <header className="topbar">

        <div>
          <h1>
            Student Support
          </h1>

          <span>
            Ticket Management System
          </span>
        </div>

        <div className="userArea">

          <div>
            <b>
              {user.name}
            </b>

            <small>
              {user.role}
            </small>
          </div>

          <button
            className="logoutButton"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </header>


      {/* MAIN */}
      <main className="container">

        {/* PAGE TITLE */}
        <div className="pageHeader">

          <div>
            <h2>
              {user.role === "STUDENT"
                ? "My Support Tickets"
                : "Support Ticket Queue"}
            </h2>

            <p>
              {user.role === "STUDENT"
                ? "Create and track your support requests."
                : "Manage student support requests and track their progress."}
            </p>
          </div>

          {user.role === "STUDENT" && (
            <button
              onClick={() =>
                setShowCreate(true)
              }
            >
              + Create Ticket
            </button>
          )}

        </div>


        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="success">
            {message}
          </div>
        )}


        {/* ERROR MESSAGE */}
        {error && (
          <div className="error">
            {error}
          </div>
        )}


        {/* STAFF DASHBOARD */}
        {user.role !== "STUDENT" &&
          summary && (
            <div className="stats">

              <StatCard
                title="Total"
                value={summary.total}
              />

              <StatCard
                title="Open"
                value={summary.open}
              />

              <StatCard
                title="In Progress"
                value={summary.in_progress}
              />

              <StatCard
                title="Pending"
                value={summary.pending}
              />

              <StatCard
                title="Resolved"
                value={summary.resolved}
              />

              <StatCard
                title="Overdue"
                value={summary.overdue}
              />

            </div>
          )}


        {/* FILTERS */}
        <div className="filters">

          <div>
            <label>
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="">
                All Statuses
              </option>

              <option value="OPEN">
                OPEN
              </option>

              <option value="ASSIGNED">
                ASSIGNED
              </option>

              <option value="IN_PROGRESS">
                IN_PROGRESS
              </option>

              <option value="PENDING">
                PENDING
              </option>

              <option value="RESOLVED">
                RESOLVED
              </option>

              <option value="CLOSED">
                CLOSED
              </option>
            </select>
          </div>


          <div>
            <label>
              Priority
            </label>

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value)
              }
            >
              <option value="">
                All Priorities
              </option>

              <option value="LOW">
                LOW
              </option>

              <option value="MEDIUM">
                MEDIUM
              </option>

              <option value="HIGH">
                HIGH
              </option>

              <option value="URGENT">
                URGENT
              </option>
            </select>
          </div>

        </div>


        {/* TICKETS */}
        <div className="card">

          {loading ? (
            <div className="empty">
              Loading tickets...
            </div>
          ) : visibleTickets.length === 0 ? (

            <div className="empty">
              No tickets found.
            </div>

          ) : (

            <div className="tableWrapper">

              <table>

                <thead>

                  <tr>

                    <th>
                      ID
                    </th>

                    <th>
                      Subject
                    </th>

                    <th>
                      Category
                    </th>

                    {user.role !== "STUDENT" && (
                      <th>
                        Student
                      </th>
                    )}

                    <th>
                      Priority
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Assigned
                    </th>

                    <th>
                      Created
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {visibleTickets.map((ticket) => (

                    <tr key={ticket.id}>

                      <td>
                        #{ticket.id}
                      </td>

                      <td>
                        <b>
                          {ticket.subject}
                        </b>
                      </td>

                      <td>
                        {ticket.category}
                      </td>

                      {user.role !== "STUDENT" && (
                        <td>
                          {ticket.student_name ||
                            ticket.student ||
                            "-"}
                        </td>
                      )}

                      <td>
                        <PriorityBadge
                          priority={ticket.priority}
                        />
                      </td>

                      <td>
                        <StatusBadge
                          status={ticket.status}
                        />
                      </td>

                      <td>
                        {ticket.assigned_to ||
                          "Unassigned"}
                      </td>

                      <td>
                        {formatDate(
                          ticket.created_at
                        )}
                      </td>

                      <td>

                        <button
                          className="smallButton"
                          onClick={() =>
                            setSelected(ticket)
                          }
                        >
                          Open
                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </main>


      {/* CREATE TICKET MODAL */}
      {showCreate && (
        <CreateTicketModal
          close={() =>
            setShowCreate(false)
          }
          refresh={load}
          setMessage={setMessage}
        />
      )}


      {/* TICKET DETAILS MODAL */}
      {selected && (
        <TicketModal
          ticket={selected}
          user={user}
          close={() =>
            setSelected(null)
          }
          refresh={load}
          setMessage={setMessage}
        />
      )}

    </div>
  );
}


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ title, value }) {
  return (
    <div className="statCard">

      <span>
        {title}
      </span>

      <strong>
        {value ?? 0}
      </strong>

    </div>
  );
}


/* =========================================================
   CREATE TICKET
========================================================= */

function CreateTicketModal({
  close,
  refresh,
  setMessage,
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] =
    useState("OTHER");

  const [priority, setPriority] =
    useState("MEDIUM");

  const [description, setDescription] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  async function submit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {

      await api.post("/tickets", {
        subject,
        category,
        priority,
        description,
      });

      setMessage(
        "Ticket created successfully."
      );

      await refresh();

      close();

    } catch (err) {

      console.error(
        "Create ticket error:",
        err
      );

      setError(
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        "Could not create ticket."
      );

    } finally {
      setLoading(false);
    }
  }


  return (
    <Modal
      title="Create Support Ticket"
      close={close}
    >

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <form onSubmit={submit}>

        <label>
          Subject
        </label>

        <input
          value={subject}
          onChange={(e) =>
            setSubject(e.target.value)
          }
          placeholder="Enter your issue"
          required
        />


        <label>
          Category
        </label>

        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value)
          }
        >
          <option value="FEES">
            Fees
          </option>

          <option value="ATTENDANCE">
            Attendance
          </option>

          <option value="ID_CARD">
            ID Card
          </option>

          <option value="DOCUMENTS">
            Documents
          </option>

          <option value="CERTIFICATE">
            Certificate
          </option>

          <option value="TECHNICAL">
            Technical
          </option>

          <option value="OTHER">
            Other
          </option>
        </select>


        <label>
          Priority
        </label>

        <select
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value)
          }
        >
          <option value="LOW">
            LOW
          </option>

          <option value="MEDIUM">
            MEDIUM
          </option>

          <option value="HIGH">
            HIGH
          </option>

          <option value="URGENT">
            URGENT
          </option>
        </select>


        <label>
          Description
        </label>

        <textarea
          rows="6"
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
          placeholder="Describe your issue..."
          required
        />


        <div className="formActions">

          <button
            type="button"
            className="secondary"
            onClick={close}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create Ticket"}
          </button>

        </div>

      </form>

    </Modal>
  );
}


/* =========================================================
   TICKET MODAL
========================================================= */

function TicketModal({
  ticket,
  user,
  close,
  refresh,
  setMessage,
}) {

  const [data, setData] =
    useState(null);

  const [reply, setReply] =
    useState("");

  const [staff, setStaff] =
    useState([]);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);


  async function load() {

    try {

      setError("");
      setLoading(true);

      console.log(
        "Loading ticket:",
        ticket.id
      );

      const response =
        await api.get(
          "/tickets/" + ticket.id
        );

      console.log(
        "Ticket response:",
        response.data
      );

      setData(response.data);


      // Staff list
      if (user.role !== "STUDENT") {

        try {

          const staffResponse =
            await api.get(
              "/users/staff"
            );

          console.log(
            "Staff response:",
            staffResponse.data
          );

          setStaff(
            staffResponse.data || []
          );

        } catch (staffError) {

          console.error(
            "Staff loading error:",
            staffError
          );

          setStaff([]);
        }
      }

    } catch (err) {

      console.error(
        "Ticket details error:",
        err
      );

      console.error(
        "Response:",
        err.response?.data
      );

      setError(
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        "Could not load ticket details."
      );

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {
    load();
  }, [ticket.id]);


  /* UPDATE TICKET */

  async function update(patch) {

    try {

      setError("");

      console.log(
        "Updating ticket:",
        patch
      );

      await api.patch(
        "/tickets/" + ticket.id,
        patch
      );

      await load();

      await refresh();

      setMessage(
        "Ticket updated successfully."
      );

    } catch (err) {

      console.error(
        "Ticket update error:",
        err
      );

      setError(
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        "Could not update ticket."
      );
    }
  }


  /* SEND REPLY */

  async function sendReply(e) {

    e.preventDefault();

    if (!reply.trim()) {
      return;
    }

    try {

      setError("");

      await api.post(
        `/tickets/${ticket.id}/reply`,
        {
          message: reply.trim(),
        }
      );

      setReply("");

      await load();

      setMessage(
        "Reply sent successfully."
      );

    } catch (err) {

      console.error(
        "Reply error:",
        err
      );

      setError(
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        "Could not send reply."
      );
    }
  }


  /* ERROR */

  if (error) {

    return (
      <Modal
        title={
          "Ticket #" + ticket.id
        }
        close={close}
      >

        <div className="error">

          <b>
            Could not load ticket.
          </b>

          <p>
            {error}
          </p>

          <button onClick={load}>
            Try Again
          </button>

        </div>

      </Modal>
    );
  }


  /* LOADING */

  if (loading || !data) {

    return (
      <Modal
        title={
          "Ticket #" + ticket.id
        }
        close={close}
      >

        <div className="loading">
          Loading ticket details...
        </div>

      </Modal>
    );
  }


  const ticketData =
    data.ticket || {};

  const replies =
    data.replies || [];

  const activity =
    data.activity || [];


  return (
    <Modal
      title={
        `#${ticket.id} — ${
          ticketData.subject || ticket.subject
        }`
      }
      close={close}
    >

      {/* ERROR INSIDE MODAL */}

      {error && (
        <div className="error">
          {error}
        </div>
      )}


      {/* TICKET INFORMATION */}

      <div className="detail">

        <p>
          <b>
            Category:
          </b>{" "}
          {ticketData.category || "-"}
        </p>


        <p>

          <b>
            Priority:
          </b>{" "}

          <PriorityBadge
            priority={
              ticketData.priority
            }
          />

          {"  "}

          <b>
            Status:
          </b>{" "}

          <StatusBadge
            status={
              ticketData.status
            }
          />

        </p>


        <p>

          <b>
            Student:
          </b>{" "}

          {ticketData.student_name ||
            "-"}

          {" "}

          {ticketData.student_email && (
            <>
              (
              {ticketData.student_email}
              )
            </>
          )}

        </p>


        <p>

          <b>
            Assigned:
          </b>{" "}

          {ticketData.assigned_to ||
            "Unassigned"}

        </p>


        <div className="description">

          {ticketData.description ||
            "No description available."}

        </div>

      </div>


      {/* STAFF CONTROLS */}

      {user.role !== "STUDENT" && (

        <div className="adminControls">

          <h4>
            Ticket Management
          </h4>


          {/* STATUS */}

          <label>
            Status
          </label>

          <select
            value={
              ticketData.status || "OPEN"
            }
            onChange={(e) =>
              update({
                status:
                  e.target.value,
              })
            }
          >

            <option value="OPEN">
              OPEN
            </option>

            <option value="ASSIGNED">
              ASSIGNED
            </option>

            <option value="IN_PROGRESS">
              IN_PROGRESS
            </option>

            <option value="PENDING">
              PENDING
            </option>

            <option value="RESOLVED">
              RESOLVED
            </option>

            <option value="CLOSED">
              CLOSED
            </option>

          </select>


          {/* PRIORITY */}

          <label>
            Priority
          </label>

          <select
            value={
              ticketData.priority ||
              "MEDIUM"
            }
            onChange={(e) =>
              update({
                priority:
                  e.target.value,
              })
            }
          >

            <option value="LOW">
              LOW
            </option>

            <option value="MEDIUM">
              MEDIUM
            </option>

            <option value="HIGH">
              HIGH
            </option>

            <option value="URGENT">
              URGENT
            </option>

          </select>


          {/* ASSIGNMENT */}

          <label>
            Assign Staff
          </label>

          <select
            value={
              ticketData.assigned_to_id ||
              ""
            }
            onChange={(e) =>
              update({
                assigned_to:
                  e.target.value
                    ? Number(
                        e.target.value
                      )
                    : null,
              })
            }
          >

            <option value="">
              Unassigned
            </option>

            {staff.map((member) => (

              <option
                key={member.id}
                value={member.id}
              >
                {member.name}
              </option>

            ))}

          </select>

        </div>
      )}


      {/* CONVERSATION */}

      <h4>
        Conversation
      </h4>

      <div className="conversation">

        {replies.length === 0 ? (

          <p className="muted">
            No replies yet.
          </p>

        ) : (

          replies.map((item) => (

            <div
              className="reply"
              key={item.id}
            >

              <div>
                <b>
                  {item.user_name}
                </b>
              </div>

              <small>
                {formatDate(
                  item.created_at
                )}
              </small>

              <p>
                {item.message}
              </p>

            </div>

          ))

        )}

      </div>


      {/* REPLY FORM */}

      <form
        onSubmit={sendReply}
      >

        <textarea
          rows="4"
          placeholder="Write a reply..."
          value={reply}
          onChange={(e) =>
            setReply(e.target.value)
          }
        />

        <button
          type="submit"
          disabled={!reply.trim()}
        >
          Send Reply
        </button>

      </form>


      {/* ACTIVITY */}

      <h4>
        Activity History
      </h4>

      <div className="activity">

        {activity.length === 0 ? (

          <p className="muted">
            No activity yet.
          </p>

        ) : (

          activity.map((item) => (

            <div
              key={item.id}
            >

              <b>
                {item.action}
              </b>

              {item.details && (
                <>
                  {" — "}
                  {item.details}
                </>
              )}

              <small>
                {" "}
                {formatDate(
                  item.created_at
                )}
              </small>

            </div>

          ))

        )}

      </div>

    </Modal>
  );
}


/* =========================================================
   MODAL
========================================================= */

function Modal({
  title,
  close,
  children,
}) {

  return (
    <div
      className="modalOverlay"
      onClick={close}
    >

      <div
        className="modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="modalHeader">

          <h3>
            {title}
          </h3>

          <button
            className="closeButton"
            onClick={close}
          >
            ×
          </button>

        </div>

        <div className="modalBody">
          {children}
        </div>

      </div>

    </div>
  );
}


/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {

  if (!status) {
    return (
      <span className="badge">
        -
      </span>
    );
  }

  return (
    <span
      className={
        "badge status-" +
        status.toLowerCase()
      }
    >
      {status}
    </span>
  );
}


/* =========================================================
   PRIORITY BADGE
========================================================= */

function PriorityBadge({ priority }) {

  if (!priority) {
    return (
      <span className="badge">
        -
      </span>
    );
  }

  return (
    <span
      className={
        "badge priority-" +
        priority.toLowerCase()
      }
    >
      {priority}
    </span>
  );
}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(value) {

  if (!value) {
    return "-";
  }

  try {

    return new Date(
      value
    ).toLocaleString();

  } catch {

    return value;

  }
}


/* =========================================================
   START REACT
========================================================= */

createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);