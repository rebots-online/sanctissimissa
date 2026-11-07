# Linux build image for the windows build environment — DOCS/ARCHITECTURE/L-release-20261106.md §2.11.
# Built locally in each build environment (no registry; Forgejo removed):
#   docker build -t sanctissimissa-linux-build:<first 12 hex of sha256(this file)> ci/images/linux-build
# scripts/release-stage-commands.mjs computes the tag and builds on a miss.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl git file pkg-config cmake clang-19 \
      libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libssl-dev libxdo-dev \
      patchelf rpm zip unzip python3 binutils xz-utils \
 && rm -rf /var/lib/apt/lists/*

# Node 26.5.0, verified against the release directory's SHASUMS256.txt.
ARG NODE_VERSION=26.5.0
RUN set -eux; \
    cd /tmp; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"; \
    grep " node-v${NODE_VERSION}-linux-x64.tar.xz\$" SHASUMS256.txt | sha256sum -c -; \
    tar -xJf "node-v${NODE_VERSION}-linux-x64.tar.xz" -C /usr/local --strip-components=1 --no-same-owner; \
    rm -f "node-v${NODE_VERSION}-linux-x64.tar.xz" SHASUMS256.txt; \
    node -v

# Rust 1.97.0 via rustup (the host version).
ENV RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo PATH=/usr/local/cargo/bin:$PATH
RUN set -eux; \
    curl -fsSL https://sh.rustup.rs -o /tmp/rustup-init.sh; \
    sh /tmp/rustup-init.sh -y --no-modify-path --profile minimal --default-toolchain 1.97.0; \
    rm -f /tmp/rustup-init.sh; \
    rustc -V

RUN git config --system --add safe.directory /src

# No FUSE in containers; keep container target output apart from native builds.
ENV APPIMAGE_EXTRACT_AND_RUN=1 CARGO_TARGET_DIR=/src/src-tauri/target/linux-container
