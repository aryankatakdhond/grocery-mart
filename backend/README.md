# Grocery Mart — Backend Setup Guide

## Step-by-Step Setup

### 1. Install Node.js
Download from: https://nodejs.org (choose LTS version)

### 2. Install MySQL
Download from: https://dev.mysql.com/downloads/mysql/
- Remember your MySQL root password

### 3. Create the Database
Open MySQL Workbench or terminal:
```sql
mysql -u root -p
```
Then run the schema file:
```sql
source /path/to/backend/schema.sql
```
OR copy-paste the schema.sql content into MySQL Workbench and run it.

### 4. Configure .env
Edit the `.env` file with your MySQL password:
```
DB_PASSWORD=your_actual_mysql_password
JWT_SECRET=any_long_random_string_here
```

### 5. Install dependencies
Open terminal inside the `backend/` folder:
```bash
npm install
```

### 6. Start the server
```bash
# Normal start
npm start

# Development (auto-restart on changes)
npm run dev
```

You should see:
```
✅ Server running  → http://localhost:5000
✅ Database connected!
📦 API health      → http://localhost:5000/api/health
```

### 7. Open your frontend
Open `index.html` with VS Code Live Server (port 5500)
OR open it directly in browser via file path.

---

## API Endpoints

| Method | URL | Description | Auth |
|--------|-----|-------------|------|
| POST | /api/auth/register | Register new user | ❌ |
| POST | /api/auth/login | Login | ❌ |
| GET | /api/products | All products | ❌ |
| GET | /api/products/featured | Popular products | ❌ |
| GET | /api/products/deals | Today's deals | ❌ |
| GET | /api/products/search?q= | Search | ❌ |
| GET | /api/products/category/:name | By category | ❌ |
| GET | /api/orders/check-pincode/:pin | Check delivery | ❌ |
| POST | /api/orders | Place order | ✅ |
| GET | /api/orders/mine | My orders | ✅ |
| GET | /api/user/profile | Get profile | ✅ |
| PUT | /api/user/profile | Update profile | ✅ |
| GET | /api/user/addresses | My addresses | ✅ |
| POST | /api/user/addresses | Add address | ✅ |
| POST | /api/coupons/validate | Validate coupon | ✅ |
| GET | /api/admin/dashboard | Admin stats | 👑 Admin |
| GET | /api/admin/orders | All orders | 👑 Admin |
| PUT | /api/admin/orders/:id | Update status | 👑 Admin |
| GET | /api/admin/products | All products | 👑 Admin |
| POST | /api/admin/products | Add product | 👑 Admin |
| GET | /api/admin/pincodes | All pincodes | 👑 Admin |
| POST | /api/admin/pincodes | Add pincode | 👑 Admin |

---

## Default Admin Account
- Email: `admin@grocerymart.com`
- Password: `admin123`

## Project Structure
```
grocery-store/
├── index.html
├── cart.html
├── checkout.html
├── confirmation.html
├── profile.html
├── search.html
├── login.html
├── admin.html
├── 404.html
├── css/
│   ├── index.css
│   ├── checkout.css
│   ├── confirmation.css
│   ├── profile.css
│   └── search.css
└── backend/
    ├── server.js
    ├── package.json
    ├── .env
    ├── schema.sql
    ├── config/
    │   └── db.js
    ├── middleware/
    │   ├── authMiddleware.js
    │   └── adminMiddleware.js
    └── routes/
        ├── authRoutes.js
        ├── productRoutes.js
        ├── orderRoutes.js
        ├── userRoutes.js
        ├── adminRoutes.js
        └── couponRoutes.js
```
