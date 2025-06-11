-- CloudIDE+ PostgreSQL Database Initialization
-- This script sets up the database schema for CloudIDE+ platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create CloudIDE+ specific schemas
CREATE SCHEMA IF NOT EXISTS cloudide;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS integrations;

-- Set default search path
ALTER DATABASE coder SET search_path TO public, cloudide, analytics, integrations;

-- CloudIDE+ Users and Workspaces Extensions
CREATE TABLE IF NOT EXISTS cloudide.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_drive_token TEXT,
    firebase_config JSONB,
    gemini_api_key TEXT,
    zoho_config JSONB,
    cloudflare_config JSONB,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- CloudIDE+ Workspaces
CREATE TABLE IF NOT EXISTS cloudide.enhanced_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    cloud_storage_config JSONB DEFAULT '{}',
    deployment_config JSONB DEFAULT '{}',
    ai_assistant_config JSONB DEFAULT '{}',
    collaboration_config JSONB DEFAULT '{}',
    features_enabled JSONB DEFAULT '{"google_drive": true, "firebase": true, "gemini": true, "zoho": true, "cloudflare": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id)
);

-- Google Drive Integration
CREATE TABLE IF NOT EXISTS integrations.google_drive_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    drive_file_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    last_modified TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'pending',
    local_checksum VARCHAR(64),
    drive_checksum VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, drive_file_id)
);

-- Firebase Projects
CREATE TABLE IF NOT EXISTS integrations.firebase_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    firebase_config JSONB NOT NULL,
    deployment_config JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gemini AI Interactions
CREATE TABLE IF NOT EXISTS integrations.gemini_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    conversation_id VARCHAR(255),
    prompt TEXT NOT NULL,
    response TEXT,
    model VARCHAR(50) DEFAULT 'gemini-pro',
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Zoho SalesIQ Integration
CREATE TABLE IF NOT EXISTS integrations.zoho_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visitor_id VARCHAR(255),
    chat_id VARCHAR(255),
    interaction_type VARCHAR(50) NOT NULL,
    interaction_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cloudflare Deployments
CREATE TABLE IF NOT EXISTS integrations.cloudflare_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    deployment_id VARCHAR(255),
    project_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    deployment_url TEXT,
    deployment_config JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    deployed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CloudIDE+ Templates
CREATE TABLE IF NOT EXISTS cloudide.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    template_config JSONB NOT NULL,
    cloud_services JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Tables
