# Meonot Guest Autofill for Chrome

A Manifest V3 Chrome extension designed to automate host and guest visitor registration forms on the Shikun Binui Meonot portal (`meonot.shikunbinui.com`).

---

## ⚠️ Important Security & Privacy Notice

* **Unencrypted Local Storage:** Host details and saved guest profiles are stored locally in your browser profile using `chrome.storage.local` and temporary `sessionStorage` in **plaintext (unencrypted)**. Data is never sent to any external server or third-party API.
* **Shared Devices:** Because credentials and personal details are unencrypted locally, do not install this extension on public, shared, or untrusted machines.
* **Built with AI:** This extension was scaffolded and implemented with the assistance of Artificial Intelligence (AI). Review the code prior to deployment in your environment.

---

## Features

* **Host Profile Persistence:** Save your personal host details once (Full Name, Israeli ID, Phone, Dormitory complex, Building, Floor, Apartment, and Side).
* **Multi-Step Form Handling:** Automatically handles cascading dropdown postbacks (Dorm → Building → Floor → Apartment) and auto-selects visitor categories.
* **Guest List Management:** Maintain a reusable local list of frequent visitors (Name, Israeli ID, Phone).
* **Multi-Slot Guest Filling:** Supports filling up to 3 guest slots dynamically based on available form fields.

---

## Installation

1. **Clone or Download the Repository:**
   ```bash
   git clone [https://github.com/eladth/TAU-Meonot-Guest-Autofill.git](https://github.com/eladth/TAU-Meonot-Guest-Autofill.git)
