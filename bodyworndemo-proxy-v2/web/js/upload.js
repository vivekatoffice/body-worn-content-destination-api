const browseBtn = document.getElementById("browseBtn");
const fileInput = document.getElementById("file");
const uploadBtn = document.getElementById("uploadBtn");
const progress = document.getElementById("progress");
const filename = document.getElementById("filename");

// Helper function to write directly to your activity card
function logToTerminal(method, url, detail) {
    const logEl = document.getElementById('log');
    if (!logEl) return;
    const timestamp = new Date().toLocaleTimeString();
    logEl.textContent += `[${timestamp}] ${method} -> ${url}\n${detail}\n`;
    logEl.textContent += `--------------------------------------------------\n`;
    logEl.scrollTop = logEl.scrollHeight;
}

browseBtn.onclick = () => {
    fileInput.click();
};

fileInput.onchange = () => {
    if (fileInput.files.length > 0) {
        filename.textContent = fileInput.files[0].name;
    }
};

uploadBtn.onclick = async () => {
    if (!API.token) {
        alert("Please connect first.");
        return;
    }

    if (fileInput.files.length === 0) {
        alert("Choose a video.");
        return;
    }

    const file = fileInput.files[0];
    uploadBtn.disabled = true;
    progress.value = 20;

    // Log the initiation of the upload task
    logToTerminal(
        "POST",
        "/api/upload",
        `Initiating Upload: ${file.name}\nSize: ${(file.size / (1024 * 1024)).toFixed(2)} MB\nType: ${file.type}`
    );

    try {
        // Execute your native API upload call
        const response = await API.upload(file);

        progress.value = 100;

        // Log the successful completion response
        logToTerminal(
            "SUCCESS",
            "/api/upload",
            `Status: 200 OK\nResponse: ${response ? JSON.stringify(response) : 'File uploaded successfully.'}`
        );

        alert("Upload successful");
    }
    catch (e) {
        progress.value = 0;

        // Log the exact failure reasons
        logToTerminal(
            "ERROR",
            "/api/upload",
            `Upload Failed!\nReason: ${e.message || e}`
        );

        alert(e);
    }

    uploadBtn.disabled = false;
};