CREATE TABLE IF NOT EXISTS analytics.workspace_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_used VARCHAR(100) NOT NULL,
    usage_data JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics.api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS analytics.performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(12,4) NOT NULL,
    metric_unit VARCHAR(20),
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON cloudide.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_workspaces_workspace_id ON cloudide.enhanced_workspaces(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_drive_files_user_id ON integrations.google_drive_files(user_id);
CREATE INDEX IF NOT EXISTS idx_google_drive_files_workspace_id ON integrations.google_drive_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_drive_files_sync_status ON integrations.google_drive_files(sync_status);
CREATE INDEX IF NOT EXISTS idx_firebase_projects_user_id ON integrations.firebase_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_firebase_projects_project_id ON integrations.firebase_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_gemini_conversations_user_id ON integrations.gemini_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_gemini_conversations_created_at ON integrations.gemini_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_zoho_interactions_user_id ON integrations.zoho_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cloudflare_deployments_user_id ON integrations.cloudflare_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_cloudflare_deployments_status ON integrations.cloudflare_deployments(status);
CREATE INDEX IF NOT EXISTS idx_templates_category ON cloudide.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON cloudide.templates(is_public);
CREATE INDEX IF NOT EXISTS idx_workspace_usage_workspace_id ON analytics.workspace_usage(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_usage_timestamp ON analytics.workspace_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON analytics.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_service ON analytics.api_usage(service);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON analytics.api_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_workspace_id ON analytics.performance_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_name ON analytics.performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON analytics.performance_metrics(timestamp);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_google_drive_files_file_name_trgm ON integrations.google_drive_files USING gin(file_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_templates_name_trgm ON cloudide.templates USING gin(name gin_trgm_ops);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON cloudide.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enhanced_workspaces_updated_at BEFORE UPDATE ON cloudide.enhanced_workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_google_drive_files_updated_at BEFORE UPDATE ON integrations.google_drive_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_firebase_projects_updated_at BEFORE UPDATE ON integrations.firebase_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cloudflare_deployments_updated_at BEFORE UPDATE ON integrations.cloudflare_deployments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON cloudide.templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default CloudIDE+ templates
INSERT INTO cloudide.templates (name, display_name, description, category, template_config, cloud_services, is_public) VALUES
('cloudide-fullstack-js', 'Full-Stack JavaScript', 'Complete MEAN/MERN stack with CloudIDE+ integrations', 'fullstack',
 '{"framework": "react", "backend": "node", "database": "mongodb", "features": ["google_drive", "firebase", "cloudflare"]}',
 '["firebase", "cloudflare", "google_drive"]', true),

('cloudide-react-firebase', 'React + Firebase', 'React application with Firebase backend integration', 'frontend',
 '{"framework": "react", "backend": "firebase", "features": ["firebase", "cloudflare", "gemini"]}',
 '["firebase", "cloudflare", "gemini"]', true),

('cloudide-python-ai', 'Python AI Development', 'Python environment with Gemini AI integration', 'ai',
 '{"language": "python", "frameworks": ["flask", "fastapi"], "features": ["gemini", "google_drive"]}',
 '["gemini", "google_drive"]', true),

('cloudide-microservices', 'Microservices Architecture', 'Multi-service architecture with cloud deployment', 'backend',
 '{"architecture": "microservices", "technologies": ["docker", "kubernetes"], "features": ["cloudflare", "firebase"]}',
 '["cloudflare", "firebase", "google_drive"]', true),

('cloudide-mobile-dev', 'Mobile Development', 'React Native/Flutter with Firebase backend', 'mobile',
 '{"platforms": ["ios", "android"], "frameworks": ["react-native", "flutter"], "features": ["firebase", "gemini"]}',
 '["firebase", "gemini", "google_drive"]', true);

-- Create CloudIDE+ specific views
CREATE OR REPLACE VIEW cloudide.workspace_overview AS
SELECT
    w.id,
    w.name,
    w.template_id,
    ew.features_enabled,
    ew.cloud_storage_config,
    ew.deployment_config,
    u.username as owner_username,
    w.created_at,
    w.updated_at
FROM workspaces w
LEFT JOIN cloudide.enhanced_workspaces ew ON w.id = ew.workspace_id
LEFT JOIN users u ON w.owner_id = u.id;

CREATE OR REPLACE VIEW analytics.user_activity_summary AS
SELECT
    u.id as user_id,
    u.username,
    u.email,
    COUNT(DISTINCT wu.workspace_id) as active_workspaces,
    COUNT(wu.id) as total_feature_usage,
    MAX(wu.timestamp) as last_activity,
    array_agg(DISTINCT wu.feature_used) as features_used
FROM users u
LEFT JOIN analytics.workspace_usage wu ON u.id = wu.user_id
WHERE wu.timestamp > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.username, u.email;

-- Grant permissions
GRANT USAGE ON SCHEMA cloudide TO coder;
GRANT USAGE ON SCHEMA analytics TO coder;
GRANT USAGE ON SCHEMA integrations TO coder;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cloudide TO coder;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO coder;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA integrations TO coder;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA cloudide TO coder;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA analytics TO coder;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA integrations TO coder;

-- Create CloudIDE+ admin user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cloudide_admin') THEN
        CREATE ROLE cloudide_admin WITH LOGIN PASSWORD 'cloudide_admin_password';
        GRANT ALL PRIVILEGES ON DATABASE coder TO cloudide_admin;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cloudide_admin;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cloudide TO cloudide_admin;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO cloudide_admin;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA integrations TO cloudide_admin;
    END IF;
END
$$;

-- Log the completion
INSERT INTO public.schema_migrations (version, dirty) VALUES ('cloudide_v1_0_0', false) ON CONFLICT DO NOTHING;

-- Create a function to initialize CloudIDE+ for a new user
CREATE OR REPLACE FUNCTION cloudide.initialize_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO cloudide.user_profiles (user_id, preferences)
    VALUES (user_id, '{"theme": "dark", "ai_assistance": true, "auto_sync": true}')
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create a function to initialize CloudIDE+ for a new workspace
CREATE OR REPLACE FUNCTION cloudide.initialize_workspace(workspace_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO cloudide.enhanced_workspaces (workspace_id)
    VALUES (workspace_id)
    ON CONFLICT (workspace_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMIT;
