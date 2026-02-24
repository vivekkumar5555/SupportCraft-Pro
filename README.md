# White-Label AI Support Widget

A complete MERN stack solution for creating embeddable AI-powered customer support widgets. This project provides a production-ready chatbot that can be trained on your FAQ and product data, with a clean admin interface and an easily embeddable widget for any website.

## 🚀 Features

- **AI-Powered Chatbot**: Uses OpenAI embeddings for intelligent responses
- **Real-time Chat**: Socket.io for instant messaging experience
- **Admin Dashboard**: React-based interface for managing FAQs and settings
- **Embeddable Widget**: Single script tag integration for any website
- **Multi-tenant Support**: White-label solution for multiple businesses
- **File Upload Support**: TXT, CSV, and PDF document processing
- **Vector Search**: MongoDB-based similarity search with cosine similarity
- **Customizable Branding**: Colors, logos, and messaging
- **Rate Limiting**: Built-in protection against abuse
- **JWT Authentication**: Secure admin access

## 📁 Project Structure

```
whitelabel-ai-support-widget/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middlewares/     # Auth, rate limiting
│   │   └── utils/           # File parsing, seeding
│   └── package.json
├── admin-frontend/          # React admin dashboard
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Main pages
│   │   ├── hooks/           # Custom React hooks
│   │   └── services/        # API client
│   └── package.json
├── widget/                  # Embeddable widget
│   ├── widget-app/          # React widget source
│   ├── loader.js            # Widget loader script
│   └── package.json
└── README.md
```

## 🛠️ Tech Stack

### Backend

- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **Socket.io** for real-time communication
- **OpenAI API** for embeddings and chat completion
- **JWT** for authentication
- **Multer** for file uploads
- **Rate limiting** and security middleware

### Frontend (Admin)

- **React 18** with Vite
- **TailwindCSS** for styling
- **React Query** for data fetching
- **React Router** for navigation
- **React Hook Form** for form handling

### Widget

- **React 18** with Webpack
- **Socket.io Client** for real-time chat
- **Embeddable** single script integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or cloud)
- OpenAI API key

### 1. Clone and Install

```bash
git clone <repository-url>
cd whitelabel-ai-support-widget
npm run install:all
```

### 2. Environment Setup

Copy the environment example file:

```bash
cp backend/env.example backend/.env
```

Edit `backend/.env` with your configuration:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/support-widget
JWT_SECRET=your-super-secret-jwt-key-change-in-production
OPENAI_API_KEY=your-openai-api-key
FRONTEND_URL=http://localhost:3000
WIDGET_ORIGIN=*
NODE_ENV=development
```

### 3. Database Setup

Start MongoDB (if running locally):

```bash
# macOS with Homebrew
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 4. Seed Sample Data

```bash
cd backend
npm run seed
```

This creates:

- Demo tenant with widget key
- Admin user: `admin@demo.com` / `admin123`
- Regular user: `user@demo.com` / `user123`
- Sample FAQ documents with embeddings

### 5. Start Development Servers

```bash
# Start all services
npm run dev

# Or start individually:
npm run backend:dev    # Backend on :5000
npm run admin:dev      # Admin frontend on :3000
```

### 6. Build Widget

```bash
cd widget
npm run build
npm run serve  # Serves widget on :8080
```

## 📖 Usage

### Admin Dashboard

1. Visit `http://localhost:3000`
2. Login with `admin@demo.com` / `admin123`
3. Upload FAQ documents (TXT, CSV, PDF)
4. Test chat functionality
5. Customize branding and settings
6. Copy widget embed code

### Widget Integration

Add this script tag to any website:

```html
<script
  src="http://localhost:8080/loader.js"
  data-widget-key="your-widget-key-here"
></script>
```

### Customization Options

```html
<script
  src="http://localhost:8080/loader.js"
  data-widget-key="your-widget-key"
  data-position="bottom-right"
  data-primary-color="#3B82F6"
  data-bot-name="My Support Bot"
  data-welcome-message="Hi! How can I help you?"
></script>
```

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Admin

- `POST /api/admin/upload` - Upload documents
- `GET /api/admin/documents` - List documents
- `DELETE /api/admin/documents/:id` - Delete document
- `PUT /api/admin/settings` - Update settings
- `GET /api/admin/analytics` - Get analytics

