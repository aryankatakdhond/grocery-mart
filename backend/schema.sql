-- ============================================
-- schema.sql — Grocery Mart Database
-- Run this file once to create all tables
-- Command: mysql -u root -p grocerymart < schema.sql
-- ============================================

-- Create and use the database
USE defaultdb;
SET NAMES utf8mb4;


-- ── TABLE: users ──
-- Stores all registered customers and admin accounts
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL UNIQUE,
  phone      VARCHAR(15),
  password   VARCHAR(255)  NOT NULL,
  role       ENUM('customer', 'admin') DEFAULT 'customer',
  is_verified TINYINT(1)   NOT NULL DEFAULT 0,
  verification_token   VARCHAR(255) NULL,
  verification_expires DATETIME NULL,
  reset_token          VARCHAR(255) NULL,
  reset_expires        DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (name, email, phone, password, role, is_verified)
VALUES ('Admin', 'admin@grocerymart.com', '9999999999',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1);


-- ── TABLE: categories ──
-- Product categories like Fruits, Vegetables, Dairy, etc.
CREATE TABLE IF NOT EXISTS categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  emoji      VARCHAR(10)  DEFAULT '📦',
  is_visible TINYINT(1)   DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default categories
INSERT IGNORE INTO categories (name, emoji) VALUES
  ('Fruits',          '🍎'),
  ('Vegetables',      '🥦'),
  ('Dairy',           '🥛'),
  ('Bakery & Pastry', '🍞'),
  ('Beverages',       '🥤'),
  ('Grocery',         '🛍️');


-- ── TABLE: products ──
-- All grocery products sold on the site
CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200)   NOT NULL,
  category    VARCHAR(100)   NOT NULL,
  price       DECIMAL(10,2)  NOT NULL,
  old_price   DECIMAL(10,2)  DEFAULT NULL,  -- for showing discount
  weight      VARCHAR(50),
  description TEXT,
  image_url   VARCHAR(500),
  in_stock    TINYINT(1)     DEFAULT 1,
  is_featured TINYINT(1)     DEFAULT 0,     -- shows in Popular section
  is_deal     TINYINT(1)     DEFAULT 0,     -- shows in Today's Deals
  rating      DECIMAL(2,1)   DEFAULT 4.5,
  reviews     INT            DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert all products from the frontend
