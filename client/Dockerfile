FROM node:18-alpine

# Arbeitsverzeichnis setzen
WORKDIR /app

# Package.json und Package-lock.json kopieren
COPY package*.json ./

# Dependencies installieren
RUN npm ci

# Anwendungscode kopieren
COPY . .

# Port freigeben
EXPOSE 3000

# Anwendung starten
CMD ["npm", "start"]
