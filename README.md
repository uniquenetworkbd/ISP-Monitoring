# 🌐 ISP Enterprise Cloud Network Monitoring System (v2.0)

An enterprise-grade, cloud-based multi-page frontend and backend architecture designed for professional ISP networks to monitor Mikrotik routers, OLTs, Switches, and ONUs in real-time.

---

## 🏗️ System Architecture

- **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3, FontAwesome.
- **Backend:** Node.js, Express.js (RESTful API, modular controllers & routes).
- **Database:** MongoDB Atlas (Cloud NoSQL DB for device caching & client synchronization).
- **Integration Layer:** Direct RouterOS API & OLT SNMP/Telnet network scanner services.

---

## 📁 Project Directory Structure

```text
isp-cloud-monitor/
│
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── style.css
│   │   │   └── responsive.css
│   │   └── js/
│   │       └── api.js
│   ├── index.html
│   ├── devices.html
│   ├── add-device.html
│   ├── users.html
│   ├── analytics.html
│   ├── settings.html
│   └── login.html
│
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── deviceController.js
│   │   └── userController.js
│   ├── models/
│   │   ├── Device.js
│   │   └── User.js
│   ├── routes/
│   │   ├── deviceRoutes.js
│   │   └── userRoutes.js
│   ├── services/
│   │   └── networkScannerService.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── README.md