INSERT IGNORE INTO products (name, category, price, old_price, weight, description, image_url, in_stock, is_featured, is_deal, rating, reviews) VALUES
('Avocado - Medium (Each)', 'Fruits', 120.00, NULL, '2 kg', 'A creamy, nutrient-rich avocado perfect for salads, toast, and smoothies.', 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=300&h=200&fit=crop', 1, 1, 0, 4.8, 124),
('Beetroot', 'Vegetables', 149.00, NULL, '250 g', 'Farm-fresh beetroot packed with iron and antioxidants.', 'https://cpimg.tistatic.com/11530038/b/7/Fresh-Beetroot.jpeg', 1, 1, 0, 4.5, 88),
('Green Fresh Broccoli', 'Vegetables', 65.00, NULL, '500 g', 'Crisp and fresh broccoli florets, rich in vitamins C and K.', 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=300&h=200&fit=crop', 1, 1, 0, 4.6, 201),
('Organic Cabbage', 'Vegetables', 55.00, NULL, '1 kg', 'Organic red cabbage, crunchy and colourful.', 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=300&h=200&fit=crop', 1, 1, 0, 4.3, 67),
('Organic Spring Onion', 'Vegetables', 30.00, NULL, '200 g', 'Tender spring onions with a mild, fresh flavour.', 'https://www.veggycation.com.au/siteassets/veggycationvegetable/spring-onions.jpg', 1, 1, 0, 4.2, 45),
('Farm Fresh Green Lemon', 'Fruits', 45.00, NULL, '500 g', 'Freshly picked green lemons bursting with vitamin C.', 'https://media.istockphoto.com/id/1389128157/photo/lemon-fruit-with-leaf-isolated-whole-lemon-and-a-half-with-leaves-on-white-background-lemons.jpg?s=612x612', 1, 1, 0, 4.7, 156),
('Fresh Red Tomatoes', 'Vegetables', 40.00, NULL, '1 kg', 'Juicy, ripe red tomatoes straight from the farm.', 'https://doorkisan.com/wp-content/uploads/2016/05/upload_1e46ebbf78004709973c6b679673f94c.jpg', 1, 1, 0, 4.9, 312),
('Organic Baby Carrots', 'Vegetables', 35.00, NULL, '500 g', 'Sweet and crunchy baby carrots, packed with beta-carotene.', 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=300&h=200&fit=crop', 1, 1, 0, 4.5, 98),
('Fresh Watermelon (Whole)', 'Fruits', 79.00, 99.00, '3 kg', 'A sweet and juicy whole watermelon, perfect for summers.', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&h=200&fit=crop', 1, 0, 1, 4.8, 187),
('Black Seedless Grapes', 'Fruits', 89.00, 105.00, '500 g', 'Plump and sweet black seedless grapes. Rich in antioxidants.', 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=300&h=200&fit=crop', 1, 0, 1, 4.6, 143),
('Alphonso Mango (Pack)', 'Fruits', 1120.00, 1499.00, '1 kg', 'The king of mangoes! Rich, sweet flavour and smooth texture.', 'https://plantskingdom.in/cdn/shop/products/Background-hd-Mango-Wallpaper-Download.jpg?v=1657427057', 1, 0, 1, 5.0, 423),
('Mushrooms', 'Vegetables', 54.00, 60.00, '400 g', 'Fresh button mushrooms with a mild, earthy flavour.', 'https://m.media-amazon.com/images/I/71XMKwfQCzL.jpg', 0, 0, 1, 4.4, 76),
('Fresh Strawberries Punnet', 'Fruits', 99.00, 140.00, '250 g', 'Bright red, sweet strawberries fresh from the farm.', 'https://images.unsplash.com/photo-1543528176-61b239494933?w=300&h=200&fit=crop', 1, 0, 1, 4.7, 234),
('Extra Virgin Olive Oil', 'Grocery', 499.00, 609.00, '750 ml', 'Cold-pressed extra virgin olive oil with a rich, fruity flavour.', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&h=200&fit=crop', 1, 0, 1, 4.6, 189),
('Full Cream Milk', 'Dairy', 62.00, NULL, '1 litre', 'Fresh full cream milk from local farms.', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&h=200&fit=crop', 1, 0, 0, 4.8, 301),
('Paneer (Cottage Cheese)', 'Dairy', 89.00, NULL, '200 g', 'Soft and fresh paneer made from pure cow milk.', 'https://tiimg.tistatic.com/fp/1/004/926/fresh-white-panner-cheese--506.jpg', 1, 0, 0, 4.6, 112),
('Amul Butter', 'Dairy', 55.00, NULL, '100 g', 'Creamy salted butter made from pure milk.', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&h=200&fit=crop', 1, 0, 0, 4.7, 89),
('Curd (Dahi)', 'Dairy', 35.00, NULL, '400 g', 'Fresh homestyle curd, thick and creamy.', 'https://m.media-amazon.com/images/I/61pxAmmwV0L._AC_UF894,1000_QL80_.jpg', 1, 0, 0, 4.5, 67),
('Multigrain Bread', 'Bakery & Pastry', 48.00, NULL, '400 g', 'Healthy multigrain bread freshly baked every morning.', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=200&fit=crop', 1, 0, 0, 4.4, 112),
('Butter Croissant', 'Bakery & Pastry', 35.00, NULL, '2 pcs', 'Flaky, buttery croissants freshly baked.', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&h=200&fit=crop', 1, 0, 0, 4.5, 78),
('Orange Juice', 'Beverages', 75.00, NULL, '1 litre', 'Freshly squeezed orange juice, 100% natural.', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&h=200&fit=crop', 1, 0, 0, 4.6, 95),
('Green Tea', 'Beverages', 120.00, NULL, '25 bags', 'Premium green tea bags packed with antioxidants.', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=200&fit=crop', 1, 0, 0, 4.7, 134),
('Coconut Water', 'Beverages', 40.00, NULL, '200 ml', 'Natural coconut water, naturally sweet and hydrating.', 'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=300&h=200&fit=crop', 1, 0, 0, 4.8, 201),
('Basmati Rice', 'Grocery', 180.00, NULL, '1 kg', 'Premium aged basmati rice with a delicate aroma.', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=200&fit=crop', 1, 0, 0, 4.6, 167),
('Toor Dal', 'Grocery', 95.00, NULL, '500 g', 'High quality toor dal, rich in protein.', 'https://cpimg.tistatic.com/7482702/b/4/toor-dal.jpg', 1, 0, 0, 4.5, 88);


-- ── TABLE: addresses ──
-- Delivery addresses saved by each user
CREATE TABLE IF NOT EXISTS addresses (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(15),
  flat       VARCHAR(200) NOT NULL,
  street     VARCHAR(200) NOT NULL,
  city       VARCHAR(100) NOT NULL,
  pincode    VARCHAR(10)  NOT NULL,
  state      VARCHAR(100),
  type       ENUM('Home', 'Work', 'Other') DEFAULT 'Home',
  is_default TINYINT(1)   DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ── TABLE: orders ──
-- Every order placed by a customer
CREATE TABLE IF NOT EXISTS orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT           NOT NULL,
  order_number  VARCHAR(30)   NOT NULL UNIQUE,  -- e.g. ORD1718123456789
  status        ENUM('confirmed', 'packed', 'dispatched', 'delivered', 'cancelled')
                DEFAULT 'confirmed',
  subtotal      DECIMAL(10,2) NOT NULL,
  delivery_fee  DECIMAL(10,2) DEFAULT 49.00,
  tax           DECIMAL(10,2) DEFAULT 0.00,
  total         DECIMAL(10,2) NOT NULL,
  payment_method ENUM('upi', 'card', 'cod') NOT NULL,
  payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
  delivery_address TEXT        NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ── TABLE: order_items ──
-- Individual products inside each order
CREATE TABLE IF NOT EXISTS order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT           NOT NULL,
  product_id INT           NOT NULL,
  name       VARCHAR(200)  NOT NULL,  -- snapshot at time of order
  price      DECIMAL(10,2) NOT NULL,
  qty        INT           NOT NULL,
  image_url  VARCHAR(500),
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);


-- ── TABLE: coupons ──
-- Discount codes
CREATE TABLE IF NOT EXISTS coupons (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(30)   NOT NULL UNIQUE,
  type        ENUM('percent', 'flat') DEFAULT 'percent',
  discount    DECIMAL(10,2) NOT NULL,
  min_order   DECIMAL(10,2) DEFAULT 0,
  max_uses    INT           DEFAULT 100,
  used_count  INT           DEFAULT 0,
  expiry_date DATE,
  is_active   TINYINT(1)    DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default coupons
INSERT IGNORE INTO coupons (code, type, discount, min_order, max_uses, expiry_date) VALUES
  ('FRESH10', 'percent', 10, 200,  500, '2026-12-31'),
  ('SAVE20',  'percent', 20, 500,  200, '2026-12-31'),
  ('MART5',   'percent',  5, 100, 1000, '2026-12-31');


-- ── TABLE: serviceable_pincodes ──
-- Admin controls which pincodes get delivery
CREATE TABLE IF NOT EXISTS serviceable_pincodes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  pincode    VARCHAR(10) NOT NULL UNIQUE,
  area_name  VARCHAR(200),
  is_active  TINYINT(1)  DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default pincodes
INSERT IGNORE INTO serviceable_pincodes (pincode, area_name) VALUES
  ('400001', 'Mumbai - Fort'),
  ('400002', 'Mumbai - Kalbadevi'),
  ('400076', 'Mumbai - Powai'),
  ('411001', 'Pune - Shivajinagar'),
  ('411028', 'Pune - Kothrud'),
  ('411044', 'Pune - Hadapsar'),
  ('411057', 'Pune - Baner'),
  ('560001', 'Bangalore - MG Road'),
  ('560002', 'Bangalore - Shivajinagar'),
  ('110001', 'Delhi - Connaught Place'),
  ('110002', 'Delhi - Chandni Chowk'),
  ('500001', 'Hyderabad - Abids'),
  ('600001', 'Chennai - George Town'),
  ('700001', 'Kolkata - BBD Bagh'),
  ('380001', 'Ahmedabad - Lal Darwaja');


-- ── TABLE: settings ──
-- Key-value store for app-wide settings (e.g. shop open/close)
CREATE TABLE IF NOT EXISTS settings (
  `key`      VARCHAR(100) NOT NULL PRIMARY KEY,
  value      VARCHAR(500) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default: shop is open
INSERT IGNORE INTO settings (`key`, value) VALUES ('shop_open', '1');