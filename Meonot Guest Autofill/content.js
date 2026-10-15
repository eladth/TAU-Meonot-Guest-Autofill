// === בדיקה בטעינת הדף: האם אנחנו באמצע תהליך? ===
(function checkAutoFill() {
    const savedData = sessionStorage.getItem('meonot_autofill_host');
    if (savedData) {
        console.log("נמצא תהליך מילוי פעיל, ממשיך אוטומטית...");
        const data = JSON.parse(savedData);
        setTimeout(() => processForm(data, true), 800);
    }
})();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FILL_HOST") {
    sessionStorage.setItem('meonot_autofill_host', JSON.stringify(request.data));
    processForm(request.data, false);
  } else if (request.action === "FILL_GUEST") {
    fillGuestForm(request.data);
  }
});

// === לוגיקת מילוי מארח (ללא שינוי) ===
async function processForm(data, isContinuation) {
  const statusDiv = showStatusMessage(isContinuation ? "ממשיך במילוי..." : "מתחיל במילוי...");

  try {
    fillById("FullName", data.name);
    fillById("Phone", data.phone);
    fillBySmartSearch(["תעודת זהות", "ת.ז", "מספר זהות", "ID"], data.id);

    const typeChanged = await setSelectByText("DropDownFaultCategory", "פניות בנושא מבקרים");
    if (typeChanged) {
        updateStatus(statusDiv, "סוג פנייה עודכן, ממתין לריענון...");
        return; 
    }

    const today = getTodayDate();
    const datePickers = document.querySelectorAll('.datepicker, .hasDatepicker, input[id*="Date"]');
    datePickers.forEach(el => { 
        if (!el.value) {
            el.value = today;
            el.dispatchEvent(new Event('change', {bubbles:true}));
        }
    });

    const dormsChanged = await setSelectByText("DormDropDown", data.dorms);
    if (dormsChanged) {
        updateStatus(statusDiv, "מעונות עודכן, ממתין לריענון...");
        return;
    }

    if (!isSelectPopulated("DropDownBuilding")) {
        const ready = await waitForOptionsToPopulate(["DropDownBuilding"], 3000);
        if (!ready) {
             updateStatus(statusDiv, "רשימת בניינים ריקה. מנסה לרענן...", true);
             const select = document.getElementById("DormDropDown");
             if (select) { select.selectedIndex = 0; triggerPostBack(select); }
             return;
        }
    }

    const buildingChanged = await setSelectByText("DropDownBuilding", data.building);
    if (buildingChanged) {
        updateStatus(statusDiv, "בניין עודכן, ממתין לריענון...");
        return;
    }

    if (await waitForOptionsToPopulate(["DropDownFloor"], 3000)) {
        const floorChanged = await setSelectByText("DropDownFloor", data.floor);
        if (floorChanged) {
            updateStatus(statusDiv, "קומה עודכנה, ממתין לריענון...");
            return;
        }
    } else { return; }

    if (await waitForOptionsToPopulate(["DropDownUnit"], 3000)) {
        const aptChanged = await setSelectByText("DropDownUnit", data.apt);
        if (aptChanged) {
            updateStatus(statusDiv, "דירה עודכנה, ממתין לריענון...");
            return;
        }
    } else { return; }

    if (data.side) {
        await setSelectByText("DropDownSide", data.side);
    }

    updateStatus(statusDiv, "המילוי הושלם בהצלחה!", false, 4000);
    sessionStorage.removeItem('meonot_autofill_host');

  } catch (err) {
    console.error("Error:", err);
    updateStatus(statusDiv, "שגיאה: " + err.message, true);
  }
}

// === לוגיקת מילוי אורח החדשה (תמיכה ב-3 אורחים) ===
function fillGuestForm(data) {
    showStatusMessage(`מנסה למלא את ${data.name}...`);

    // הגדרת הסלוטים לפי התמונה ששלחת
    // הסלוט הראשון הוא ללא מספר, השני עם "2", השלישי עם "3"
    const slots = [
        { 
            name: "אורח 1",
            labels: { name: "שם האורח:", id: "תעודת זהות אורח:", phone: "טלפון אורח:" } 
        },
        { 
            name: "אורח 2",
            labels: { name: "שם האורח 2:", id: "תעודת זהות אורח 2:", phone: "טלפון אורח 2:" } 
        },
        { 
            name: "אורח 3",
            labels: { name: "שם האורח 3:", id: "תעודת זהות אורח 3:", phone: "טלפון אורח 3:" } 
        }
    ];

    let filledSlot = false;

    // רצים על הסלוטים ובודקים איזה פנוי
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        
        // מנסים למצוא את השדות של הסלוט הזה
        const nameInput = findInputByExactLabel(slot.labels.name);
        const idInput = findInputByExactLabel(slot.labels.id);
        const phoneInput = findInputByExactLabel(slot.labels.phone);

        // אם לא מצאנו אפילו את שדה השם, מדלגים (אולי לא נפתח עדיין)
        if (!nameInput) continue;

        // בדיקה האם הסלוט הזה פנוי? (אם השם ריק)
        if (nameInput.value === "") {
            console.log(`נמצא סלוט פנוי: ${slot.name}`);
            
            // מילוי הנתונים
            if (nameInput) setNativeValue(nameInput, data.name);
            if (idInput) setNativeValue(idInput, data.idNumber);
            if (phoneInput) setNativeValue(phoneInput, data.phone);
            
            updateStatus(null, `הוזן ב-${slot.name}`, false, 3000);
            filledSlot = true;
            break; // סיימנו, יוצאים מהלולאה
        } else {
            console.log(`סלוט ${slot.name} כבר תפוס ע"י ${nameInput.value}, בודק את הבא...`);
        }
    }

    if (!filledSlot) {
        alert("לא נמצא מקום פנוי! כל שדות האורחים מלאים (או שלא זוהו).");
    }
}

