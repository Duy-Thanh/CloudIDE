# CloudIDE+ Docker Development Environment

This directory contains the Docker configuration for CloudIDE+ development environment, providing a complete containerized setup for building and running the CloudIDE+ platform.

## 🏗️ Architecture Overview

CloudIDE+ uses a multi-container architecture built on Docker Compose, extending the VS Code experience with powerful cloud integrations.

```
┌─────────────────────────────────────────────────────────────┐
│                    CloudIDE+ Platform                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React/TypeScript)  │  Extensions Development     │
│  Port: 8080                   │  VS Code Extension API      │
├─────────────────────────────────────────────────────────────┤
│           Coder Server (Go + VS Code)                      │
│           Port: 3000 (Main Interface)                      │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL   │   Redis      │   Monitoring Stack          │
│  Port: 5432   │   Port: 6379 │   Prometheus + Grafana      │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Container Services

### Core Services

- **`coder-dev`** - Main Coder server with CloudIDE+ enhancements
- **`postgres`** - PostgreSQL database for user data and workspaces
- **`redis`** - Redis for session storage and caching
- **`frontend-dev`** - React frontend development server
- **`extension-dev`** - VS Code extension development environment

### Optional Services (Profiles)

- **`cloudflare-tunnel`** - External access via Cloudflare (production profile)
- **`prometheus`** - Metrics collection (monitoring profile)
- **`grafana`** - Monitoring dashboard (monitoring profile)
- **`mailhog`** - Email testing (dev-tools profile)

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- Docker Compose v2.0+
- At least 10GB free disk space
- 4GB RAM minimum (8GB recommended)

### Option 1: Using Helper Scripts (Recommended)

**Windows (PowerShell):**
```powershell
.\scripts\dev-setup.ps1 setup
```

**Linux/macOS (Bash):**
```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh setup
```

### Option 2: Manual Setup

1. **Clone and navigate to the project:**
   ```bash
   git clone https://github.com/your-org/CloudIDE.git
   cd CloudIDE/cloudide-plus
   ```

2. **Create environment file:**
   ```bash
   cp .env.development .env
   # Edit .env with your API keys (optional for development)
   ```

3. **Build and start services:**
   ```bash
   docker compose -f docker/docker-compose.dev.yml up -d
   ```

4. **Access the platform:**
   - Main Interface: http://localhost:3000
   - Frontend Dev: http://localhost:8080

## 🐳 Docker Images

### `Dockerfile.coder-dev`
**Base**: `golang:1.21-bullseye` → `ubuntu:22.04`

Extended Coder server with CloudIDE+ features:
- Custom VS Code build with CloudIDE+ branding
- Pre-installed cloud service integrations
- Development tools (Node.js, VS Code CLI, Docker)
- CloudIDE+ configuration and templates

**Key Features:**
- Google Drive API integration
- Firebase project support
- Gemini AI assistance
- Zoho SalesIQ chat widget
- Cloudflare deployment tools

### `Dockerfile.extension-dev`
**Base**: `node:18-bullseye`

Specialized environment for VS Code extension development:
- Complete VS Code Extension API
- CloudIDE+ extension utilities
- Pre-configured development tools
- Extension templates and scaffolding

**Development Tools:**
- `@vscode/vsce` - Extension packaging
- `yo generator-code` - Extension scaffolding
- TypeScript, webpack, testing frameworks
- CloudIDE+ shared utilities

### `Dockerfile.frontend-dev`
**Base**: `node:18-bullseye`

React/TypeScript frontend development:
- Hot reload development server
- CloudIDE+ UI components
- Integration with Coder API
- Modern build tools (Vite/webpack)

### `Dockerfile.workspace`
**Base**: `ubuntu:22.04`

User workspace containers with:
- Multi-language support (Node.js, Python, Go, etc.)
- Development tools and utilities
- Cloud CLI tools (gcloud, aws, etc.)
- VS Code Server integration

## ⚙️ Configuration

### Environment Variables

Create `.env` file from `.env.development` template:

```bash
# Core Configuration
CODER_HTTP_ADDRESS=0.0.0.0:3000
CODER_ACCESS_URL=http://localhost:3000

# Cloud Service APIs (Optional)
CLOUDIDE_GOOGLE_DRIVE_API_KEY=your_api_key
CLOUDIDE_FIREBASE_CONFIG=your_firebase_config
CLOUDIDE_GEMINI_API_KEY=your_gemini_key
CLOUDIDE_ZOHO_SALESIQ_KEY=your_zoho_key
CLOUDIDE_CLOUDFLARE_API_TOKEN=your_cloudflare_token

