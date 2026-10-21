// MarketSuite — Chart helpers
// Each function safely destroys the old chart before creating new one

function _safeDestroyChart(canvasId) {
    try {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const existing = Chart.getChart(canvas);
        if (existing) { existing.destroy(); }
        return canvas;
    } catch (e) { return null; }
}

window.renderSalesChart = function (canvasId, labels, data) {
    const canvas = _safeDestroyChart(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, 'rgba(245,158,11,0.25)');
    grad.addColorStop(1, 'rgba(245,158,11,0.02)');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data,
                borderColor: '#f59e0b',
                backgroundColor: grad,
                borderWidth: 2.5,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 400 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    borderColor: 'rgba(245,158,11,0.4)',
                    borderWidth: 1,
                    titleColor: '#f59e0b',
                    bodyColor: '#e2e8f0',
                    padding: 10,
                    callbacks: { label: ctx => ' Rs. ' + ctx.parsed.y.toLocaleString() }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    ticks: { color: '#94a3b8', font: { size: 11 } },
                    border: { display: false }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    ticks: { color: '#94a3b8', font: { size: 11 }, callback: v => 'Rs.' + v.toLocaleString() },
                    border: { display: false }
                }
            }
        }
    });
};

window.renderBarChart = function (canvasId, labels, data) {
    const canvas = _safeDestroyChart(canvasId);
    if (!canvas) return;
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{ data, backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b', borderWidth: 1.5, borderRadius: 6 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 400 },
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } }, border: { display: false } },
                y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94a3b8', font: { size: 11 } }, border: { display: false } }
            }
        }
    });
};

window.renderDoughnutChart = function (canvasId, labels, data) {
    const canvas = _safeDestroyChart(canvasId);
    if (!canvas) return;
    new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: ['#f59e0b', '#6366f1', '#22c55e', '#f43f5e', '#06b6d4'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 400 },
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#64748b', font: { size: 11 }, padding: 14 }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    borderColor: 'rgba(245,158,11,0.4)',
                    borderWidth: 1,
                    titleColor: '#f59e0b',
                    bodyColor: '#e2e8f0',
                    padding: 10,
                    callbacks: { label: ctx => ' ' + ctx.label + ': ' + ctx.parsed + '%' }
                }
            }
        }
    });
};

// ─── Bill / Invoice Print Functions ──────────────────────────────────────────

// Called by ClothingPOS.razor → JS.InvokeVoidAsync("clothingBillPrint", html)
// BillHtmlBuilder.cs builds a full HTML page and passes it here.
// We open it in a new window — it already contains window.onload=window.print()
window.clothingBillPrint = function (html) {
    var win = window.open('', '_blank', 'width=820,height=720,scrollbars=yes');
    if (!win) {
        alert('Pop-up blocked! Allow pop-ups for localhost in your browser settings, then try again.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
};

// Called by Shoes/POS.razor → JS.InvokeVoidAsync("printInvoice")
// Reads the inner HTML of .invoice-print-area and opens it in a clean print window.
window.printInvoice = function () {
    var area = document.querySelector('.invoice-print-area');
    var innerHtml = area ? area.innerHTML : '<p>Invoice content not found.</p>';

    var win = window.open('', '_blank', 'width=820,height=720,scrollbars=yes');
    if (!win) {
        alert('Pop-up blocked! Allow pop-ups for localhost in your browser settings, then try again.');
        return;
    }

    var fullHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice</title>' +
        '<style>' +
        'body{font-family:Arial,sans-serif;margin:0;padding:28px;color:#1e293b;font-size:13px;background:#fff}' +
        '*{box-sizing:border-box}' +
        'table{width:100%;border-collapse:collapse}' +
        'th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left}' +
        'th{font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:600}' +
        '.font-bold{font-weight:700}.text-right{text-align:right}.text-center{text-align:center}' +
        '.text-slate-500{color:#64748b}.text-slate-900{color:#0f172a}' +
        '.text-indigo-600{color:#4f46e5}.text-indigo-700{color:#4338ca}' +
        '.text-green-600{color:#16a34a}.text-red-500{color:#ef4444}' +
        '.bg-indigo-50{background:#eef2ff}.rounded-2xl{border-radius:1rem}' +
        '.rounded-full{border-radius:9999px}.p-6{padding:1.5rem}.p-4{padding:1rem}' +
        '.mb-6{margin-bottom:1.5rem}.mb-4{margin-bottom:1rem}.mb-2{margin-bottom:.5rem}' +
        '.mt-6{margin-top:1.5rem}.mt-4{margin-top:1rem}' +
        '.flex{display:flex}.justify-between{justify-content:space-between}.items-center{align-items:center}' +
        '.grid{display:grid}.grid-cols-2{grid-template-columns:repeat(2,1fr)}.gap-4{gap:1rem}' +
        '.text-2xl{font-size:1.5rem}.text-xl{font-size:1.25rem}.text-sm{font-size:.875rem}.text-xs{font-size:.75rem}' +
        '.font-semibold{font-weight:600}.tracking-wide{letter-spacing:.025em}.uppercase{text-transform:uppercase}' +
        '.border-t{border-top:1px solid #e2e8f0}.border-b{border-bottom:1px solid #e2e8f0}' +
        '.pt-4{padding-top:1rem}.pb-4{padding-bottom:1rem}' +
        '.w-12{width:3rem}.h-12{height:3rem}.w-16{width:4rem}.h-16{height:4rem}' +
        '.shadow-sm{box-shadow:0 1px 2px rgba(0,0,0,.05)}' +
        '.text-purple-600{color:#9333ea}.bg-purple-600{background:#9333ea}' +
        '.bg-indigo-600{background:#4f46e5}.text-white{color:#fff}' +
        '.inline-flex{display:inline-flex}.justify-center{justify-content:center}' +
        '.space-y-1>*+*{margin-top:.25rem}.space-y-2>*+*{margin-top:.5rem}' +
        '@media print{body{padding:12px}button{display:none!important}}' +
        '</style></head><body>' +
        innerHtml +
        '<script>setTimeout(function(){window.print();},300);<\/script>' +
        '</body></html>';

    win.document.open();
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
};