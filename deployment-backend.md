# Backend Deployment Guide (FastAPI, Gunicorn/Uvicorn & Systemd)

This guide details the deployment of the FastAPI backend application on the Ubuntu Server (`72.62.229.51`) under the domain `doc-verification-agent-api.auremoai.site` running on port `8039`.

---

## 1. System Requirements & Dependencies

Connect to your Ubuntu server via SSH:
```bash
ssh user@72.62.229.51
```

### Install Essential Packages & System Libraries
The Doc Verification Agent requires system-level libraries for OCR (Tesseract), QR decoding (ZBar), and PostgreSQL integration:
```bash
sudo apt update
sudo apt install -y python3-pip python3-venv python3-dev \
                    tesseract-ocr libzbar0 \
                    postgresql postgresql-contrib libpq-dev \
                    build-essential libjpeg-dev zlib1g-dev
```

Verify Tesseract OCR is installed and available in the system PATH:
```bash
tesseract --version
```

---

## 2. PostgreSQL Database Setup

1. Log in to the PostgreSQL prompt:
   ```bash
   sudo -i -u postgres psql
   ```

2. Create the project database:
   ```sql
   CREATE DATABASE doc_verification;
   ```

3. Create the database user and grant permissions:
   ```sql
   CREATE USER postgres WITH PASSWORD '1136'; -- Matches default dev credentials
   GRANT ALL PRIVILEGES ON DATABASE doc_verification TO postgres;
   \q
   ```

---

## 3. Directory & Environment Configuration

Ensure the code is located at `/var/www/html/doc-verification-agent`.

Navigate to the project root:
```bash
cd /var/www/html/doc-verification-agent
```

### Setup Python Virtual Environment
1. Create a virtual environment:
   ```bash
   python3 -m venv venv
   ```

2. Activate the virtual environment:
   ```bash
   source venv/bin/activate
   ```

3. Install the dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

### Setup Environment Variables
1. Copy `.env.example` to `.env` in the root:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env`:
   ```bash
   nano .env
   ```

3. Fill in your environment variables:
   ```env
   GROQ_API_KEY=your_actual_groq_api_key_here
   DATABASE_URL=postgresql+psycopg2://postgres:1136@localhost:5432/doc_verification
   ALLOWED_ORIGINS=https://doc-verification-agent.auremoai.site
   HOST=127.0.0.1
   PORT=8039
   ```
   *Note: Update the ALLOWED_ORIGINS to include `https://doc-verification-agent.auremoai.site:8038` if you are hosting the frontend on port 8038.*

---

## 4. Run Backend as a Systemd Service

To keep the FastAPI app running continuously in the background and restart it on system failures, manage it using a systemd service.

1. Create a systemd service file:
   ```bash
   sudo nano /etc/systemd/system/doc-verification-backend.service
   ```

2. Paste the following configuration:
   ```ini
   [Unit]
   Description=Doc Verification Agent FastAPI Backend
   After=network.target postgresql.service

   [Service]
   User=www-data
   Group=www-data
   WorkingDirectory=/var/www/html/doc-verification-agent
   EnvironmentFile=/var/www/html/doc-verification-agent/.env
   ExecStart=/var/www/html/doc-verification-agent/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8039

   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```
   *Note: Ensure the `/var/www/html/doc-verification-agent` directory is readable and executable by the `www-data` user, or change the `User` and `Group` fields to your own ssh user (e.g., `ubuntu` or `root`).*
   If permissions need updating for `www-data`:
   ```bash
   sudo chown -R www-data:www-data /var/www/html/doc-verification-agent
   ```

3. Reload systemd daemon, start and enable the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start doc-verification-backend
   sudo systemctl enable doc-verification-backend
   ```

4. Check the service status:
   ```bash
   sudo systemctl status doc-verification-backend
   ```

---

## 5. Nginx Reverse Proxy Configuration

Configure Nginx to route incoming requests from `doc-verification-agent-api.auremoai.site` to the local FastAPI process running on port `8039`.

Create the Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/doc-verification-agent-backend
```

### Option A: Standard Port 80 (Recommended)
This listens on port 80 and routes to the local application. Add the following config block:
```nginx
server {
    listen 80;
    server_name doc-verification-agent-api.auremoai.site;

    location / {
        proxy_pass http://127.0.0.1:8039;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Increase client body size limit for larger file uploads (images/documents)
    client_max_body_size 20M;

    # Logs
    access_log /var/log/nginx/doc-verification-backend.access.log;
    error_log /var/log/nginx/doc-verification-backend.error.log;
}
```

### Option B: Custom Port 8039
If you want Nginx to listen directly on port `8039` instead, configure it like this:
```nginx
server {
    listen 8039;
    server_name doc-verification-agent-api.auremoai.site;

    location / {
        proxy_pass http://127.0.0.1:8039;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 20M;

    # Logs
    access_log /var/log/nginx/doc-verification-backend-8039.access.log;
    error_log /var/log/nginx/doc-verification-backend-8039.error.log;
}
```
*Note: Make sure port `8039` is open in your server firewall (e.g. UFW: `sudo ufw allow 8039/tcp`).*

### Enable Nginx Config & Test
1. Link configuration to `sites-enabled`:
   ```bash
   sudo ln -sf /etc/nginx/sites-available/doc-verification-agent-backend /etc/nginx/sites-enabled/
   ```

2. Test Nginx syntax:
   ```bash
   sudo nginx -t
   ```

3. Reload Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

*(Optional)* If using Let's Encrypt for SSL (HTTPS) with Option A:
```bash
sudo certbot --nginx -d doc-verification-agent-api.auremoai.site
```

---

## 6. How to Deploy Updates

When you push backend updates to your repository, follow these steps to deploy:

1. Navigate to the project root and pull the latest code:
   ```bash
   cd /var/www/html/doc-verification-agent
   git pull origin main
   ```

2. Activate virtual environment and install new dependencies:
   ```bash
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Apply any database script updates or schema migrations.

4. Restart the systemd service to reload the FastAPI application:
   ```bash
   sudo systemctl restart doc-verification-backend
   ```

5. Verify that the API is running correctly:
   ```bash
   curl http://127.0.0.1:8039/
   ```
   It should return:
   ```json
   {"status":"running","message":"Document Verification API"}
   ```
