# CloudIDE+ Quick Start Guide

🚀 **Get CloudIDE+ running in under 5 minutes!**

## Prerequisites

- **Docker & Docker Compose** installed and running
- **Git** for version control
- **Node.js 18+** (optional, for local development)
- **4GB RAM** minimum, 8GB recommended

## 🏃‍♂️ Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd FinalProject

# Run the automated setup
./scripts/setup.sh
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your cloud service credentials (optional for basic usage)
nano .env
```

### 3. Start CloudIDE+

```bash
# Start all services
./scripts/dev.sh start

# Or using Docker Compose directly
docker-compose up -d
```

### 4. Access Your IDE

Open your browser and navigate to:

**🌐 http://localhost:8080**

- **Username:** (leave empty)
- **Password:** `cloudide123`

## 🎯 What You Get

### Core Features Available Immediately

- ✅ **Full VS Code Experience** in your browser
- ✅ **Real Terminal Access** with sudo privileges
- ✅ **Pre-installed Development Tools**
  - Node.js 20, Python 3.11, Go, Java 17
  - Docker, kubectl, Terraform
  - Firebase CLI, Vercel CLI, Netlify CLI
  - Google Cloud SDK
- ✅ **Extension Framework** ready for CloudIDE+ features

### Additional Services

- **📊 Monitoring Dashboard:** http://localhost:3001 (Grafana)
- **📈 Metrics:** http://localhost:9090 (Prometheus)
- **🗄️ Database:** PostgreSQL on port 5432
- **🚀 Cache:** Redis on port 6379

## 🛠️ Development Commands

```bash
# Start services
./scripts/dev.sh start

# View logs
./scripts/dev.sh logs

# Stop services
./scripts/dev.sh stop

# Restart services
./scripts/dev.sh restart

# Build extensions
./scripts/dev.sh build

# Health check
./scripts/health-check.sh
```

## 📁 Workspace Structure

Your development workspace is located at `/home/coder/workspace/`:

```
workspace/
├── projects/     # Your development projects
├── templates/    # Pre-configured project templates
├── shared/       # Team collaboration space
└── temp/         # Temporary files
```

## 🔧 Customization

### Change Password

Edit `.env` file:
```bash
CODE_SERVER_PASSWORD=your-new-password
```

### Add Cloud Services

Edit `.env` file with your API keys:
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
FIREBASE_PROJECT_ID=your-firebase-project
GEMINI_API_KEY=your-gemini-api-key
```

### Install Additional Extensions

```bash
# Access the running container
docker exec -it cloudide-plus bash

# Install VS Code extension
code-server --install-extension extension-name
```

## 🚨 Troubleshooting

### Services Won't Start

```bash
# Check Docker daemon
docker info

# Check port conflicts
netstat -tulpn | grep :8080

# View detailed logs
docker-compose logs -f
```

### Can't Access Web Interface

1. **Check if services are running:**
   ```bash
   docker-compose ps
   ```

2. **Verify health status:**
   ```bash
   ./scripts/health-check.sh
   ```

3. **Reset and restart:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Extension Development Issues

```bash
# Rebuild extensions
npm run build:extensions

# Check extension logs
docker-compose logs cloudide-core
```

## 📚 Next Steps

### For Development

1. **Create Your First Project:**
   - Open http://localhost:8080
   - Navigate to `/home/coder/workspace/projects/`
   - Create a new folder for your project

2. **Install CloudIDE+ Extensions:**
   - Build extensions: `./scripts/dev.sh build`
   - Extensions will auto-install on restart

3. **Configure Cloud Services:**
   - Edit `.env` with your API keys
   - Restart services: `./scripts/dev.sh restart`

### For Production

1. **Configure Domain & SSL:**
   - Update `docker/nginx.conf`
   - Add real SSL certificates

2. **Set Environment to Production:**
   ```bash
   CLOUDIDE_MODE=production
   NODE_ENV=production
   ```

3. **Configure Cloud Hosting:**
   - Set up Google Cloud, AWS, or your preferred provider
   - Configure CI/CD pipeline

## 📖 Documentation

- **📋 Full Documentation:** `README.md`
- **🗺️ Development Roadmap:** `ROADMAP.md`
- **📊 Day 1 Status:** `DAY1-STATUS.md`
- **🔧 Setup Details:** `scripts/setup.sh`

## 🆘 Support

- **🐛 Issues:** [GitHub Issues](https://github.com/yourusername/CloudIDE/issues)
- **💬 Discussions:** [GitHub Discussions](https://github.com/yourusername/CloudIDE/discussions)
- **📧 Email:** support@cloudide.dev

## 🎉 You're Ready!

CloudIDE+ is now running and ready for development. Start building your cloud-native applications with the full power of VS Code and integrated cloud services!

---

**Happy Coding! 💻**