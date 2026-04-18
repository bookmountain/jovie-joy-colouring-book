# Jovie Joy – Admin & Auth Implementation

## 1. Google OIDC Login
- [x] Backend: validate `id_token` via OIDC (Google JWKS) instead of calling userinfo
- [x] Frontend: add "Sign in" button to TopNav (show avatar when logged in)
- [x] Frontend: create `/login` page with Google sign-in button

## 2. Admin Authentication
- [x] Backend: add `IsAdmin` + `PasswordHash` to `User` entity
- [x] Backend: add `SiteContent` entity
- [x] Backend: EF migration (`AdminAndContent`)
- [x] Backend: update `AppDbContext` (SiteContent DbSet + new User columns)
- [x] Backend: update `TokenService` — add `role=admin` claim when `IsAdmin`
- [x] Backend: add `POST /auth/admin/login` to `AuthController`
- [x] Backend: update `DbSeeder` — seed admin user + default site content
- [x] Backend: add `[Authorize(Roles="admin")]` policy wiring in `Program.cs`
- [x] Frontend: create `/admin/login` page
- [x] Frontend: create `/admin/layout.tsx` (sidebar, auth guard)

## 3. Product Dashboard + Analytics
- [x] Backend: `AdminProductsController` — GET/POST/PUT/DELETE + PDF upload
- [x] Backend: `AdminAnalyticsController` — summary stats + paginated orders
- [x] Backend: static file serving for `/uploads` folder
- [x] Frontend: `/admin` page (analytics overview — revenue, orders, top products)
- [x] Frontend: `/admin/products` page (product list, create form, edit, PDF upload)
- [x] Frontend: `/admin/orders` page (order table with status)

## 4. Content Management
- [x] Backend: `AdminContentController` — GET/PUT text content + image upload
- [x] Backend: public `GET /api/content` endpoint
- [x] Frontend: `/admin/content` page (edit hero text, about section, upload photos)
- [x] Frontend: update home page to fetch dynamic content from API
- [x] Frontend: update about page to fetch dynamic content from API
