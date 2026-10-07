/**
 * QueueLess Admin Dashboard & Reports Chart.js Initialization
 */

let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    fetchAdminStats();
});

function fetchAdminStats() {
    const filterSelect = document.getElementById('dateFilter');
    const filter = filterSelect ? filterSelect.value : '7days';

    // 1. Fetch Daily Statistics (Line Chart)
    fetch(`/admin/api/admin/daily-statistics?filter=${filter}`)
        .then(res => res.json())
        .then(data => {
            renderChart('tokensPerDayChart', 'line', data.tokens_per_day);
        })
        .catch(err => console.error("Error fetching daily stats:", err));

    // 2. Fetch General Statistics (Doughnut Chart)
    fetch(`/admin/api/admin/statistics?filter=${filter}`)
        .then(res => res.json())
        .then(data => {
            renderDoughnutChart('completedVsCancelledChart', data.completed_vs_cancelled);
        })
        .catch(err => console.error("Error fetching general stats:", err));
        
    // 3. Fetch Service Statistics (Bar Charts)
    fetch(`/admin/api/admin/service-statistics?filter=${filter}`)
        .then(res => res.json())
        .then(data => {
            renderChart('serviceWiseQueueChart', 'bar', data.service_wise_queue, '#3b82f6');
            renderChart('averageWaitTimeChart', 'bar', data.average_wait_time, '#f97316');
        })
        .catch(err => console.error("Error fetching service stats:", err));
}

function renderChart(canvasId, type, chartData, color = null) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    let dataset = {
        label: canvasId === 'averageWaitTimeChart' ? 'Avg Service Time (mins)' : (canvasId === 'serviceWiseQueueChart' ? 'Tokens' : 'Tokens Generated'),
        data: chartData.data,
        backgroundColor: color || 'rgba(30, 58, 138, 0.1)',
        borderRadius: type === 'bar' ? 6 : 0,
        borderColor: type === 'line' ? '#1e3a8a' : color,
        borderWidth: type === 'line' ? 3 : 0,
        fill: type === 'line',
        tension: 0.35,
        pointRadius: type === 'line' ? 4 : 0,
        pointBackgroundColor: type === 'line' ? '#f97316' : null
    };

    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: chartData.labels,
            datasets: [dataset]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, precision: 0 }
            }
        }
    });
}

function renderDoughnutChart(canvasId, chartData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.data,
                backgroundColor: [
                    '#10b981', // Completed (Green)
                    '#ef4444', // Cancelled (Red)
                    '#f59e0b', // Skipped (Orange)
                    '#3b82f6'  // Waiting (Blue)
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}
