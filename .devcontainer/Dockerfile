FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# Install additional packages if needed
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        curl \
        wget \
        vim \
    && apt-get autoremove -y && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install Claude Code globally
RUN npm install -g claude-code

# Set the default user
USER vscode