// === פונקציות עזר ===

// פונקציה חדשה וקשוחה למציאת שדה לפי הטקסט המדויק של הלייבל (כמו בתמונה)
function findInputByExactLabel(labelText) {
    const inputs = document.querySelectorAll('input[type="text"]');
    for (let input of inputs) {
        const label = getLabelText(input);
        // מנקים רווחים כפולים ונקודותיים לבדיקה
        const cleanLabel = label.replace(/:/g, '').trim();
        const cleanTarget = labelText.replace(/:/g, '').trim();
        
        if (cleanLabel === cleanTarget) {
            return input;
        }
    }
    return null;
}

function setNativeValue(element, value) {
    if (!value) return;
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
}

function getTodayDate() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function fillById(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.value = value;
}

function isSelectPopulated(id) {
    const el = document.getElementById(id);
    return el && el.options && el.options.length > 1;
}

async function waitForOptionsToPopulate(ids, timeout) {
    const start = Date.now();
    const idList = Array.isArray(ids) ? ids : [ids];
    while (Date.now() - start < timeout) {
        const el = document.getElementById(idList[0]);
        if (el && el.options && el.options.length > 1) return true;
        await new Promise(r => setTimeout(r, 200));
    }
    return false;
}

async function setSelectByText(id, textToFind) {
    const select = document.getElementById(id);
    if (!select || !textToFind) return false;
    const searchStr = String(textToFind).trim().toUpperCase();
    for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        const optText = option.text.trim().toUpperCase();
        const optVal = option.value.trim().toUpperCase();
        if (optText === searchStr || optVal === searchStr || optText.includes(searchStr)) {
            if (select.value === option.value) return false;
            select.selectedIndex = i;
            triggerPostBack(select);
            return true;
        }
    }
    return false;
}

function triggerPostBack(element) {
    const event = new Event('change', { bubbles: true });
    element.dispatchEvent(event);
    if (element.style.display === 'none' && element.onchange) element.onchange();
}

function fillBySmartSearch(keywords, value) {
    if (!value) return false;
    const inputs = document.querySelectorAll('input[type="text"]');
    for (let input of inputs) {
        if (input.value === value) return true;
        if (input.id === 'FullName' || input.id === 'Phone') continue;
        let labelText = getLabelText(input);
        if (keywords.some(k => labelText.includes(k))) {
            setNativeValue(input, value);
            return true;
        }
    }
    return false;
}

function getLabelText(input) {
    let text = "";
    if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) text = label.innerText;
    }
    if (!text && input.previousElementSibling && 
       ['LABEL', 'SPAN', 'DIV', 'B'].includes(input.previousElementSibling.tagName)) {
        text = input.previousElementSibling.innerText;
    }
    if (!text && input.parentElement && input.parentElement.previousElementSibling &&
        ['LABEL', 'SPAN', 'DIV'].includes(input.parentElement.previousElementSibling.tagName)) {
         text = input.parentElement.previousElementSibling.innerText;
    }
    return text || "";
}

function showStatusMessage(text) {
    let d = document.getElementById('meonot-status-msg');
    if (!d) {
        d = document.createElement('div');
        d.id = 'meonot-status-msg';
        Object.assign(d.style, {
            position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)',
            padding: '10px 20px', background: '#222', color: '#fff', borderRadius: '4px',
            zIndex: 999999, fontSize: '14px', fontFamily: 'sans-serif', boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
        });
        document.body.appendChild(d);
    }
    d.textContent = text;
    d.style.display = 'block';
    return d;
}

function updateStatus(div, text, isError, time) {
    const d = div || document.getElementById('meonot-status-msg');
    if(!d) return;
    d.textContent = text;
    d.style.background = isError ? '#d32f2f' : '#222';
    if (time) setTimeout(() => d.style.display = 'none', time);
}