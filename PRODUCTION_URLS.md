# 🚀 Production URLs Configuration

Your application has been configured with the following production URLs:

## 📍 Your Deployment URLs

| Service            | URL                                                          |
| ------------------ | ------------------------------------------------------------ |
| **Backend API**    | https://supportcraft-pro-support-widget-backend.onrender.com |
| **Admin Frontend** | https://supportcraft-pro.onrender.com/                       |
| **Widget**         | https://supportcraft-pro-widget.onrender.com/                |

---

## ✅ Files Updated

### 1. **Widget Loader** (`widget/loader.js`)

Updated the configuration to use production URLs:

```javascript
const CONFIG = {
  apiUrl: "https://supportcraft-pro-support-widget-backend.onrender.com/api",
  wsUrl: "https://supportcraft-pro-support-widget-backend.onrender.com",
  widgetUrl: "https://supportcraft-pro-widget.onrender.com/widget.js",
  version: "1.0.0",
};
```

### 2. **Admin Frontend API** (`admin-frontend/src/services/api.js`)

Updated to use environment-based configuration:

```javascript
import { ENV } from "../config";

const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### 3. **Admin Frontend Config** (`admin-frontend/src/config.js`) - NEW FILE

Created configuration file that automatically switches between development and production:

```javascript
const isProduction = import.meta.env.MODE === "production";

export const API_CONFIG = {
  baseURL: isProduction
    ? "https://supportcraft-pro-support-widget-backend.onrender.com/api"
    : "/api",
  timeout: 30000,
};
```

---

## 🔧 Backend Environment Variables

Make sure your backend on Render has these environment variables set:

| Variable         | Value                                   |
| ---------------- | --------------------------------------- |
| `NODE_ENV`       | `production`                            |
| `PORT`           | `10000`                                 |
| `MONGO_URI`      | Your MongoDB Atlas connection string    |
| `JWT_SECRET`     | Your JWT secret                         |
| `OPENAI_API_KEY` | Your OpenAI API key                     |
| `FRONTEND_URL`   | `https://supportcraft-pro.onrender.com` |
| `WIDGET_ORIGIN`  | `*` (or specify your domains)           |

---

## 📦 Deployment Steps

### 1. Rebuild Widget

```bash
cd widget
npm run build
```

This will create the production build with the updated URLs.

### 2. Rebuild Admin Frontend

```bash
cd admin-frontend
npm run build
```

This will build the frontend with production configuration.

### 3. Commit and Push Changes

```bash
git add .
git commit -m "Update production URLs for Render deployment"
git push origin main
```

Render will automatically detect the changes and redeploy all services.

---

## 🎯 Widget Embed Code

Use this code to embed your widget on any website:

```html
<!-- SupportCraft Pro Widget -->
<script
  src="https://supportcraft-pro-widget.onrender.com/loader.js"
  data-widget-key="YOUR_WIDGET_KEY_HERE"
  data-position="bottom-right"
  data-primary-color="#3B82F6"
  data-bot-name="Support Bot"
></script>
```

### Get Your Widget Key:

1. Visit: https://supportcraft-pro.onrender.com/
2. Login with your credentials
3. Go to **Settings** page
4. Copy your widget key
5. Replace `YOUR_WIDGET_KEY_HERE` in the embed code above

---

## ✅ Testing Checklist

After deployment, verify everything works:

- [ ] **Backend API**

  ```bash
  curl https://supportcraft-pro-support-widget-backend.onrender.com/
  ```

- [ ] **Admin Frontend**

  - Visit: https://supportcraft-pro.onrender.com/
  - Login with: `admin@demo.com` / `admin123`
  - Upload a test document
  - Test the chat functionality

- [ ] **Widget**
  - Create a test HTML page with the embed code
  - Open it in a browser
  - Click the widget icon
  - Send a test message
  - Verify bot responds correctly

---

## 🔄 How It Works

### Development Mode

- Admin Frontend uses proxy: `/api` → `http://localhost:5000/api`
- Widget uses: `http://localhost:8080/widget.js`
- Backend runs on: `http://localhost:5000`

### Production Mode

- Admin Frontend uses: `https://supportcraft-pro-support-widget-backend.onrender.com/api`
- Widget uses: `https://supportcraft-pro-widget.onrender.com/widget.js`
- Backend runs on: `https://supportcraft-pro-support-widget-backend.onrender.com`

The configuration automatically switches based on `NODE_ENV` and Vite's build mode.

---

## 🐛 Troubleshooting

### Issue: Admin frontend can't connect to backend

**Check:**

1. Backend is deployed and running
2. CORS is configured (check `FRONTEND_URL` env variable)
3. Browser console for errors (F12)
4. Network tab shows correct API URL

**Fix:**

```bash
# Verify backend URL in config
cat admin-frontend/src/config.js
```

### Issue: Widget not loading

**Check:**

1. Widget build is complete
2. Loader.js has correct URLs
3. Widget key is valid
4. Backend WebSocket is accessible

**Fix:**

```bash
# Rebuild widget
cd widget
npm run build
git add .
git commit -m "Rebuild widget"
git push origin main
```

### Issue: CORS errors

**Fix in Backend Environment Variables:**

```
FRONTEND_URL=https://supportcraft-pro.onrender.com
WIDGET_ORIGIN=*
```

Then redeploy backend.

---

## 📊 Monitoring

### Check Backend Logs

1. Go to: https://dashboard.render.com
2. Select: `supportcraft-pro-support-widget-backend`
3. Click: **Logs** tab
4. Monitor for errors

### Check Frontend Build

1. Go to: https://dashboard.render.com
2. Select: `supportcraft-pro`
3. Click: **Logs** tab
4. Verify build succeeded

### Check Widget Build

1. Go to: https://dashboard.render.com
2. Select: `supportcraft-pro-widget`
3. Click: **Logs** tab
4. Verify build succeeded

---

## 🔐 Security Checklist

After deployment:

- [ ] Change default admin password (`admin123`)
- [ ] Update `JWT_SECRET` to a strong secret
- [ ] Update `WIDGET_ORIGIN` to specific domains (not `*`)
- [ ] Enable MongoDB IP whitelist (production)
- [ ] Review CORS settings
- [ ] Monitor API usage
- [ ] Set up backup schedule

---

## 🚀 Next Steps

1. ✅ URLs are configured
2. ⏳ Commit and push changes
3. ⏳ Wait for Render to redeploy (~5 minutes)
4. ⏳ Test all functionality
5. ⏳ Embed widget on your website
6. ⏳ Upload FAQ documents
7. ⏳ Customize branding

---

## 📞 Quick Links

- **Admin Dashboard**: https://supportcraft-pro.onrender.com/
- **Backend API**: https://supportcraft-pro-support-widget-backend.onrender.com/
- **Widget Demo**: Create test.html with embed code
- **Render Dashboard**: https://dashboard.render.com

---

**Status**: ✅ Configuration Complete  
**Next Action**: Commit changes and push to trigger Render deployment

```bash
git add .
git commit -m "Configure production URLs"
git push origin main
```

Your application will be live in ~5 minutes! 🎉
