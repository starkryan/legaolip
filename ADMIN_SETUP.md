# Admin Access Setup Guide

## 🔐 Admin Credentials Configuration

### Current Admin Credentials:

**Admin API Key:** `admin-secret-key-2024`
**Admin Emails:** `admin@goip.com`, `superadmin@goip.com`

## 🚀 How to Access Admin Panel

### Method 1: Direct API Access (for testing)
```bash
# View pending withdrawals
curl -X GET "http://localhost:3001/api/admin/withdrawals/pending?adminKey=admin-secret-key-2024"

# Approve withdrawal
curl -X POST "http://localhost:3001/api/admin/withdrawals/approve" \
  -H "Authorization: Bearer admin-secret-key-2024" \
  -H "Content-Type: application/json" \
  -d '{"withdrawalId": "ID_HERE", "transactionId": "TXN123", "referenceNumber": "REF123"}'
```

### Method 2: Web Dashboard (Recommended)
1. **Create Admin User Account:**
   - Go to: `http://localhost:3001/signup`
   - Email: `admin@goip.com`
   - Password: `your-secure-password`
   - Sign up for the account

2. **Login to Admin Dashboard:**
   - Go to: `http://localhost:3001/login`
   - Email: `admin@goip.com`
   - Password: `your-secure-password`
   - After login, navigate to: `http://localhost:3001/admin`

## 🔧 Configuration Options

### Option A: Change Admin API Key
Edit `.env` file:
```env
ADMIN_KEY=your-new-secure-admin-key-2024
```

### Option B: Change Admin Emails
Edit `.env` file:
```env
ADMIN_EMAILS=your-admin@company.com,manager@company.com
```

### Option C: Create Multiple Admin Accounts
1. Create user accounts with admin emails:
   - `admin@yourcompany.com`
   - `manager@yourcompany.com`
   - `support@yourcompany.com`

2. Add these emails to `.env`:
   ```env
   ADMIN_EMAILS=admin@yourcompany.com,manager@yourcompany.com,support@yourcompany.com
   ```

## 🛡️ Security Recommendations

### For Production Environment:
1. **Change Default Admin Key:**
   ```env
   ADMIN_KEY=prod-secure-key-change-this-in-production
   ```

2. **Use Strong Admin Email:**
   ```env
   ADMIN_EMAILS=admin@yourdomain.com
   ```

3. **Enable HTTPS in Production:**
   ```env
   BETTER_AUTH_URL=https://yourdomain.com
   NEXT_PUBLIC_AUTH_URL=https://yourdomain.com
   ```

## 📱 Mobile Admin Access

The admin dashboard is responsive and works on mobile devices:
- Access via mobile browser
- Full functionality available
- Optimized for touch interactions

## 🔍 Admin Features Available

### Withdrawal Management:
- ✅ View all pending withdrawal requests
- ✅ Approve withdrawals with transaction tracking
- ✅ Reject withdrawals with automatic refunds
- ✅ View withdrawal history and statistics
- ✅ Filter and search withdrawals
- ✅ Export withdrawal data

### User Management:
- ✅ View user statistics
- ✅ Monitor user activity
- 🚧 Advanced user management (coming soon)

### Analytics:
- ✅ System health monitoring
- ✅ Revenue statistics
- ✅ Activity logs
- 🚧 Advanced analytics (coming soon)

## 🚨 Important Security Notes

1. **Never share your admin API key** in public repositories
2. **Use strong passwords** for admin user accounts
3. **Regularly rotate admin credentials** in production
4. **Monitor admin activity logs** for suspicious actions
5. **Limit admin access** to authorized personnel only

## 🆘 Troubleshooting

### "Access Denied" Error:
- Ensure you're logged in with an admin email
- Check that your email is in the `ADMIN_EMAILS` list
- Verify you're using the correct admin API key for API calls

### "Unauthorized" Error:
- Check your Bearer token format: `Bearer admin-secret-key-2024`
- Verify the admin key matches your `.env` configuration
- Ensure API endpoints are correctly formatted

### Admin Dashboard Not Loading:
- Verify the development server is running on port 3001
- Check browser console for JavaScript errors
- Ensure you're logged in with admin credentials

## 📞 Support

For admin access issues:
1. Check this guide first
2. Review the error messages in browser console
3. Verify your `.env` configuration
4. Test API endpoints with curl commands first