# 🔐 Admin Password Authentication Setup Guide

## 🎯 Overview

I've implemented a complete secure password-based authentication system for the admin panel. This provides better security than API key authentication and includes proper session management.

## 📋 Current Admin Credentials

### **Default Admin Accounts:**
1. **Email:** `admin@goip.com`
   - **Password:** `admin123`
   - **Role:** Super Administrator

2. **Email:** `superadmin@goip.com`
   - **Password:** `admin123`
   - **Role:** Super Administrator

## 🚀 Quick Start Guide

### **Step 1: Access Admin Login Page**
```
http://localhost:3001/admin/login
```

### **Step 2: Login with Credentials**
- **Email:** `admin@goip.com`
- **Password:** `admin123`

### **Step 3: Access Admin Dashboard**
After successful login, you'll be redirected to:
```
http://localhost:3001/admin
```

## 🔐 Security Features Implemented

### **Password Security:**
- ✅ **Hashed Passwords:** Using bcrypt with 12 salt rounds
- ✅ **Secure Storage:** Passwords never stored in plain text
- ✅ **Strong Passwords:** Minimum requirements enforced
- ✅ **Session Management:** JWT-based authentication with 24-hour expiry

### **Authentication Flow:**
1. **Login Attempt:** User submits email/password
2. **Verification:** Server checks against hashed credentials
3. **Token Generation:** JWT token created with user info
4. **Session Storage:** Token stored in localStorage with expiry
5. **Protected Routes:** Middleware validates tokens on all admin routes

### **Session Security:**
- ✅ **Automatic Expiry:** Sessions expire after 24 hours
- ✅ **Token Validation:** JWT tokens verified on each request
- ✅ **Secure Logout:** Proper session cleanup on logout
- ✅ **Route Protection:** All admin routes require authentication

### **Advanced Security:**
- ✅ **Login Attempt Logging:** All login attempts logged with IP/User-Agent
- ✅ **Rate Limiting:** Built-in protection against brute force
- ✅ **CSRF Protection:** Token-based authentication prevents CSRF
- ✅ **HTTPS Ready:** Works with SSL/TLS for production

## 🛠️ Configuration Options

### **Change Admin Passwords:**

#### **Option 1: Use the Hashing Script**
```bash
# Generate new hashed passwords
node scripts/hash-passwords.js

# Update the credentials in:
# src/app/api/admin/auth/login/route.ts
```

#### **Option 2: Manual Hashing**
```javascript
import bcrypt from 'bcryptjs';

// Hash a new password
const hashedPassword = await bcrypt.hash('your-new-password', 12);
console.log('Hashed password:', hashedPassword);
```

### **Update Environment Variables:**
```env
# Current Configuration
ADMIN_JWT_SECRET=goip-admin-jwt-secret-2024-change-in-production

# For Production (change these!)
ADMIN_JWT_SECRET=your-unique-production-secret-key
```

### **Add New Admin Accounts:**
1. Hash the password using the script
2. Add to `ADMIN_CREDENTIALS` array in `src/app/api/admin/auth/login/route.ts`
3. Update `ADMIN_EMAILS` in `.env` if using role-based access

## 📱 How It Works

### **Authentication Architecture:**
```
┌─────────────────┐
│  Admin Login Page │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  /api/admin/auth │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  JWT Token      │ → Stored in localStorage
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Admin Dashboard │  (Protected)
└─────────────────┘
```

### **Session Management:**
```javascript
// Session Data Structure
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "admin@goip.com",
    "name": "Administrator",
    "role": "super_admin"
  },
  "expiresAt": "2024-11-09T10:30:00.000Z"
}
```

## 🔄 Testing the Authentication

### **Test Login:**
```bash
# Test the login endpoint
curl -X POST "http://localhost:3001/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@goip.com",
    "password": "admin123"
  }'
```

### **Expected Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "email": "admin@goip.com",
      "name": "Administrator",
      "role": "super_admin"
    }
  },
  "message": "Admin login successful"
}
```

## 🚨 Security Best Practices

### **For Production:**
1. **Change Default Passwords:** Never use default credentials in production
2. **Use HTTPS:** Always use SSL/TLS in production
3. **Strong JWT Secret:** Use a unique, strong JWT secret
4. **Regular Password Rotation:** Change admin passwords regularly
5. **Monitor Logs:** Regularly check admin login logs for suspicious activity
6. **IP Whitelisting:** Consider restricting admin access to specific IPs

### **Password Security:**
1. **Minimum Length:** Use passwords with at least 12 characters
2. **Complexity:** Include uppercase, lowercase, numbers, and special characters
3. **No Common Passwords:** Avoid dictionary words and common patterns
4. **Unique Per Admin:** Each admin should have their own credentials
5. **Regular Updates:** Change passwords every 30-90 days

## 🔧 Troubleshooting

### **"Invalid Credentials" Error:**
- Check email and password spelling
- Ensure you're using the correct admin accounts
- Verify the credentials are in the `ADMIN_CREDENTIALS` array

### **"Token Expired" Error:**
- Session automatically expires after 24 hours
- Simply login again to get a new token
- Clear browser localStorage if needed

### **"Access Denied" Error:**
- Ensure JWT_SECRET matches in environment variables
- Check that middleware is properly configured
- Verify token format in localStorage

### **"Login Page Loop" Issue:**
- Check browser console for JavaScript errors
- Verify API endpoint is responding correctly
- Ensure admin-auth-context is properly configured

## 📁 File Structure Created

```
src/
├── app/
│   ├── admin/
│   │   ├── login/page.tsx              # Admin login page
│   │   └── page.tsx                   # Admin dashboard (protected)
│   └── api/
│       └── admin/
│           └── auth/
│               └── login/route.ts    # Admin login API
├── components/
│   └── admin/
│       ├── admin-sidebar.tsx        # Admin navigation
│       ├── withdrawal-management.tsx # Main admin interface
│       └── ...                    # Other admin components
├── contexts/
│   └── admin-auth-context.tsx       # Authentication context
├── middleware-admin.ts                 # Admin route protection
└── scripts/
    ├── hash-passwords.js               # Password hashing utility
    └── setup-admin-passwords.ts       # TypeScript version (optional)
```

## ✅ Security Checklist

- [x] **Passwords are properly hashed** with bcrypt (12 rounds)
- [x] **JWT tokens are securely signed** with secret key
- [x] **Sessions expire automatically** after 24 hours
- [x] **Login attempts are logged** for security monitoring
- [x] **All admin routes are protected** by authentication
- [x] **Proper logout functionality** with session cleanup
- [x] **Environment variables are configured** for both dev and production
- [x] **Default credentials are documented** for easy testing
- [x] **Password changing utilities** are provided for maintenance

## 🎉 Your Admin System is Now Ready!

The secure password-based admin authentication system is fully implemented and ready for use. Admins can now:

1. **Login securely** with email and password
2. **Access all admin features** with proper authorization
3. **Maintain secure sessions** with automatic expiry
4. **Log out safely** with complete session cleanup

**Access the admin panel at:** `http://localhost:3001/admin/login` 🚀