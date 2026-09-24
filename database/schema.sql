IF DB_ID('StudentSupportDB') IS NULL
    CREATE DATABASE StudentSupportDB;
GO

USE StudentSupportDB;
GO

IF OBJECT_ID('ticket_replies','U') IS NOT NULL DROP TABLE ticket_replies;
IF OBJECT_ID('ticket_activity','U') IS NOT NULL DROP TABLE ticket_activity;
IF OBJECT_ID('tickets','U') IS NOT NULL DROP TABLE tickets;
IF OBJECT_ID('users','U') IS NOT NULL DROP TABLE users;
GO

CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK(role IN ('STUDENT','STAFF','ADMIN')),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE tickets (
    id INT IDENTITY(1,1) PRIMARY KEY,
    student_id INT NOT NULL,
    assigned_to INT NULL,
    category NVARCHAR(50) NOT NULL,
    subject NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
        CHECK(priority IN ('LOW','MEDIUM','HIGH','URGENT')),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK(status IN ('OPEN','ASSIGNED','IN_PROGRESS','PENDING','RESOLVED','CLOSED')),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    resolved_at DATETIME2 NULL,
    CONSTRAINT FK_Ticket_Student FOREIGN KEY(student_id) REFERENCES users(id),
    CONSTRAINT FK_Ticket_Assignee FOREIGN KEY(assigned_to) REFERENCES users(id)
);

CREATE TABLE ticket_activity (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    details NVARCHAR(1000) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY(ticket_id) REFERENCES tickets(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE ticket_replies (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY(ticket_id) REFERENCES tickets(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IX_Tickets_Student ON tickets(student_id);
CREATE INDEX IX_Tickets_Assigned ON tickets(assigned_to);
CREATE INDEX IX_Tickets_Status ON tickets(status);
CREATE INDEX IX_Tickets_Created ON tickets(created_at);
GO
