#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting server setup..."

# 1. Update and install basic tools
if command -v apt-get &> /dev/null; then
    # Debian/Ubuntu
    apt-get update
    apt-get install -y git curl unzip
elif command -v yum &> /dev/null; then
    # CentOS/RHEL
    yum update -y
    yum install -y git curl unzip
fi

# 2. Install Docker if not exists
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
else
    echo "✅ Docker is already installed."
fi

# 3. Configure Docker Mirror (China)
if [ ! -f /etc/docker/daemon.json ]; then
    echo "🇨🇳 Configuring Docker Mirror..."
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<EOF
  "registry-mirrors": [
    "https://mirror.baidubce.com",
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://ccr.ccs.tencentyun.com"
  ]
}
EOF
    # Force rewrite if exists to ensure new mirrors are applied
    systemctl restart docker
fi

# Force rewrite even if exists (in case user re-runs with new script but old file exists)
if [ -f /etc/docker/daemon.json ]; then
    echo "🔄 Updating Docker Mirror Config..."
    cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me",
    "https://docker.1panel.live"
  ]
}
EOF
    systemctl restart docker
fi

echo "✅ Server setup complete! You are ready to deploy."
