/**
 * QueueLess Citizen Frontend Logic & Real-time Live Tracking
 */

document.addEventListener('DOMContentLoaded', () => {
    initTokenLiveTracker();
    initNotificationHandler();
});

function initTokenLiveTracker() {
    const tokenContainer = document.getElementById('liveTokenContainer');
    if (!tokenContainer) return;

    const tokenId = tokenContainer.getAttribute('data-token-id');
    if (!tokenId) return;

    // Poll status every 3 seconds
    setInterval(() => {
        fetch(`/token/api/status/${tokenId}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) return;

                // Update status badge
                const statusBadge = document.getElementById('tokenStatusBadge');
                if (statusBadge && statusBadge.textContent.trim().toLowerCase() !== data.status.toLowerCase()) {
                    statusBadge.textContent = data.status.toUpperCase();
                    statusBadge.className = `status-badge status-${data.status.toLowerCase()}`;
                    
                    // Audio alert if turn called
                    if (data.status === 'serving') {
                        playTurnSound();
                        showTurnBanner(data.counter_number);
                    }
                }

                // Update position ahead
                const peopleAheadElem = document.getElementById('peopleAheadVal');
                if (peopleAheadElem) {
                    peopleAheadElem.textContent = data.people_ahead;
                }

                // Update wait time
                const estWaitElem = document.getElementById('estWaitVal');
                if (estWaitElem) {
                    estWaitElem.textContent = data.estimated_wait_mins + ' mins';
                }

                // Update current serving token
                const currentServingElem = document.getElementById('currentServingVal');
                if (currentServingElem) {
                    currentServingElem.textContent = data.current_serving_token;
                }

                // Update assigned counter
                const counterElem = document.getElementById('assignedCounterVal');
                if (counterElem) {
                    counterElem.textContent = data.counter_number;
                }
            })
            .catch(err => console.error("Tracking Error:", err));
    }, 3000);
}

function playTurnSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } catch(e) {
        console.log("Audio play blocked by browser policy");
    }
}

function showTurnBanner(counterNumber) {
    const alertBox = document.getElementById('liveTurnAlert');
    if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = `🎉 <strong>IT'S YOUR TURN!</strong> Please proceed immediately to <strong>${counterNumber}</strong>.`;
    }
}

function initNotificationHandler() {
    const markReadBtn = document.getElementById('markReadBtn');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', () => {
            fetch('/citizen/notifications/mark-read', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    const badge = document.getElementById('notifBadge');
                    if (badge) badge.style.display = 'none';
                });
        });
    }
}
