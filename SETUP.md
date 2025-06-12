# CloudIDE+ Development Setup

**Day 1-2: Repository Structure & Development Environment**

This guide will help you set up the CloudIDE+ development environment using Coder for infrastructure-based development environments.

## 🎯 Current Phase: Foundation Setup (Week 1)

You are currently on **Day 1** of the roadmap, focusing on repository restructuring and approach pivot.

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running on Windows 11
- Git for version control
- Node.js 18+ (for extension development)

### 1. Start Development Environment

```bash
# Clone and navigate to project
git clone <your-repo-url>
cd CloudIDE

# Copy environment configuration
copy .env.dev .env

# Start Coder development environment
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose -f docker-compose.dev.yml ps
```

### 2. Access Coder Dashboard

1. Open browser to http://localhost:7080
2. Follow Coder setup wizard
3. Create your first workspace template

### 3. Development Container Setup

The `/coder/.devcontainer/devcontainer.json` provides:
- Official Coder development environment
- Docker-in-Docker capabilities
- Biome for code formatting
- SYS_PTRACE for Go debugging

## 📁 Current Repository Structure

```
CloudIDE/
├── coder/                     # Official Coder project (submodule)
│   ├── .devcontainer/         # Development container config
│   └── docker-compose.yaml    # Coder's own development setup
├── cloudide-extensions/       # Your custom VS Code extensions
├── workspace/                 # Development workspace
├── config/                    # Configuration files
├── docker-compose.dev.yml     # Simplified development setup
├── .env.dev                   # Development environment variables
└── ROADMAP.md                # Your 16-week development plan
```

## 🛠️ What's Been Cleaned Up

### Removed (Too Early for Day 1):
- Complex multi-service docker-compose.yml
- Advanced microservices setup (AI, deployment, monitoring)
- Production-grade configurations

### Kept (Essential for Day 1-2):
- Coder development environment
- Basic PostgreSQL database
- Extension development structure
- Workspace mounting

## 📋 Day 1-2 Tasks

### ✅ Completed
- [x] Repository restructuring
- [x] Approach pivot to VS Code extensions
- [x] Docker cleanup and simplification
- [x] Development environment setup

### 🔄 Next Steps (Day 2)
- [ ] Finalize workspace structure
- [ ] Set up extension development tools
- [ ] Test Coder workspace creation
- [ ] Prepare for Day 3-4 Docker customization

## 🔧 Development Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop environment
docker-compose -f docker-compose.dev.yml down

# Reset database (if needed)
docker-compose -f docker-compose.dev.yml down -v
docker volume rm cloudide_coder_data
```

## 🧩 Extension Development Setup (Day 2)

```bash
# Install VS Code extension development tools
npm install -g yo generator-code

# Create new extension template
yo code

# Install CloudIDE+ extension utilities (when ready)
npm install @cloudide/extension-utils
```

## 📅 Upcoming Phases

### Day 3-4: Docker Customization
- Custom Docker images for code-server
- Development container configurations
- Multi-service architecture setup

### Day 5-7: Basic Deployment
- Google Cloud setup
- CI/CD pipeline
- SSL/domain configuration

## 🔗 Useful Links

- **Coder Documentation**: https://coder.com/docs
- **VS Code Extension API**: https://code.visualstudio.com/api
- **Docker Compose Reference**: https://docs.docker.com/compose/

## 🚨 Troubleshooting

### Docker Issues
```bash
# Restart Docker Desktop
# Check Docker daemon is running
docker info

# Reset development environment
docker-compose -f docker-compose.dev.yml down --volumes
```

### Port Conflicts
- Coder: http://localhost:7080
- PostgreSQL: localhost:5432
- Make sure these ports are available

### Permission Issues (Windows)
- Ensure Docker Desktop has proper permissions
- Run PowerShell as Administrator if needed

---

**Next**: Once Day 1-2 setup is complete, proceed to Day 3-4 Docker customization phase.