# CloudIDE+ Project Structure

This document outlines the monorepo structure for CloudIDE+, a cloud-based IDE inspired by Visual Studio Code.

## Root Directory Structure

```
FinalProject/
├── frontend/                 # React.js frontend application
├── backend/                  # Node.js backend API server
├── docs/                     # Project documentation
├── scripts/                  # Build and deployment scripts
├── README.md                 # Main project documentation
├── ROADMAP.md               # Development roadmap
├── LICENSE                  # MIT License
├── package.json             # Root package.json for monorepo
├── .gitignore              # Git ignore rules
└── PROJECT_STRUCTURE.md    # This file
```

## Frontend Structure (`/frontend`)

The frontend is a React.js single-page application with Monaco Editor integration.

```
frontend/
├── public/                  # Static assets
├── src/
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── services/          # API service layers
│   ├── utils/             # Utility functions
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React contexts
│   ├── styles/            # CSS/SCSS files
│   └── App.js             # Main App component
├── package.json           # Frontend dependencies
└── README.md              # Frontend documentation
```

## Backend Structure (`/backend`)

The backend is a Node.js API server with Express.js framework.

```
backend/
├── src/
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   ├── models/           # Data models
│   ├── routes/           # API routes
│   ├── services/         # Business logic services
│   ├── utils/            # Utility functions
│   ├── config/           # Configuration files
│   └── app.js            # Main application entry
├── tests/                # Backend tests
├── package.json          # Backend dependencies
└── README.md             # Backend documentation
```

## Documentation Structure (`/docs`)

```
docs/
├── PROJECT_STRUCTURE.md    # This file
├── API_DOCUMENTATION.md    # API endpoints documentation
├── DEPLOYMENT_GUIDE.md     # Deployment instructions
├── DEVELOPMENT_GUIDE.md    # Development setup guide
├── GOOGLE_CLOUD_SETUP.md   # Google Cloud configuration
├── FIREBASE_SETUP.md       # Firebase configuration
└── TROUBLESHOOTING.md      # Common issues and solutions
```

## Scripts Structure (`/scripts`)

```
scripts/
├── deploy.js              # Deployment script for GCP
├── setup.js               # Initial project setup
├── build.js               # Build script
└── test.js                # Testing utilities
```

## Key Technologies by Component

### Frontend
- **React.js**: Main frontend framework
- **Monaco Editor**: VS Code editor component
- **Firebase SDK**: Authentication and database
- **Google APIs**: Drive API integration
- **Zoho SalesIQ**: Live chat widget

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **Firebase Admin SDK**: Server-side Firebase operations
- **Google Cloud APIs**: Compute Engine, Storage
- **Cloudflare**: CDN and security

### Infrastructure
- **Google Compute Engine**: VM hosting
- **Firebase**: Authentication, database, storage
- **Google Drive API**: File operations
- **Cloudflare**: CDN, SSL, DDoS protection
- **Zoho SalesIQ**: Live chat and analytics

## Development Workflow

1. **Development**: Use `npm run dev` to start both frontend and backend
2. **Testing**: Use `npm run test` to run all tests
3. **Building**: Use `npm run build` to create production builds
4. **Deployment**: Use `npm run deploy` to deploy to Google Cloud

## Environment Configuration

Each component has its own environment configuration:

- Frontend: `.env` files for React environment variables
- Backend: `.env` files for server configuration
- Root: Global configuration for deployment scripts

## Monorepo Management

This project uses npm workspaces for monorepo management:

- Root `package.json` contains workspace configuration
- Shared dependencies are hoisted to the root
- Individual packages maintain their own dependencies
- Scripts can be run from root or individual packages

## Next Steps

1. Set up frontend React application (Day 2-3)
2. Set up backend Node.js server (Day 2-3)
3. Configure Firebase project (Day 3-4)
4. Set up Google Cloud services (Day 5-6)
5. Deploy to Google Compute Engine (Day 6)