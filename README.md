# 🏡 Real Estate Mobile App

A full-stack real estate application built with a mobile frontend and a Python backend. This app allows users to browse, add, and manage property listings efficiently.

---

## 🚀 Features

* 📱 Mobile-friendly interface
* 🏠 Add and manage property listings
* 📍 Property location tracking
* 💰 Price management
* 🧑‍💼 Agent-based property system
* 🔐 User authentication (Login & Register)
* 🖼️ Image upload support for properties

---

## 🛠️ Tech Stack

### Frontend

* React Native (Expo)
* Axios for API requests

### Backend

* Python (FastAPI)
* Supabase (Database & Auth)

---

## 📂 Project Structure

```
newMobileApp/
│
├── backend/
│   ├── main.py
│   ├── services/
│   ├── user_authentication/
│   └── requirements.txt
│
├── my-new-app/   # Mobile frontend (React Native)
│
├── package.json
├── .gitignore
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```
git clone https://github.com/your-username/RealEstateAppFrontend.git
cd RealEstateAppFrontend
```

---

### 2. Backend Setup

```
cd backend
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Run the backend:

```
uvicorn main:app --reload
```

---

### 3. Frontend Setup

```
cd my-new-app
npm install
```

Start the app:

```
npx expo start
```

---

## 🔐 Environment Variables

Create a `.env` file in the backend folder and add:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

⚠️ Never commit your `.env` file to GitHub.

---

## 🌐 API Endpoints (Sample)

* `POST /addproperties/{agent_id}` → Add property
* `PUT /properties/{property_id}` → Update property
* `POST /login` → User login
* `POST /register` → User registration

---

## 🧪 Testing

You can test APIs using:

* Postman
* Thunder Client (VS Code)

---

## 🚧 Future Improvements

* 🔎 Property search & filters
* ❤️ Favorites system
* 💬 Chat between agents and users
* 🌍 Map integration
* 🔔 Notifications

---

## 👨‍💻 Author

**Austine Byagashani**

* 🌍 Dar es Salaam, Tanzania
* 💼 Full-stack Developer

---

## 📄 License

This project is licensed under the MIT License.

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!
