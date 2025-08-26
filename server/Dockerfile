FROM node:18-alpine

# Arbeitsverzeichnis setzen
WORKDIR /app

# Package.json und Package-lock.json kopieren
COPY package*.json ./

# Dependencies installieren
RUN npm ci --only=production

# Anwendungscode kopieren
COPY . .

# Uploads-Verzeichnis erstellen
RUN mkdir -p uploads

# Port freigeben
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/auth/create-admin', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Anwendung starten
CMD ["npm", "start"]
