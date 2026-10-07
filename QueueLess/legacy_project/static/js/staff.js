/**
 * QueueLess Staff Dashboard Dynamic Controls & Auto-polling
 */

document.addEventListener('DOMContentLoaded', () => {
    const staffDashboard = document.getElementById('staffDashboardContainer');
    if (!staffDashboard) return;

    // Start auto polling every 4 seconds
    setInterval(fetchQueueData, 4000);
});

function fetchQueueData() {
    fetch('/staff/api/queue')
        .then(res => res.json())
        .then(data => {
            updateDashboardUI(data);
        })
        .catch(err => console.error("Error polling staff queue:", err));
}

function updateDashboardUI(data) {
    const currentTokenEl = document.getElementById('currentTokenDisplay');
    const waitingCountEl = document.getElementById('waitingCountDisplay');
    const completedCountEl = document.getElementById('completedCountDisplay');
    const queueTableBody = document.getElementById('queueTableBody');

    if (waitingCountEl) waitingCountEl.textContent = data.waiting ? data.waiting.length : 0;
    if (completedCountEl && data.completed_today !== undefined) {
        completedCountEl.textContent = data.completed_today;
    }

    if (currentTokenEl) {
        if (data.serving) {
            currentTokenEl.textContent = data.serving.token_number;
            currentTokenEl.style.color = "var(--primary-royal)";
        } else {
            currentTokenEl.textContent = "None";
            currentTokenEl.style.color = "var(--text-muted)";
        }
    }

    if (queueTableBody && data.waiting) {
        if (data.waiting.length === 0) {
            queueTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No tokens waiting in queue.</td></tr>`;
            return;
        }

        queueTableBody.innerHTML = data.waiting.map(token => `
            <tr>
                <td><strong style="color: var(--primary-royal); font-size: 1.1rem;">${token.token_number}</strong></td>
                <td>${token.user_name || 'Citizen'}</td>
                <td>${token.service_name || 'Service'}</td>
                <td><span class="status-tag status-${token.status.toLowerCase()}">${token.status.toUpperCase()}</span></td>
                <td>
                    <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                        <button onclick="performStaffAction('/staff/api/call-next', {})" class="btn btn-primary btn-sm">Call Next</button>
                        <button onclick="performStaffAction('/staff/api/skip', {token_id: ${token.id}})" class="btn btn-outline btn-sm">Skip</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

function performStaffAction(endpoint, payload) {
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.message) {
            console.log(data.message);
        }
        fetchQueueData();
    })
    .catch(err => {
        console.error("Action error:", err);
        location.reload();
    });
}
