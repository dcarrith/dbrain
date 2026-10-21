# ==============================================================================
# dbrain Open-Source Multi-Stage Container Image (Homelab • Community • City)
# ==============================================================================
FROM node:20-alpine AS native-builder
RUN apk add --no-cache build-base
WORKDIR /src
COPY vendor/dbrain-core-rs/native/dbrain_core_rs_napi.c /src/dbrain_core_rs_napi.c
RUN mkdir -p /out && \
    ARCH="$(node -p 'process.arch')" && \
    NODE_INC="$(dirname $(dirname $(which node)))/include/node" && \
    gcc -O3 -std=c99 -shared -fPIC -I"${NODE_INC}" \
      /src/dbrain_core_rs_napi.c \
      -o "/out/dbrain_core_rs.linux-${ARCH}.node"

FROM node:20-alpine AS production
RUN apk upgrade --no-cache && \
    addgroup -g 1001 -S nodejs && \
    adduser -S dbrain -u 1001 -G nodejs && \
    mkdir -p /var/lib/dbrain && \
    chown -R dbrain:nodejs /var/lib/dbrain

WORKDIR /app
COPY --chown=dbrain:nodejs . /app/
COPY --from=native-builder --chown=dbrain:nodejs /out/*.node /app/vendor/dbrain-core-rs/

USER 1001
ENV NODE_ENV=production \
    PORT=3000 \
    DBRAIN_TOPOLOGY_PROFILE=homelab \
    DBRAIN_DATA_DIR=/var/lib/dbrain

EXPOSE 3000
CMD ["node", "cli/dbrain.mjs", "serve"]
