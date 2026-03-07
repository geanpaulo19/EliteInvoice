# ⚡ EliteInvoice: AI-Powered Instant Billing

**EliteInvoice** is a minimalist, professional web application built for freelancers and creatives. It turns messy, natural language notes into structured, branded invoices in seconds using AI.



---

## ✨ Features

* **Magic AI Input:** Type or speak your work details in plain English (e.g., *"3 hours of UI design at $50/hr and a ₱500 grab fee"*) and let **Qwen 3.5** build the table.
* **Multi-Currency Intelligence:** Automatically detects symbols (₱, $, €, £).
* **Live Revenue Dashboard:** Auto-converts all saved invoices into your **Base Currency** (set in Settings) using real-time exchange rates.
* **Cloud Persistence:** Powered by **Puter.js**, your invoices and settings are saved to your private cloud account. No database setup is required.
* **Professional Branding:** Upload your business logo and set your address once; it appears on every invoice.
* **Print-to-PDF:** Optimized CSS ensures that clicking "Print" generates a clean, professional A4 invoice with no UI clutter.

---

## 🛠️ Technical Stack

* **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3.
* **Cloud & AI:** [Puter.js v2](https://puter.com) (Storage, Auth, and AI).
* **AI Model:** `qwen/qwen3.5-27b`.
* **Currency API:** ExchangeRate-API (Real-time conversion).

---

## 🚀 No-Code Deployment

This project is a static web app, meaning it can be hosted anywhere for free.

1.  **Clone/Download** this repository.
2.  **Open** `index.html` in any modern browser (requires a local server or web hosting to run Puter.js).
3.  **Deploy to Netlify:**
    * Go to [Netlify Drop](https://app.netlify.com/drop).
    * Drag and drop the project folder.
    * Your app is live!

---

## 📂 Folder Structure

```text
.
├── index.html        # Main app structure & Sidebar
├── style.css         # Premium minimalist styling & Print rules
├── app.js            # Core logic, AI integration & Cloud storage
└── README.md         # Project documentation
