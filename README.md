# Avril Forme Print Studio

Statement of Work (SOW) & UI Layout Design

Specifications

Project Name: Avril Forme E-Commerce & Custom Printing Platform

Brand Identity: Avril Forme

Primary Theme Palette: Rich Maroon (#800020) and Soft Nude / Cream (#FDF8F5)

Core Service: Custom e-commerce printing services (t-shirts, mugs, phone cases,

stationery, corporate merch) with unified admin store management.

1. Executive Summary & Architecture Overview

This Statement of Work (SOW) details the full visual design, layout architecture, and functional

specifications for the Avril Forme web application. The platform consists of two main portals:

1. Customer Storefront Portal: A high-converting, visually rich shop designed around a

modern maroon and nude aesthetic.

2. Single-Admin Control Center: A dedicated administrative dashboard allowing the sole

owner to manage print designs, fulfill custom orders, and monitor real-time payments.

2. Complete Color Palette & Design System

Element Color Name Hex Code / Spec Application Usage

Primary Brand

Color

Deep Wine Maroon #800020 Headers, primary

CTA buttons, active

state highlights,

Element Color Name Hex Code / Spec Application Usage

accents

Secondary

Background

Soft Nude / Cream #FDF8F5 Page section

backgrounds,

feature cards,

subtle container fills

Base Neutral Off-White / Light

Cream

#FAFAFA Main content

background, card

borders, form

backgrounds

Dark Neutral Charcoal Black #1A1A1A Body text,

high-contrast

typography, primary

headings

Accent Color Rose Gold / Warm

Gold

#E0A96D Star ratings,

promotional tags,

highlight badges

3. Customer Storefront Page Layout Specifications

3.1 Home Page Layout

The Home Page follows a structured visual layout adapted from high-performing e-commerce

showcases:

● Header / Top Nav: Maroon branding logo on left; center links for Home, Print Categories,

Custom Templates, Offers, About Us, Contact/Help; right side search bar, account sign-in

icon, and shopping cart counter.

● Hero Banner: Maroon-to-nude gradient with model/mockup graphics displaying custom

printed t-shirts and mugs. Includes primary CTA "Shop Prints Now" and secondary "Explore

Categories".

● Trust Value Strip: 4 nude-card columns highlighting 100% Quality Prints, Bulk & Single

Orders, Fast Shipping, and Easy Custom Uploads.

● Shop by Category Grid: 5-column layout showcasing Apparel, Drinkware, Phone Cases,

Stationery, and Corporate Merch.

● Promotional Banner: High-impact maroon container featuring up to 30% OFF bulk print

order offers.

● Best Sellers Grid: 5-column item cards complete with mockup images, pricing, star ratings,

and "Add to Cart / Customize" buttons.

● Footer Trust Bar & Footer: Secure payments, live support, and copyright details.

3.2 Print Categories Page

● Top Filter Sidebar (Left, 25% width): Category checkboxes (Apparel, Mugs, Phone Cases,

Stickers), price range sliders, material types (100% Cotton, Ceramic, Matte Plastic), and

color options.

● Main Grid Area (Right, 75% width):

○ Top Bar: Sort options (Popularity, Price Low to High, Newest Arrivals) and view toggle

(Grid/List).

○ 4-Column Responsive Grid: Each card features high-res print mockups, available

customization options badge, star reviews, pricing, and a maroon "Configure & Order"

CTA.

● Pagination Bar: Styled numbered navigation buttons in nude and maroon.

3.3 Custom Templates Page

● Hero Section: Nude background header stating "Choose a Design Template or Start From

Scratch".

● Template Category Tabs: Horizontal scrollable pills (e.g., Birthday, Corporate Branding,

Typography, Minimalist Art, Holidays).

● Interactive Template Grid (3-Column Layout):

○ Card Image: Pre-designed editable template artwork.

○ Hover Actions: "Use Template" (Maroon button) and "Preview on Mockup" (Outline

button).

○ Template Info: Title, creator tag, and supported print items (e.g., "Fits T-Shirts & Mugs").

3.4 Offers & Deals Page

● Hero Header: Maroon promotional banner with countdown timer for seasonal print sales.

● Active Coupon Section: Grid of coupon cards with dash-bordered borders (e.g.,

"PRINT20" for 20% off first print order) featuring a "Copy Code" button.

● Bulk Order Discount Tier Table:

Quantity Range Discount Percentage Eligible Items

1 - 9 Items Standard Price All Catalog Items

10 - 49 Items 15% OFF T-Shirts, Mugs, Phone

Cases

50+ Items 30% OFF All Products & Corporate

Packages

3.5 About Us Page

● Story Section: Split layout with a brand intro to Avril Forme on the left and a high-quality

photo of the printing process on the right.

● Craftsmanship & Quality Pillars: 3-column feature cards with nude backgrounds

explaining Ink Durability, Eco-friendly Fabrics, and Precision Color Matching.

● Behind the Press Video/Graphic Block: Full-width display showing the print production

workflow from digital design to final packaging.

3.6 Contact / Help Page

● Left Column (Contact Info & Support): Direct email address, customer service phone

number, operating hours, and location address.

● Right Column (Inquiry Form): Clean input fields for Name, Email, Order ID (optional),

Subject, and Message with a maroon "Send Inquiry" button.

● FAQ Accordion Section: Expandable questions covering artwork file requirements (PNG,

SVG, 300 DPI), shipping timelines, and return policies.

4. Authentication & Access Control Architecture

4.1 Customer Register / Login Page

● Layout: Split screen layout. Left side features maroon branding with Avril Forme graphics;

right side features the clean sign-in container.

● Customer Features: Options to Register (Name, Email, Password, Shipping Address) or

Login. Includes social login shortcuts (Google, Apple).

4.2 Admin Login Page (Restricted Single-User Portal)

● Dedicated Route: Accessible via a specialized secure path (e.g., /avril-admin).

● Authentication Controls:

○ No registration option exists on this page; account creation is locked.

○ Pre-configured master admin credentials with mandatory Multi-Factor Authentication

(MFA).

○ System locks out IP after consecutive failed authentication attempts.

5. Admin Dashboard Architecture & Management Tools

5.1 Admin Dashboard Overview Layout

The Admin Dashboard mirrors the refined maroon/nude aesthetic of the storefront while using

an enterprise control panel structure:

● Sidebar Navigation (Left, Fixed maroon background): Logo, Dashboard Overview,

Manage Print Designs, Orders & Fulfillment, Payment Tracking, Customer List, Settings.

● Top KPI Metric Cards (4-Column Layout):

1. Total Revenue (Current Month)

2. Pending Orders / Ready for Print

3. Total Print Designs Uploaded

4. Completed Shipments

● Main Activity Feed: Recent customer orders table and quick upload design panel.

5.2 Print Design Management Module

● Design Upload Suite: Drag-and-drop file uploader accepting high-res artwork files (PNG,

SVG, AI, PSD).

● Mockup Generator Mapping: Admin tools to select default mockup items (e.g., map

graphic to T-Shirt front, Mug wrap, or Phone Case back), set default pricing, and assign

categories.

● Inventory & Product Catalog Table: List view of all uploaded prints with status toggles

(Active, Draft, Out of Stock).

5.3 Order Processing & Fulfillment Suite

Order ID Customer Print Items Print

Status

Payment

State

Actions

#AF-1082 Sarah

Jenkins

1x Custom

Mug, 2x

Graphic

Tees

In

Production

Paid

(Stripe)

View

Artwork /

Update

Status

#AF-1083 Corporate

Client

50x

Branded

Phone

Cases

Awaiting

Print

Paid

(Mobile

Money)

Download

Vector Files

5.4 Payment Tracking & Financial Reporting

● Payment Logs: Real-time transaction history showing payment gateways (Stripe, Mobile

Money, Cards), net payout totals, and transaction IDs.

● Revenue Analytics Graph: Visual sales trends filterable by daily, weekly, or monthly date

ranges. it is not a single paged web app but a multi paged interactive web app

This project was scaffolded for Avril Forme. Continue development locally using the instructions below.

- **Development**: use the scripts in package.json to run, build, lint, and format the project.
- **Local edits**: changes can be made and committed normally using Git.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Backend & Environment

This project includes server-side helpers for MongoDB, JWT auth, and Stripe Checkout.

1. Copy the example env file and fill in values:

```sh
cp .env.example .env
# then edit .env and set MONGODB_URI, ADMIN_EMAIL, ADMIN_PASS, STRIPE keys, and JWT_SECRET
```

2. Install additional server dependencies required for the backend helpers:

```sh
npm install mongodb jsonwebtoken bcryptjs stripe
```

3. The project includes a small API router mounted in src/server.ts that handles:

- POST /api/auth/login           — customer login (sets HttpOnly session cookie)
- POST /api/auth/admin-login     — admin login (single-user admin via ADMIN_EMAIL/ADMIN_PASS)
- POST /api/auth/logout          — clears the session cookie
- POST /api/payment/create-checkout — creates a Stripe Checkout session (expects items array)

4. Database collections used (create in MongoDB Atlas):

- users — fields: { email, name, passwordHash }

5. Notes

- Admin accounts are not registered in-app; use ADMIN_EMAIL and ADMIN_PASS from environment.
- JWT_SECRET must be set to a secure random string in production.
- Stripe keys and MongoDB credentials must be kept out of source control. Use .env or a secrets manager.
