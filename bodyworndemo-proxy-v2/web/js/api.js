// js/api.js

const API = {
    server: "",
    token: "",
    storageUrl: "",

    // Centralized internal logger helper
    _logToTerminal(method, url, detail) {
        const logEl = document.getElementById('log');
        if (!logEl) return;
        const timestamp = new Date().toLocaleTimeString();
        logEl.textContent += `[${timestamp}] ${method} -> ${url}\n${detail}\n`;
        logEl.textContent += `--------------------------------------------------\n`;
        logEl.scrollTop = logEl.scrollHeight; // Auto-scroll to bottom
    },

    async authenticate(username, password) {
        const targetUrl = this.server + "/auth/v1.0";

        this._logToTerminal(
            "GET",
            targetUrl,
            `Attempting Handshake...\nUsername: "${username}"`
        );

        const response = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "X-Auth-User": username,
                "X-Auth-Key": password
            }
        });

        if (!response.ok) {
            this._logToTerminal(
                "ERROR",
                targetUrl,
                `Authentication Denied (Status: ${response.status})`
            );
            throw new Error("Authentication failed");
        }

        this.token = response.headers.get("X-Auth-Token");
        this.storageUrl = response.headers.get("X-Storage-Url");

        this._logToTerminal(
            "SUCCESS",
            targetUrl,
            `Status: ${response.status} ${response.statusText}\nToken: ${this.token ? this.token.substring(0, 12) : 'null'}...\nStorage Dest: ${this.storageUrl}`
        );

        return true;
    },

    async upload(file) {
        const url = this.storageUrl + "/test-recording/" + encodeURIComponent(file.name);

        this._logToTerminal(
            "PUT",
            url,
            `Uploading Object: "${file.name}"\nPayload Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB\nMime-Type: ${file.type || 'video/*'}`
        );

        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "X-Auth-Token": this.token
            },
            body: file
        });

        if (!response.ok) {
            this._logToTerminal(
                "ERROR",
                url,
                `Object Delivery Failed (Status: ${response.status})`
            );
            throw new Error("Upload failed");
        }

        this._logToTerminal(
            "SUCCESS",
            url,
            `Status: ${response.status} ${response.statusText}\nObject cleanly written to remote container.`
        );
    }
};

// Initialize visual terminal layout on startup
document.addEventListener('DOMContentLoaded', () => {
    const logEl = document.getElementById('log');
    if (logEl) {
        const timestamp = new Date().toLocaleTimeString();
        logEl.textContent = `[${timestamp}] SYSTEM: HTTP Activity Monitor Initialized Engine Online.\n`;
        logEl.textContent += `[${timestamp}] SYSTEM: Awaiting authentication gateway handshake...\n`;
        logEl.textContent += `--------------------------------------------------\n`;
    } else {
        console.error("Critical Error: Core script could not locate element with id='log' in DOM tree.");
    }
});