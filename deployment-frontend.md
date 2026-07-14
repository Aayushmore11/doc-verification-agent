# Frontend Deployment Guide (Nginx & React/Vite)

This guide details the deployment of the frontend React application on the Ubuntu Server (`72.62.229.51`) under the domain `doc-verification-agent.auremoai.site`.

---

## 1. Prerequisites & Environment Setup

Connect to your Ubuntu server via SSH:
```bash
ssh user@72.62.229.51
```

### Install Node.js & npm
Ensure Node.js (version 18+) and npm are installed on the server:
```bash
# Add NodeSource Node.js 18.x repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
sudo apt-get install -y nodejs
```

Verify the installation:
```bash
node -v
npm -v
```

---

## 2. Directory Structure & Code Deployment

Ensure the code is located at `/var/www/html/doc-verification-agent`.

If you haven't cloned the repository, clone it into the target directory:
```bash
sudo mkdir -p /var/www/html/doc-verification-agent
sudo chown -R $USER:$USER /var/www/html/doc-verification-agent
git clone <your-repository-url> /var/www/html/doc-verification-agent
```

Navigate to the frontend folder:
```bash
cd /var/www/html/doc-verification-agent/frontend
```

---

## 3. Environment Variables Configuration

1. Copy the `.env.example` template to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file:
   ```bash
   nano .env
   ```

3. Update `VITE_API_BASE_URL` to point to your backend API domain (HTTPS):
   ```env
   VITE_API_BASE_URL=https://doc-verification-agent-api.auremoai.site
   ```
   *Note: If the backend is running directly on port `8039` without standard Nginx domain proxying, use `https://doc-verification-agent-api.auremoai.site:8039`.*

---

## 4. Build Frontend Assets

Install dependencies and build the static production bundle:
```bash
npm install
npm run build
```
This command compiles and outputs the production-ready static files into the `frontend/dist` directory (absolute path: `/var/www/html/doc-verification-agent/frontend/dist`).

---

## 5. Nginx Virtual Host Configuration

Nginx serves the frontend on the standard HTTP port (80) using the server name `doc-verification-agent.auremoai.site`.

Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/doc-verification-agent-frontend
```

Add the following configuration block:
```nginx
server {
    listen 80;
    server_name doc-verification-agent.auremoai.site;

    root /var/www/html/doc-verification-agent/frontend/dist;
    index index.html;

    # Handle React Router client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable Gzip compression
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
    gzip_min_length 1000;

    # Logs
    access_log /var/log/nginx/doc-verification-frontend.access.log;
    error_log /var/log/nginx/doc-verification-frontend.error.log;
}
```

### Enable Nginx Config & Test
1. Link the configuration to `sites-enabled`:
   ```bash
   sudo ln -sf /etc/nginx/sites-available/doc-verification-agent-frontend /etc/nginx/sites-enabled/
   ```

2. Test the configuration for syntax errors:
   ```bash
   sudo nginx -t
   ```

3. Reload Nginx to apply changes:
   ```bash
   sudo systemctl reload nginx
   ```

*(Optional)* If using Let's Encrypt for SSL (HTTPS) with Option A:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d doc-verification-agent.auremoai.site
```

---

## 6. How to Deploy Updates

When you push updates to your repository, perform the following steps on the server to update the frontend:

1. Navigate to the project root and pull the latest code:
   ```bash
   cd /var/www/html/doc-verification-agent
   git pull origin main
   ```

2. Change to the frontend directory:
   ```bash
   cd frontend
   ```

3. Install any new dependencies and rebuild the assets:
   ```bash
   npm install
   npm run build
   ```

4. Nginx serves the files from the build output directory dynamically. You do not need to restart Nginx, but you may optionally reload it to clear cache:
   ```bash
   sudo systemctl reload nginx
   ```
