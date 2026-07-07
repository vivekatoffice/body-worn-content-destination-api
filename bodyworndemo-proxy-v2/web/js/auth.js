const loginButton = document.getElementById("loginBtn");
const status = document.getElementById("status");

// Helper function to write directly to your activity card
function logToTerminal(method, url, detail) {
    const logEl = document.getElementById('log');
    if (!logEl) return;
    const timestamp = new Date().toLocaleTimeString();
    logEl.textContent += `[${timestamp}] ${method} -> ${url}\n${detail}\n`;
    logEl.textContent += `--------------------------------------------------\n`;
    logEl.scrollTop = logEl.scrollHeight;
}

loginButton.onclick = async () => {
    const server = document.getElementById("server").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    API.server = server;
    status.innerHTML = "Connecting...";

    // Log the initiation of the authentication challenge
    logToTerminal(
        "POST",
        `${server}/api/authenticate`,
        `Attempting handshake...\nUsername: "${username}"`
    );

    try {
        await API.authenticate(username, password);

        status.innerHTML = "🟢 Connected";

        console.log(API.token);
        console.log(API.storageUrl);

        // Log successful authentication parameters
        logToTerminal(
            "SUCCESS",
            `${server}/api/authenticate`,
            `Status: 200 OK\nSession Token: ${API.token ? API.token.substring(0, 12) : 'hidden'}...\nStorage Dest: ${API.storageUrl}`
        );
    }
    catch (e) {
        status.innerHTML = "🔴 Authentication failed";

        // Log authentication error details
        logToTerminal(
            "ERROR",
            `${server}/api/authenticate`,
            `Authentication challenge denied!\nReason: ${e.message || e}`
        );

        alert(e);
    }
}