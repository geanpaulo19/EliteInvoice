/* ═══════════════════════════════════════════════════════════
   EliteInvoice — Application Logic
   Stack: Puter.js v2 (puter.kv, puter.fs, puter.ai)
   AI Model: qwen/qwen3.5-27b

   ╔══════════════════════════════════════════════════╗
   ║  DEFAULT TAX RATE                                ║
   ║  Change the number below to set the default tax  ║
   ║  percentage that pre-fills on every new invoice. ║
   ║  Example: 8 = 8%, 0 = no tax, 20 = 20% VAT      ║
   ╚══════════════════════════════════════════════════╝     */
const DEFAULT_TAX_RATE = 10;

const KV_SETTINGS  = 'eliteinvoice_settings';
const KV_INVOICES  = 'eliteinvoice_invoices';
const KV_COUNTER   = 'eliteinvoice_counter';
const FS_LOGO_PATH = 'eliteinvoice_logo';

const App = (() => {
  let currentCurrency = '$';
  let settings = {
    bizName: '', bizAddress: '',
    phone: '', email: '',
    linkedin: '', instagram: '', twitter: '', github: '',
    logoUrl: ''
  };

  /* ══════════ INIT ══════════ */
  async function init() {
    const today = new Date();
    document.getElementById('invoiceDate').value = fmtDate(today);
    const due = new Date(today); due.setDate(due.getDate() + 30);
    document.getElementById('invoiceDue').value = fmtDate(due);
    document.getElementById('taxRateInput').value = DEFAULT_TAX_RATE;
    addRow();
    await loadSettings();
    await resolveInvoiceNumber();
    updateStatus('online', 'Puter connected');
  }

  /* ══════════ NAVIGATION ══════════ */
  function navigate(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.view === view);
    });
    if (view === 'history') loadHistory();
    closeSidebar();
  }

  /* ══════════ SIDEBAR ══════════ */
  function toggleSidebar() {
    const sidebar   = document.getElementById('sidebar');
    const overlay   = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const isOpen    = sidebar.classList.toggle('is-open');
    hamburger.classList.toggle('is-open', isOpen);
    overlay.classList.toggle('visible', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('is-open');
    document.getElementById('hamburgerBtn').classList.remove('is-open');
    document.getElementById('sidebarOverlay').classList.remove('visible');
    document.body.style.overflow = '';
  }

  /* ══════════ INVOICE NUMBER ══════════ */
  async function resolveInvoiceNumber() {
    try {
      let counter = await puter.kv.get(KV_COUNTER);
      counter = counter ? parseInt(counter) : 0;
      document.getElementById('invoiceNumber').textContent =
        '#INV-' + String(counter + 1).padStart(4, '0');
    } catch (e) {
      document.getElementById('invoiceNumber').textContent = '#INV-0001';
    }
  }

  /* ══════════ ROW MANAGEMENT ══════════ */
  function addRow(desc = '', qty = 1, price = '') {
    const tbody = document.getElementById('invoiceBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" placeholder="Item description" value="${escHtml(desc)}" oninput="App.updateTotals()" /></td>
      <td class="td-qty"><input type="number" value="${qty}" min="0" step="any" oninput="App.updateTotals()" /></td>
      <td class="td-price"><input type="number" value="${price}" min="0" step="any" placeholder="0.00" oninput="App.updateTotals()" /></td>
      <td class="td-total">—</td>
      <td class="col-del no-print">
        <button class="del-row-btn" onclick="App.deleteRow(this)" title="Remove row">×</button>
      </td>`;
    tbody.appendChild(tr);
    updateTotals();
  }

  function deleteRow(btn) {
    btn.closest('tr').remove();
    updateTotals();
  }

  /* ══════════ TOTALS ══════════ */
  function updateTotals() {
    const rows = document.querySelectorAll('#invoiceBody tr');
    const sym  = currentCurrency;
    let subtotal = 0;
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      const qty    = parseFloat(inputs[1].value) || 0;
      const price  = parseFloat(inputs[2].value) || 0;
      const line   = qty * price;
      subtotal    += line;
      row.querySelector('.td-total').textContent = line ? sym + fmt(line) : '—';
    });
    const taxPct = parseFloat(document.getElementById('taxRateInput').value) || 0;
    const tax    = subtotal * (taxPct / 100);
    const total  = subtotal + tax;
    document.getElementById('subtotalVal').textContent = sym + fmt(subtotal);
    document.getElementById('taxVal').textContent      = sym + fmt(tax);
    document.getElementById('totalVal').textContent    = sym + fmt(total);
  }

  /* ══════════ CURRENCY ══════════ */
  function setCurrency(sym) {
    currentCurrency = sym;
    updateTotals();
  }

  /* ══════════ NEW INVOICE ══════════
     Resets the form for a brand-new invoice and advances
     the invoice number to the next one in sequence.      */
  async function newInvoice() {
    // Reset all form fields
    document.getElementById('invoiceBody').innerHTML   = '';
    document.getElementById('clientName').value        = '';
    document.getElementById('clientEmail').value       = '';
    document.getElementById('clientAddress').value     = '';
    document.getElementById('invoiceNotes').value      = '';
    document.getElementById('magicInput').value        = '';
    document.getElementById('magicStatus').textContent = '';
    document.getElementById('taxRateInput').value      = DEFAULT_TAX_RATE;

    // Reset dates
    const today = new Date();
    document.getElementById('invoiceDate').value = fmtDate(today);
    const due = new Date(today); due.setDate(due.getDate() + 30);
    document.getElementById('invoiceDue').value = fmtDate(due);

    // Advance to next invoice number
    await resolveInvoiceNumber();

    // Start with one blank row
    addRow();
    showToast('Ready for a new invoice.');
  }

  /* ══════════ AI MAGIC PARSE ══════════ */
  async function runMagicParse() {
    const input = document.getElementById('magicInput').value.trim();
    if (!input) { showToast('Please enter invoice details first.'); return; }
    const btn = document.getElementById('magicBtn');
    btn.disabled = true;
    setMagicStatus('loading', 'Parsing with AI…');
    const systemPrompt =
      'You are an invoice data extractor. Extract items as a JSON array of ' +
      '{desc, qty, price}. Also, identify the currency symbol used ' +
      '(e.g., $, €, £, ₱). If no symbol is found, default to \'$\'. ' +
      'Return ONLY valid JSON in this exact shape: ' +
      '{"currency":"$","items":[{"desc":"...","qty":1,"price":0}]}';
    try {
      const response = await puter.ai.chat(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: input }],
        { model: 'qwen/qwen3.5-27b' }
      );
      const rawText = (typeof response === 'string')
        ? response
        : (response?.message?.content || response?.toString() || '');
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                        rawText.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim();
      const parsed  = JSON.parse(jsonStr);
      if (parsed.currency) {
        currentCurrency = parsed.currency;
        const sel = document.getElementById('currencySelect');
        for (let opt of sel.options) {
          if (opt.value === parsed.currency) { sel.value = parsed.currency; break; }
        }
      }
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        document.getElementById('invoiceBody').innerHTML = '';
        parsed.items.forEach(item => addRow(item.desc, item.qty, item.price));
        setMagicStatus('ok', `✓ ${parsed.items.length} item${parsed.items.length > 1 ? 's' : ''} extracted`);
        showToast('Invoice items populated!');
      } else {
        setMagicStatus('err', 'No items found. Try rephrasing.');
      }
    } catch (err) {
      console.error('AI parse error:', err);
      setMagicStatus('err', 'Parse failed — check input or try again.');
      showToast('AI parsing failed. Please try again.');
    }
    btn.disabled = false;
  }

  function setMagicStatus(type, msg) {
    const el = document.getElementById('magicStatus');
    el.innerHTML = type === 'loading' ? `<span class="spinner"></span> ${msg}` : msg;
    el.style.color = type === 'ok' ? 'var(--success)' : type === 'err' ? 'var(--danger)' : 'var(--text-secondary)';
  }

  /* ══════════ SAVE INVOICE ══════════ */
  async function saveInvoice() {
    const rows  = document.querySelectorAll('#invoiceBody tr');
    const items = [];
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      items.push({ desc: inputs[0].value, qty: parseFloat(inputs[1].value) || 0, price: parseFloat(inputs[2].value) || 0 });
    });
    const taxPct   = parseFloat(document.getElementById('taxRateInput').value) || 0;
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const tax      = subtotal * (taxPct / 100);
    const total    = subtotal + tax;
    const invoice  = {
      id:          document.getElementById('invoiceNumber').textContent,
      date:        document.getElementById('invoiceDate').value,
      due:         document.getElementById('invoiceDue').value,
      clientName:  document.getElementById('clientName').value,
      clientEmail: document.getElementById('clientEmail').value,
      clientAddr:  document.getElementById('clientAddress').value,
      notes:       document.getElementById('invoiceNotes').value,
      currency:    currentCurrency,
      taxPct, items, subtotal, tax, total,
      savedAt:     new Date().toISOString()
    };
    try {
      let invoices = await puter.kv.get(KV_INVOICES) || [];
      if (typeof invoices === 'string') invoices = JSON.parse(invoices);
      invoices.unshift(invoice);
      await puter.kv.set(KV_INVOICES, invoices);
      let counter = await puter.kv.get(KV_COUNTER) || 0;
      await puter.kv.set(KV_COUNTER, parseInt(counter) + 1);
      showToast('Invoice saved successfully!');
      await resolveInvoiceNumber();
    } catch (e) {
      console.error('Save error:', e);
      showToast('Save failed. Please try again.');
    }
  }

  /* ══════════ CLEAR INVOICE ══════════ */
  function clearInvoice() {
    document.getElementById('invoiceBody').innerHTML   = '';
    document.getElementById('clientName').value        = '';
    document.getElementById('clientEmail').value       = '';
    document.getElementById('clientAddress').value     = '';
    document.getElementById('invoiceNotes').value      = '';
    document.getElementById('magicInput').value        = '';
    document.getElementById('magicStatus').textContent = '';
    document.getElementById('taxRateInput').value      = DEFAULT_TAX_RATE;
    addRow();
    showToast('Invoice cleared.');
  }

  /* ══════════ LOAD HISTORY ══════════ */
  async function loadHistory() {
    const container = document.getElementById('historyList');
    container.innerHTML = '<div class="empty-state"><span class="spinner"></span></div>';
    try {
      let invoices = await puter.kv.get(KV_INVOICES) || [];
      if (typeof invoices === 'string') invoices = JSON.parse(invoices);
      if (!invoices.length) {
        container.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg><p>No saved invoices yet.</p></div>`;
        return;
      }
      container.innerHTML = invoices.map((inv, idx) => `
        <div class="history-card">
          <div class="history-card-info">
            <div class="hc-number">${escHtml(inv.id)}</div>
            <div class="hc-client">${escHtml(inv.clientName || 'Unknown Client')}</div>
            <div class="hc-date">Saved ${new Date(inv.savedAt).toLocaleDateString()}</div>
          </div>
          <div class="history-card-amount">${escHtml(inv.currency)}${fmt(inv.total)}</div>
          <div class="history-card-actions">
            <button class="btn-load" onclick="App.loadInvoiceToEditor(${idx})">Load</button>
            <button class="btn-del-invoice" onclick="App.deleteInvoice(${idx})">Delete</button>
          </div>
        </div>`).join('');
    } catch (e) {
      container.innerHTML = '<div class="empty-state"><p>Failed to load invoices.</p></div>';
    }
  }

  /* ══════════ LOAD INVOICE INTO EDITOR ══════════ */
  async function loadInvoiceToEditor(idx) {
    try {
      let invoices = await puter.kv.get(KV_INVOICES) || [];
      if (typeof invoices === 'string') invoices = JSON.parse(invoices);
      const inv = invoices[idx];
      if (!inv) return;
      currentCurrency = inv.currency || '$';
      const sel = document.getElementById('currencySelect');
      for (let opt of sel.options) { if (opt.value === currentCurrency) sel.value = currentCurrency; }
      document.getElementById('invoiceNumber').textContent = inv.id;
      document.getElementById('invoiceDate').value         = inv.date;
      document.getElementById('invoiceDue').value          = inv.due;
      document.getElementById('clientName').value          = inv.clientName;
      document.getElementById('clientEmail').value         = inv.clientEmail;
      document.getElementById('clientAddress').value       = inv.clientAddr;
      document.getElementById('invoiceNotes').value        = inv.notes;
      document.getElementById('taxRateInput').value        = inv.taxPct;
      document.getElementById('invoiceBody').innerHTML = '';
      inv.items.forEach(item => addRow(item.desc, item.qty, item.price));
      navigate('invoice');
      showToast('Invoice loaded into editor.');
    } catch (e) {
      showToast('Failed to load invoice.');
    }
  }

  /* ══════════ DELETE INVOICE ══════════ */
  async function deleteInvoice(idx) {
    try {
      let invoices = await puter.kv.get(KV_INVOICES) || [];
      if (typeof invoices === 'string') invoices = JSON.parse(invoices);
      invoices.splice(idx, 1);
      await puter.kv.set(KV_INVOICES, invoices);
      showToast('Invoice deleted.');
      loadHistory();
    } catch (e) {
      showToast('Delete failed.');
    }
  }

  /* ══════════ SETTINGS: LOAD ══════════ */
  async function loadSettings() {
    try {
      const saved = await puter.kv.get(KV_SETTINGS);
      if (saved) {
        settings = typeof saved === 'string' ? JSON.parse(saved) : saved;
        document.getElementById('settingBizName').value    = settings.bizName    || '';
        document.getElementById('settingBizAddress').value = settings.bizAddress || '';
        document.getElementById('settingPhone').value      = settings.phone      || '';
        document.getElementById('settingEmail').value      = settings.email      || '';
        document.getElementById('settingLinkedin').value   = settings.linkedin   || '';
        document.getElementById('settingInstagram').value  = settings.instagram  || '';
        document.getElementById('settingTwitter').value    = settings.twitter    || '';
        document.getElementById('settingGithub').value     = settings.github     || '';
        applySettingsToInvoice();
      }
    } catch (e) { /* silent */ }
  }

  /* ══════════ SETTINGS: SAVE ══════════ */
  async function saveSettings() {
    const statusEl = document.getElementById('settingsSaveStatus');
    settings.bizName    = document.getElementById('settingBizName').value.trim();
    settings.bizAddress = document.getElementById('settingBizAddress').value.trim();
    settings.phone      = document.getElementById('settingPhone').value.trim();
    settings.email      = document.getElementById('settingEmail').value.trim();
    settings.linkedin   = document.getElementById('settingLinkedin').value.trim();
    settings.instagram  = document.getElementById('settingInstagram').value.trim();
    settings.twitter    = document.getElementById('settingTwitter').value.trim();
    settings.github     = document.getElementById('settingGithub').value.trim();
    try {
      await puter.kv.set(KV_SETTINGS, settings);
      applySettingsToInvoice();
      statusEl.textContent = '✓ Settings saved';
      statusEl.className   = 'save-status ok';
      showToast('Settings saved!');
      setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'save-status'; }, 3000);
    } catch (e) {
      statusEl.textContent = '✗ Failed to save';
      statusEl.className   = 'save-status err';
    }
  }

  /* ══════════ APPLY SETTINGS → INVOICE ══════════ */
  function applySettingsToInvoice() {
    document.getElementById('invoiceBizName').textContent    = settings.bizName    || 'Your Business Name';
    document.getElementById('invoiceBizAddress').textContent = settings.bizAddress || '123 Main Street, City, Country';
    const contactEl = document.getElementById('invoiceBizContact');
    const parts = [];
    if (settings.phone) parts.push(escHtml(settings.phone));
    if (settings.email) parts.push(`<a href="mailto:${escHtml(settings.email)}">${escHtml(settings.email)}</a>`);
    const socialMap = [
      { key: 'linkedin', label: 'LinkedIn' }, { key: 'instagram', label: 'Instagram' },
      { key: 'twitter',  label: 'X' },        { key: 'github',    label: 'GitHub' }
    ];
    socialMap.forEach(({ key, label }) => {
      if (settings[key]) parts.push(`<a href="${escHtml(settings[key])}" target="_blank" rel="noopener">${label}</a>`);
    });
    contactEl.innerHTML = parts.join(' &nbsp;·&nbsp; ');
    if (settings.logoUrl) {
      const logo = document.getElementById('invoiceLogo');
      logo.src = settings.logoUrl;
      logo.style.display = 'block';
    }
  }

  /* ══════════ LOGO UPLOAD ══════════ */
  async function uploadLogo(input) {
    const file     = input.files[0];
    const statusEl = document.getElementById('logoUploadStatus');
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      statusEl.textContent = '✗ File too large (max 2MB)';
      statusEl.className   = 'upload-status err';
      return;
    }
    statusEl.innerHTML = '<span class="spinner"></span> Uploading…';
    statusEl.className = 'upload-status';
    try {
      await puter.fs.write(FS_LOGO_PATH, file, { overwrite: true });
      const url = await puter.fs.getReadURL(FS_LOGO_PATH);
      settings.logoUrl = url;
      await puter.kv.set(KV_SETTINGS, settings);
      const preview = document.getElementById('settingsLogoPreview');
      preview.src = url;
      preview.style.display = 'block';
      document.getElementById('logoPlaceholder').style.display = 'none';
      applySettingsToInvoice();
      statusEl.textContent = '✓ Logo uploaded and saved';
      statusEl.className   = 'upload-status ok';
      showToast('Logo uploaded!');
    } catch (e) {
      console.error('Logo upload error:', e);
      statusEl.textContent = '✗ Upload failed — try again';
      statusEl.className   = 'upload-status err';
    }
  }

  /* ══════════ STATUS BAR ══════════ */
  function updateStatus(state, text) {
    document.getElementById('statusDot').className    = 'status-dot ' + state;
    document.getElementById('statusText').textContent = text;
  }

  /* ══════════ TOAST ══════════ */
  let toastTimer;
  function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  /* ══════════ UTILITIES ══════════ */
  function fmt(n)     { return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtDate(d) { return d.toISOString().split('T')[0]; }
  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ══════════ PUBLIC API ══════════ */
  return {
    init, navigate,
    toggleSidebar, closeSidebar,
    addRow, deleteRow, updateTotals,
    setCurrency, newInvoice, runMagicParse,
    saveInvoice, clearInvoice, loadHistory,
    loadInvoiceToEditor, deleteInvoice,
    saveSettings, uploadLogo
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init().catch(err => console.warn('EliteInvoice init error:', err));
});