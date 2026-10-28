# ⚡ Habit Tracker & Daily Analytics

Sleek and modern web application designed for tracking daily habits, monitoring weekly streaks, and visualizing personal progress. Built with **Vanilla JavaScript**, **CSS3 (Glassmorphism & Patterned UI)**, and **Supabase** for user authentication and relational database storage.

---

## ✨ Features

- **🔐 User Authentication:** Secure email/password login and sign-up powered by Supabase Auth with Row Level Security (RLS).
- **🔥 Streak Counter:** Automatic calculation of consecutive daily completions with an animated flame badge (`🔥 N days`).
- **📅 7-Day Weekly Calendar:** Integrated strip on each habit card showing completion logs over the last 7 days.
- **📊 Dynamic Progress Bar:** Real-time percentage indicator of today's completed habits.
- **🎨 Glassmorphic Interface:** Styled background wallpaper with semi-transparent glassmorphic cards and interactive animations.
- **🏷️ Categorization:** Organize habits into categories: *Health*, *Productivity*, *Mindfulness*, or *General*.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Flexbox/Grid, Glassmorphism, CSS Animations), Vanilla JavaScript (ES6+).
- **Backend & Database:** [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, Auth).
- **Icons & Design:** Custom SVG patterns & Native Emojis.

---

## 🗄️ Database Architecture

The application relies on two relational tables configured with Row Level Security (RLS) policies ensuring users can only access their own data:

### `habits`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (Primary Key) | Unique habit identifier |
| `user_id` | `UUID` (Foreign Key) | References `auth.users.id` |
| `title` | `TEXT` | Name of the habit |
| `category` | `TEXT` | Category tag |
| `created_at` | `TIMESTAMP` | Timestamp of creation |

### `habit_logs`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (Primary Key) | Log entry identifier |
| `habit_id` | `UUID` (Foreign Key) | References `habits.id` |
| `completed_at` | `DATE` | Date of habit completion |

---

## 🚀 Local Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/habit-tracker.git](https://github.com/YOUR_USERNAME/habit-tracker.git)
   cd habit-tracker
