FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    poppler-utils \
    python3 \
    python3-pip \
    qpdf \
    jpegoptim \
    ffmpeg \
    ghostscript \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages --no-cache-dir pdf2docx

WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund --omit=dev
COPY . .
RUN mkdir -p server/uploads server/converted uploads converted && chown -R node:node /app
USER node
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
