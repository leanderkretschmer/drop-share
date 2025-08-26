# kretschmer-leander // drop

Eine moderne File-Sharing Webapp für Projekte und Dateien mit Benutzerauthentifizierung, Projektverwaltung und Share-Links.

## Features

- **Benutzerauthentifizierung**: Registrierung und Login mit JWT-Tokens
- **Projektverwaltung**: Erstellen, bearbeiten und löschen von Projekten
- **Datei-Upload**: Hochladen und Verwalten von Dateien in Projekten
- **Share-Links**: Teilen von Projekten über öffentliche Links mit Passwortschutz
- **Kollaboration**: Einladen von Benutzern zu Projekten mit verschiedenen Berechtigungen
- **Chat**: Projekt-spezifischer Chat für Teamkommunikation
- **Admin-Panel**: Benutzerverwaltung und Upload-Berechtigungen

## Technologie-Stack

- **Frontend**: React 18, Tailwind CSS, Lucide React Icons
- **Backend**: Node.js, Express.js, MongoDB mit Mongoose
- **Containerisierung**: Docker Compose
- **Authentifizierung**: JWT Tokens
- **Datei-Upload**: Multer

## Installation

### Voraussetzungen

- Docker und Docker Compose
- Git

### Setup

1. **Repository klonen oder entpacken**
   ```bash
   git clone <repository-url>
   cd kretschmer-drop
   ```

2. **Umgebungsvariablen konfigurieren**
   
   Erstellen Sie eine `.env` Datei im Hauptverzeichnis:
   ```bash
   # Server
   PORT=10031
   MONGODB_URI=mongodb://mongodb:27017/kretschmer-drop
   JWT_SECRET=ihr-super-geheimer-jwt-secret
   
   # Client
   REACT_APP_API_URL=http://localhost:10031
   ```

3. **Anwendung starten**
   ```bash
   docker compose up -d
   ```

4. **Anwendung aufrufen**
   
   Öffnen Sie http://localhost:10030 in Ihrem Browser

## Erste Schritte

1. **Registrierung**: Der erste registrierte Benutzer wird automatisch zum Administrator
2. **Projekt erstellen**: Erstellen Sie Ihr erstes Projekt
3. **Dateien hochladen**: Laden Sie Dateien in Ihr Projekt hoch
4. **Teilen**: Erstellen Sie Share-Links für Ihre Projekte

## Ports

- **Frontend**: 10030
- **Backend**: 10031
- **MongoDB**: 27017 (intern)

## Datenbank

Die Anwendung verwendet MongoDB. Beim ersten Start wird automatisch eine neue Datenbank erstellt.

## Sicherheit

- JWT-basierte Authentifizierung
- Passwort-Hashing mit bcrypt
- Rate Limiting
- Input-Validierung
- CORS-Konfiguration

## Entwicklung

### Frontend entwickeln
```bash
cd client
npm install
npm start
```

### Backend entwickeln
```bash
cd server
npm install
npm run dev
```

## Lizenz

Dieses Projekt ist für private und kommerzielle Nutzung freigegeben.

## Support

Bei Fragen oder Problemen erstellen Sie bitte ein Issue im Repository.
