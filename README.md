# 📱 WhatsApp Web Clone - Full Stack

A premium, full-featured WhatsApp Web clone built with a modern tech stack. This project demonstrates advanced real-time communication, robust data management, and a high-fidelity user interface.

> [!IMPORTANT]
> This project was built as a Full Stack Developer Task, focusing on performance, UX, and real-time reliability.

## ✨ Premium Features

### 📨 Messaging Experience
- **Real-time Chat**: Powered by Socket.IO for sub-millisecond message delivery.
* **Advanced Read Receipts**: 
  - Single grey tick (Sent)
  - Double grey ticks (Delivered to recipient)
  - Double green ticks (Read by recipient)
* **Group Chat Support**: Create groups, manage members, and track read status per-user.
- **Rich Media Support**: Upload and share images, videos, and documents seamlessly.
- **Voice Messages**: Record and send audio messages with a premium player interface.
- **Message Info Panel**: A detailed, real-time slide-in panel showing exactly when messages were **Delivered** and **Read**.
- **Group Status Tracking**: Track individual delivery and read status for every member in a group chat.
- **Message Editing & Deletion**: Edit sent messages or delete them (for me or for everyone).
- **Reply System**: Contextual replies to specific messages with quick-jump functionality.
- **Starred Messages**: Save important messages for quick access.

### 🛡️ Privacy & Control
- **Disappearing Messages**: Set self-destruct timers (24h, 7d, 90d) for conversations.
- **Mute Notifications**: Silence busy conversations for specific durations.
- **User Blocking**: Block/unblock users to control who can message you.
- **Presence Tracking**: Real-time Online/Offline status and "Last Seen" timestamps.

### 🎨 User Interface & UX
- **Stunning UI**: A sleek, glassmorphic design with Tailwind CSS and custom animations.
- **Official WhatsApp Palette**: Implemented the official light and dark mode color schemes for bubbles and text to ensure premium aesthetics and legibility.
- **Dark Mode**: Fully supports high-contrast dark mode for eye comfort.
- **Unread Indicators**: Smart badges and an "X Unread Messages" divider in chats.
- **Typing Indicators**: See when others are typing in real-time.
- **Emoji Support**: Integrated emoji picker for expressive messaging.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Tailwind CSS, Lucide Icons, Axios |
| **Backend** | Node.js, Express, Socket.IO |
| **Database** | MongoDB (Mongoose) |
| **Auth** | JWT (JSON Web Tokens), Bcrypt.js |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)

### 1. Backend Setup (`/server`)
1. `cd server`
2. `npm install`
3. Create `.env` file:
   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/whatsapp-clone
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```
4. `npm run dev`

### 2. Frontend Setup (`/client`)
1. `cd client`
2. `npm install`
3. Create `.env` file:
   ```env
   VITE_REACT_APP_API_URL=http://localhost:5000/api
   VITE_REACT_APP_SOCKET_URL=http://localhost:5000
   ```
4. `npm run dev`

---

## 📂 Project Structure
```text
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Layouts and screen views
│   │   └── context/     # Auth and state management
└── server/              # Node.js backend
    ├── models/          # Mongoose schemas
    ├── routes/          # API endpoints
    └── server.js        # Socket.IO & entry point
```

## 📜 Development Notes
- **UserConversation Model**: Implemented for high-performance retrieval of user-specific metadata (pinned status, unread counts).
- **Socket delivery logic**: Optimized to mark messages "delivered" only when users connect, and "read" immediately if they are in the active chat.

---
Created by Monish Narain N for the Full Stack Developer Technical Task.