# Development Settings
CLOUDIDE_ENVIRONMENT=development
CLOUDIDE_LOG_LEVEL=debug
```

### Volume Mounts

- **Source Code**: `../coder:/workspace/coder` - Coder source for development
- **Extensions**: `../cloudide-plus/extensions:/workspace/extensions` - Extension development
- **Data Persistence**: Named volumes for databases and user data
- **Docker Socket**: `/var/run/docker.sock` - Container management

### Network Configuration

All services run on the `cloudide-network` bridge network with subnet `172.20.0.0/16`.

## 🔧 Development Workflows

### Building Extensions

1. **Access extension development container:**
   ```bash
   docker exec -it cloudide-extension-dev bash
   ```

2. **Create new extension:**
   ```bash
   cloudide-ext create google-drive-sync "Google Drive Sync" "Sync files with Google Drive"
   ```

3. **Build and package:**
   ```bash
   cd extensions/google-drive-sync
   npm install
   npm run compile
   npm run package
   ```

### Frontend Development

The frontend development server supports hot reload:

1. **Make changes** to files in `../coder/site/`
2. **Changes auto-reload** at http://localhost:8080
3. **API calls** proxy to Coder server at http://localhost:3000

### Database Management

**Connect to PostgreSQL:**
```bash
docker exec -it cloudide-postgres psql -U coder -d coder
```

**View CloudIDE+ tables:**
```sql
\dt cloudide.*
\dt integrations.*
\dt analytics.*
```

**Redis CLI:**
```bash
docker exec -it cloudide-redis redis-cli
```

## 📊 Monitoring and Observability

### Enable Monitoring Stack

```bash
# Start with monitoring profile
docker compose -f docker/docker-compose.dev.yml --profile monitoring up -d
```

**Access Points:**
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### Metrics Collected

- **Coder API**: Request rates, response times, error rates
- **Database**: Connection pools, query performance
- **Redis**: Cache hit rates, memory usage
- **Cloud APIs**: API call counts, quotas, latencies
- **Extensions**: Activation rates, usage statistics

### Custom Dashboards

Pre-configured Grafana dashboards for:
- CloudIDE+ Platform Overview
- User Activity and Engagement
- Cloud Service Integration Status
- Extension Usage Analytics
- System Performance Metrics

## 🔒 Security Considerations

### Development Environment

- **CORS enabled** for frontend development
- **Swagger UI enabled** for API exploration
- **Debug mode** for verbose logging
- **Local networking** only (no external exposure)

### Production Deployment

- **Disable debug features** in production
- **Use secure passwords** and API keys
- **Enable HTTPS** with proper certificates
- **Configure firewall rules** appropriately
- **Use secrets management** for sensitive data

## 🚦 Service Management

### Using Helper Scripts

```bash
# Start all services
./scripts/dev-setup.sh start

# Stop all services
./scripts/dev-setup.sh stop

# Restart services
./scripts/dev-setup.sh restart

# View logs
./scripts/dev-setup.sh logs coder-dev

# Access container shell
./scripts/dev-setup.sh shell extension-dev

# Check service status
./scripts/dev-setup.sh status
```

### Manual Docker Compose

```bash
# Start core services only
docker compose -f docker/docker-compose.dev.yml up -d postgres redis coder-dev

# Start with specific profiles
docker compose -f docker/docker-compose.dev.yml --profile monitoring up -d

# View logs
docker compose -f docker/docker-compose.dev.yml logs -f coder-dev

# Scale services
docker compose -f docker/docker-compose.dev.yml up -d --scale extension-dev=2

# Stop and remove everything
docker compose -f docker/docker-compose.dev.yml down -v
```

## 🐛 Troubleshooting

### Common Issues

**Port Conflicts:**
```bash
# Check what's using port 3000
netstat -tulpn | grep :3000
# Or on Windows:
netstat -ano | findstr :3000
```

**Database Connection Issues:**
```bash
# Check PostgreSQL logs
docker compose logs postgres

# Verify database is ready
docker exec cloudide-postgres pg_isready -U coder
```

**Extension Development Issues:**
```bash
# Rebuild extension dev container
docker compose -f docker/docker-compose.dev.yml build extension-dev

# Check Node.js version in container
docker exec cloudide-extension-dev node --version
```

**Memory Issues:**
```bash
# Check container resource usage
docker stats

# Clean up unused resources
docker system prune -a
```

### Health Checks

All services include health checks:
```bash
# View health status
docker compose -f docker/docker-compose.dev.yml ps

# Check specific service health
docker inspect cloudide-coder-dev --format='{{.State.Health.Status}}'
```

### Log Analysis

**Structured logging** with different levels:
```bash
# Error logs only
docker compose logs coder-dev | grep ERROR

# Debug logs (verbose)
docker compose logs coder-dev | grep DEBUG

# Cloud service logs
docker compose logs coder-dev | grep "google-drive\|firebase\|gemini"
```

## 🔄 Updates and Maintenance

### Updating Images

```bash
# Pull latest base images
docker compose -f docker/docker-compose.dev.yml pull

# Rebuild with latest changes
docker compose -f docker/docker-compose.dev.yml build --no-cache

# Restart with new images
docker compose -f docker/docker-compose.dev.yml up -d
```

### Database Migrations

CloudIDE+ database schema is automatically initialized, but for updates:

```bash
# Connect to database
docker exec -it cloudide-postgres psql -U coder -d coder

# Run migration scripts
\i /docker-entrypoint-initdb.d/migrate_v2.sql
```

### Backup and Restore

**Database Backup:**
```bash
docker exec cloudide-postgres pg_dump -U coder coder > backup.sql
```

**Volume Backup:**
```bash
docker run --rm -v cloudide_postgres_data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres_backup.tar.gz /data
```

## 📚 Additional Resources

- [Coder Documentation](https://coder.com/docs)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [CloudIDE+ Extension Development Guide](../extensions/README.md)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

## 🤝 Contributing

When contributing to the Docker setup:

1. **Test changes** in isolated environments
2. **Update documentation** for any configuration changes
3. **Maintain backward compatibility** when possible
4. **Add health checks** for new services
5. **Include monitoring** for new components

## 📄 License

This Docker configuration is part of the CloudIDE+ project and is licensed under the MIT License.