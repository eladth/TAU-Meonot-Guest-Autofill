document.addEventListener('DOMContentLoaded', () => {
  let editingGuestId = null;

  // Host Elements
  const hostFields = {
    name: document.getElementById('hostName'),
    id: document.getElementById('hostId'),
    phone: document.getElementById('hostPhone'),
    dorms: document.getElementById('hostDorms'),
    building: document.getElementById('hostBuilding'),
    floor: document.getElementById('hostFloor'),
    apt: document.getElementById('hostApt'),
    side: document.getElementById('hostSide')
  };
  const saveHostBtn = document.getElementById('saveHostBtn');
  const fillHostBtn = document.getElementById('fillHostBtn');

  // Guest Elements
  const guestName = document.getElementById('guestName');
  const guestId = document.getElementById('guestId');
  const guestPhone = document.getElementById('guestPhone');
  const addGuestBtn = document.getElementById('addGuestBtn');
  const guestList = document.getElementById('guestList');

  // === 1. LOAD DATA ===
  loadHostDetails();
  loadGuests();

  // === 2. HOST LOGIC ===
  if (saveHostBtn) {
    saveHostBtn.addEventListener('click', () => {
      const hostData = {
        name: hostFields.name.value,
        id: hostFields.id.value,
        phone: hostFields.phone.value,
        dorms: hostFields.dorms.value,
        building: hostFields.building.value,
        floor: hostFields.floor.value,
        apt: hostFields.apt.value,
        side: hostFields.side.value
      };
      chrome.storage.local.set({ hostData }, () => {
        const originalText = saveHostBtn.textContent;
        saveHostBtn.textContent = 'נשמר!';
        setTimeout(() => saveHostBtn.textContent = originalText, 1500);
      });
    });
  }

  if (fillHostBtn) {
    fillHostBtn.addEventListener('click', () => {
      chrome.storage.local.get(['hostData'], (result) => {
        if (result.hostData) {
          sendMessageToContent("FILL_HOST", result.hostData);
        } else {
          alert('לא נשמרו פרטים למילוי. אנא מלא ושמור קודם.');
        }
      });
    });
  }

  function loadHostDetails() {
    chrome.storage.local.get(['hostData'], (result) => {
      if (result.hostData) {
        hostFields.name.value = result.hostData.name || '';
        hostFields.id.value = result.hostData.id || '';
        hostFields.phone.value = result.hostData.phone || '';
        hostFields.dorms.value = result.hostData.dorms || '';
        hostFields.building.value = result.hostData.building || '';
        hostFields.floor.value = result.hostData.floor || '';
        hostFields.apt.value = result.hostData.apt || '';
        hostFields.side.value = result.hostData.side || '';
      }
    });
  }

  // === 3. GUEST LOGIC ===
  if (addGuestBtn) {
    addGuestBtn.addEventListener('click', () => {
      const guest = {
        id: editingGuestId || Date.now().toString(),
        name: guestName.value.trim(),
        idNumber: guestId.value.trim(),
        phone: guestPhone.value.trim()
      };

      if (!guest.name) {
        alert('נא להזין שם לפחות.');
        return;
      }

      chrome.storage.local.get(['guests'], (result) => {
        let guests = result.guests || [];
        
        if (editingGuestId) {
            const index = guests.findIndex(g => g.id === editingGuestId);
            if (index !== -1) guests[index] = guest;
        } else {
            guests.push(guest);
        }

        chrome.storage.local.set({ guests }, () => {
          loadGuests();
          clearGuestInputs();
        });
      });
    });
  }

  function loadGuests() {
    chrome.storage.local.get(['guests'], (result) => {
      renderGuestList(result.guests || []);
    });
  }

  function renderGuestList(guests) {
    guestList.innerHTML = '';
    guests.forEach(guest => {
      const li = document.createElement('li');
      
      const span = document.createElement('span');
      span.textContent = guest.name;
      
      const actions = document.createElement('div');
      actions.className = 'guest-actions';

      const fillBtn = document.createElement('button');
      fillBtn.textContent = 'מלא';
      fillBtn.className = 'action-btn fill-btn';
      fillBtn.onclick = () => sendMessageToContent("FILL_GUEST", guest);

      const editBtn = document.createElement('button');
      editBtn.textContent = '✎';
      editBtn.className = 'action-btn edit-btn';
      editBtn.onclick = () => startEditing(guest);

      const delBtn = document.createElement('button');
      delBtn.textContent = 'X';
      delBtn.className = 'action-btn del-btn';
      delBtn.onclick = () => deleteGuest(guest.id);

      actions.append(fillBtn, editBtn, delBtn);
      li.append(span, actions);
      guestList.append(li);
    });
  }

  function startEditing(guest) {
      guestName.value = guest.name;
      guestId.value = guest.idNumber;
      guestPhone.value = guest.phone;
      editingGuestId = guest.id;
      
      addGuestBtn.textContent = '✓';
      addGuestBtn.style.backgroundColor = '#ffc107';
      addGuestBtn.style.color = '#333';
      guestName.focus();
  }

  function deleteGuest(id) {
    if (editingGuestId === id) clearGuestInputs();
    chrome.storage.local.get(['guests'], (result) => {
      const newGuests = (result.guests || []).filter(g => g.id !== id);
      chrome.storage.local.set({ guests: newGuests }, loadGuests);
    });
  }

  function clearGuestInputs() {
    guestName.value = '';
    guestId.value = '';
    guestPhone.value = '';
    editingGuestId = null;
    
    addGuestBtn.textContent = '+';
    addGuestBtn.style.backgroundColor = '';
    addGuestBtn.style.color = '';
  }

  function sendMessageToContent(action, data) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action, data });
      }
    });
  }
});