### Chat

- `POST /api/chat/query` - Send chat message
- `POST /api/chat/test` - Test chat (admin)
- `GET /api/chat/validate/:key` - Validate widget key

> **Note:** the seed script now respects a `WIDGET_KEY` environment variable so you can keep a constant key across reseeds. Otherwise a new UUID will be generated each time.

### WebSocket

- `GET /ws/chat` - Real-time chat namespace

## 🗄️ Database Models

### User

- Authentication and profile information
- Linked to tenant

### Tenant

- Business/organization settings
- Widget configuration
- Branding options
- Usage limits

### Document

- Uploaded FAQ documents
- Processing status
- Metadata

### Embedding

- Text chunks with vector embeddings
- Similarity search data
- Linked to documents

## 🔒 Security Features

- **JWT Authentication** for admin access
- **Rate Limiting** on chat endpoints
- **Input Validation** and sanitization
- **File Type Validation** for uploads
- **CORS Configuration** for cross-origin requests
- **Helmet.js** for security headers

## 🚀 Deployment

### Quick Deploy to Render (Recommended)

Deploy all services to Render in 30 minutes! 🚀

📘 **[Complete Render Deployment Guide](./RENDER_DEPLOYMENT.md)**  
✅ **[Quick Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)**

**One-Click Deploy:**

1. Fork this repository to your GitHub
2. Sign up at [Render.com](https://render.com)
3. Create new Blueprint → Connect repository
4. Render will auto-detect `render.yaml`
5. Add MongoDB URI and OpenAI API key
6. Deploy! ✨

**What you get:**

- ✅ Backend API (Free/Starter tier)
- ✅ Admin Dashboard (Free static site)
- ✅ Chat Widget (Free static site)
- ✅ Automatic HTTPS
- ✅ Auto-deploy on git push
- ✅ Built-in monitoring

**Cost:** $0/month (Free tier) or $7/month (Starter)

---

### Manual Deployment

#### Backend Deployment

1. Set production environment variables
2. Build and start the server:

```bash
cd backend
npm run build
npm start
```

#### Frontend Deployment

1. Build the admin frontend:

```bash
cd admin-frontend
npm run build
```

2. Serve the `dist` folder with a web server

#### Widget Deployment

1. Build the widget:

```bash
cd widget
npm run build
```

2. Upload `build/` contents to your CDN
3. Update the loader script URL in your embed code

#### Environment Variables (Production)

```env
NODE_ENV=production
MONGO_URI=mongodb://your-production-mongo-uri
JWT_SECRET=your-production-jwt-secret
OPENAI_API_KEY=your-openai-api-key
FRONTEND_URL=https://your-admin-domain.com
WIDGET_ORIGIN=https://your-widget-domain.com
```

## 📊 Monitoring and Analytics

The system includes built-in analytics for:

- Document processing status
- Embedding counts
- Query usage
- Error tracking

Access analytics through the admin dashboard or API endpoints.

## 🔧 Customization

### Adding New File Types

1. Update `backend/src/utils/fileParser.js`
2. Add new parsing function
3. Update validation in `adminController.js`

### Custom Embedding Models

1. Modify `backend/src/services/embeddingService.js`
2. Update embedding dimensions in models
3. Adjust similarity calculations

### Widget Styling

1. Edit `widget/widget-app/Widget.jsx`
2. Modify CSS-in-JS styles
3. Add new configuration options

## 🐛 Troubleshooting

### Common Issues

1. **Widget not loading**: Check widget key and CORS settings
2. **Chat not responding**: Verify OpenAI API key and rate limits
3. **File upload fails**: Check file size and type restrictions
4. **Socket connection issues**: Verify WebSocket URL and firewall settings

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

### Logs

Check application logs for:

- MongoDB connection issues
- OpenAI API errors
- File processing problems
- Authentication failures

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:

- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

## 🔮 Roadmap

- [ ] Vector database integration (Pinecone, Weaviate)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Voice chat integration
- [ ] Mobile app for admins
- [ ] Advanced widget customization
- [ ] A/B testing for responses
- [ ] Integration with popular CRM systems

---

**Built with ❤️ for modern customer support**
