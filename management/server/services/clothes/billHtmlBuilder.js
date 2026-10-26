// Direct port of Services/Clothes/BillHtmlBuilder.cs — builds a printable HTML invoice.
function formatMoney(n) {
  return Math.round(n || 0).toLocaleString('en-US');
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(d) {
  const date = new Date(d);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function build(sale, shopName = 'StyleHub Clothing', shopAddress = 'Liberty Market, Lahore') {
  let html = '';
  html += "<!DOCTYPE html><html><head><meta charset='utf-8'>";
  html += `<title>Invoice ${sale.invoiceNumber}</title>`;
  html += '<style>';
  html += 'body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#1e293b;font-size:13px}';
  html += '.header{text-align:center;margin-bottom:24px;border-bottom:2px solid #f43f5e;padding-bottom:16px}';
  html += '.header h1{color:#f43f5e;margin:0 0 4px 0;font-size:22px}';
  html += '.header p{margin:2px 0;color:#64748b;font-size:12px}';
  html += '.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}';
  html += '.info-box{background:#f8fafc;border-radius:8px;padding:10px 14px}';
  html += '.info-box label{font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:bold}';
  html += '.info-box p{margin:2px 0 0 0;font-weight:bold}';
  html += 'table{width:100%;border-collapse:collapse;margin-bottom:12px}';
  html += 'thead tr{background:#f43f5e;color:white}';
  html += 'thead th{padding:8px;text-align:left;font-size:11px}';
  html += 'td{padding:6px 8px;border-bottom:1px solid #f1f5f9}';
  html += '.total-row td{font-size:16px;font-weight:bold;color:#f43f5e;border-bottom:none}';
  html += '.footer{text-align:center;margin-top:24px;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:12px}';
  html += '@media print{body{padding:12px}}';
  html += '</style></head><body>';

  html += "<div class='header'>";
  html += `<h1>&#128085; ${shopName}</h1>`;
  html += `<p>${shopAddress}</p>`;
  html += `<p style='font-size:18px;font-weight:bold;color:#1e293b;margin:8px 0 0 0'>Invoice: ${sale.invoiceNumber}</p>`;
  html += '</div>';

  html += "<div class='info-grid'>";
  html += `<div class='info-box'><label>Customer</label><p>${sale.customerName || 'Walk-in Customer'}</p>`;
  if (sale.customerPhone) html += `<p style='font-weight:normal;color:#64748b;font-size:12px'>${sale.customerPhone}</p>`;
  html += '</div>';

  html += "<div class='info-box'><label>Date &amp; Time</label>";
  html += `<p>${formatDate(sale.saleDate)}</p>`;
  html += `<p style='font-weight:normal;color:#64748b;font-size:12px'>${formatTime(sale.saleDate)}</p>`;
  html += '</div>';

  html += `<div class='info-box'><label>Payment Method</label><p>${sale.paymentMethod}</p></div>`;

  html += `<div class='info-box'><label>Status</label><p>${sale.status}</p>`;
  if (sale.salesmanName) html += `<p style='font-weight:normal;color:#64748b;font-size:12px'>By: ${sale.salesmanName}</p>`;
  html += '</div></div>';

  html += "<table><thead><tr>";
  html += "<th>Item</th><th>Qty</th><th style='text-align:right'>Unit Price</th><th style='text-align:right'>Total</th>";
  html += '</tr></thead><tbody>';

  for (const item of sale.items) {
    html += '<tr>';
    html += `<td>${item.productName}<br><small style='color:#94a3b8'>${item.size || '-'} / ${item.color || '-'}</small></td>`;
    html += `<td style='text-align:center'>${item.quantity}</td>`;
    html += `<td style='text-align:right'>Rs. ${formatMoney(item.unitPrice)}</td>`;
    html += `<td style='text-align:right;font-weight:bold'>Rs. ${formatMoney(item.lineTotal)}</td>`;
    html += '</tr>';
  }

  html += "<tr><td colspan='3' style='text-align:right;color:#64748b'>Subtotal</td>";
  html += `<td style='text-align:right'>Rs. ${formatMoney(sale.subTotal)}</td></tr>`;

  if (sale.discountAmount > 0) {
    html += "<tr><td colspan='3' style='text-align:right;color:#16a34a'>Discount</td>";
    html += `<td style='text-align:right;color:#16a34a'>-Rs. ${formatMoney(sale.discountAmount)}</td></tr>`;
  }

  html += "<tr class='total-row'><td colspan='3' style='text-align:right;padding:10px 8px'>TOTAL</td>";
  html += `<td style='text-align:right;padding:10px 8px'>Rs. ${formatMoney(sale.totalAmount)}</td></tr>`;

  html += '</tbody></table>';
  html += "<div class='footer'>Thank you for shopping with us! &#128591;</div>";
  html += '<script>window.onload=function(){window.print();}</script>';
  html += '</body></html>';

  return html;
}

module.exports = { build };
