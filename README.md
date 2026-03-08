# ⚡ EliteInvoice — AI-Powered Instant Billing

**EliteInvoice** is a minimalist, professional invoicing web app built for freelancers and creatives. Describe your work in plain English and let AI build a complete, branded invoice in seconds.

---

## ✨ Features

- **✦ AI Magic Input** — Paste or type your work details in plain language (e.g. *"3 hours of UI design at $150/hr for Acme Corp, due in 30 days, 10% tax"*) and the AI auto-fills **everything**: client name, email, address, invoice date, due date, tax rate, notes, line items, and currency.
- **🌍 20 Currencies with Flags** — Supports USD, EUR, GBP, PHP, JPY, AUD, CAD, SGD, HKD, NZD, KRW, INR, BRL, CHF, SEK, MXN, AED, SAR, PLN, CZK — automatically detected from your text.
- **📊 Live Revenue Dashboard** — Auto-converts all saved invoices to your base currency using real-time exchange rates (Frankfurter + open.er-api.com fallback).
- **🖨️ Print-to-PDF** — Polished A4 print layout with accent bar, zebra-striped table, and branded bill-to block. Always renders in light mode regardless of app theme.
- **🌙 Dark / Light Mode** — Toggle in Settings. Respects your system preference on first visit.
- **💾 Local Storage** — All invoices and settings are stored in your browser's `localStorage`. No account, no database, no server.
- **📤 Export & Import** — Download a full JSON backup of your invoices anytime. Restore or migrate with one click.
- **🏢 Business Branding** — Upload your logo, set your name, address, and contact info once — it appears on every invoice.
- **✏️ Edit Saved Invoices** — Load any past invoice back into the editor, make changes, and update in place.
- **🗑️ Delete with Confirmation** — Invoices are protected by a confirmation dialog before permanent deletion.
- **📧 AI Email Drafts** — Generate a professional payment reminder email for any invoice, with tone adjusted based on how overdue it is.
- **❓ Help & Guide** — Built-in FAQ, quick-start cards, and pro tips so users never need to leave the app.

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| AI | Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`) |
| AI Proxy | Cloudflare Worker (`worker.js`) |
| Storage | Browser `localStorage` |
| Currency API | [Frankfurter](https://www.frankfurter.app) + [open.er-api.com](https://open.er-api.com) fallback |

---

## 🚀 Deployment

EliteInvoice is a **static web app** — no build step, no backend, no database.

### Frontend (Cloudflare Pages)

1. Push `index.html`, `app.js`, and `style.css` to a GitHub repository.
2. Go to [Cloudflare Pages](https://pages.cloudflare.com) → **Create a project** → connect your repo.
3. No build command needed. Deploy as-is.

### AI Worker (Cloudflare Workers)

The AI Magic Input routes through a lightweight Cloudflare Worker to access Workers AI.

1. Go to [Cloudflare Workers](https://workers.cloudflare.com) → **Create a Worker**.
2. Paste the contents of `worker.js`.
3. Under **Settings → Bindings**, add an **AI binding** named `AI`.
4. Deploy. Copy the Worker URL and update `WORKER_URL` in `app.js`.

### Alternative: Netlify

1. Go to [Netlify Drop](https://app.netlify.com/drop).
2. Drag and drop the project folder.
3. Your app is live instantly.

> **Note:** The AI Magic feature requires the Cloudflare Worker. If deployed without it, all other features work normally.

---

## 📂 Project Structure

```
.
├── index.html     # App structure, sidebar, all views (Invoice, History, Settings, Help)
├── style.css      # Styling, dark/light mode, print rules, responsive layout
├── app.js         # Core logic, AI integration, localStorage, currency conversion
├── worker.js      # Cloudflare Worker — AI proxy (deploy separately)
└── README.md      # This file
```

---

## ⚠️ AI Disclaimer

The AI Magic Input uses a language model to extract invoice data from your text. While it works well in most cases, **AI can make mistakes**. Always review auto-filled fields — especially amounts, dates, and client details — before saving your invoice.

---

## 💬 Feedback & Contact

Found a bug, have a suggestion, or just want to say hello?

📧 [me@geanpaulo.com](mailto:me@geanpaulo.com)

---

## 📄 License

MIT — free to use, modify, and deploy.
