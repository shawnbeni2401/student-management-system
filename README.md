# Event Management & OD Approval System

A complete web-based solution for college event management, featuring role-based access control, multi-stage approval workflow, and automatic OD letter generation.

## 👥 Roles & Credentials
The system is pre-seeded with the following users:
- **Admin:** `admin@college.edu` (User verification & system monitoring)
- **HOD:** `hod_cse@college.edu` (Departmental approvals)
- **Staff:** `staff@college.edu` (Event creation)
- **Student:** `student@college.edu` (Applying & OD download)

## 🚀 Setup Instructions

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed on your system.

### 2. Installation
Navigate to the project root and install dependencies:
```bash
npm install
```

### 3. Running the Server
Start the Express server:
```bash
npm start
```
The server will run on [**http://localhost:3000**](http://localhost:3000).

### 4. Project Structure
- **/backend**: Express server, SQLite config, controllers, and routes.
- **/frontend**: HTML, CSS, and Vanilla JS dashboards.
- **/uploads**: Storage for uploaded event posters and generated OD letters.

## ✨ Features
- **Glassmorphism UI:** Modern, premium aesthetic with dark mode.
- **Dynamic Register:** Role-based fields (e.g., Register Number for students only).
- **Admin Gatekeeper:** New users must be verified by an admin before they can log in.
- **Multi-Stage Tracking:** HODs can move students through Prelims, Semifinals, and Finals.
- **Automated PDF:** `pdfkit` generates official OD letters dynamically upon approval.
- **External Events:** Support for external college events with Google Maps integration.

## 🛠 Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript.
- **Backend:** Node.js, Express.js.
- **Database:** SQLite (Relational, file-based).
- **PDF Logic:** PDFKit.
- **Auth:** JSON Web Tokens (JWT) & Bcrypt.
