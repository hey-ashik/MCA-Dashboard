# MC Academy - Course Admin Dashboard 🎓

A modern, responsive, and fully-featured Administrative Dashboard built for course creators and educational institutions. Manage your online courses, track revenue performance, and get AI-powered business insights in real-time.

![MC Academy Dashboard Preview](#) *(Add a screenshot of your dashboard here)*

## ✨ Key Features

### 📊 Real-Time Course Management
- **Supabase Backend:** Fully integrated with Supabase for instant real-time data syncing.
- **CRUD Operations:** Easily Add, Edit, View, and Delete course data across your platform.
- **Dynamic Filtering:** Filter courses instantly by: *Pending Payments, Active Courses, Highest Enrolled, and Zero Enrollments.*

### 🤖 AI Business Predictor (Powered by GroqCloud)
- **Built-in AI Analyst:** Uses GroqCloud AI to instantly analyze your real-time course performance.
- **Custom Prompts:** Ask the AI questions like *"Which course needs more marketing?"* and get detailed markdown-formatted business advice instantly.
- **On-Device Key Storage:** API keys are stored securely in browser `localStorage`.

### 📱 Responsive & Mobile Optimized
- **Native App Feel:** Custom CSS touch-actions completely disable laggy mobile double-tap zooming.
- **Collapsible Sidebar:** Optimized routing menu that hides away cleanly on smaller devices.
- **Toast Notifications:** Custom-built, auto-dismissing toast notifications for system alerts (success/error).

### ⚙️ User Settings & Personalization
- **Profile Avatars:** Upload and update your admin profile avatar (Processed via lightweight `upload.php` backend).
- **Persistent Storage:** Name, Job Role, and active Avatar are saved via browser storage to survive reloads.
- **Cache Controller:** A single-click *Clear App Cache* button to reset stored browser data and fix loading issues.

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6)
- **Backend / Database:** Supabase (PostgreSQL Database & Real-time Subscriptions)
- **Image Uploads:** PHP (`upload.php`)
- **Visuals & Charts:** Chart.js
- **AI Integration:** GroqCloud API + Marked.js (for parsing markdown)

---

## 🚀 Installation & Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/mca-admin-dashboard.git
   ```

2. **Upload to Server:**
   - Upload the project files directly to a standard web host (e.g. cPanel).
   - *Note: A PHP-enabled server is required for the `upload.php` avatar system to work!*

3. **Supabase Setup:**
   - Create a project on [Supabase](https://supabase.com/).
   - Create a `courses` table with the following columns: `id`, `name`, `fee`, `enrolled`, `received`, `pending`.
   - Update `app.js` with your specific Supabase URL and Anon Key.

4. **GroqCloud AI Setup:**
   - Get a free API key from [GroqCloud Console](https://console.groq.com/keys).
   - Enter it into the Dashboard's Settings Tab to unlock the AI Predictor.

## 📂 File Structure

```text
├── index.html        # Main Application UI
├── styles.css        # Dashboard Styling & Responsive Breakpoints
├── app.js            # Core Logic, Supabase Sync, AI API Calls, UI Listeners
├── upload.php        # Endpoint to securely handle local avatar image uploads
└── data.csv          # Optional local data dump 
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](#) if you want to contribute.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
