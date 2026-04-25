// Auth Guard
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user || (user.role !== 'staff' && user.role !== 'admin' && user.role !== 'hod')) {
    window.location.href = 'index.html';
}

document.getElementById('staffName').innerText = user.name;

// Tab Switching
function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('onclick')?.includes(`'${tab}'`)) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    
    const tabMap = {
        'explore': 'exploreTab',
        'events': 'eventsTab',
        'create': 'createTab'
    };
    
    const targetId = tabMap[tab];
    if (targetId) {
        document.getElementById(targetId).classList.remove('hidden');
    }

    document.getElementById('tabTitle').innerText = (tab === 'explore') ? 'Explore All Events' : 
                                                    (tab === 'events') ? 'Manage My Events' : 'Event Form';

    if (tab === 'explore') loadExploreEvents(token);
    if (tab === 'events') loadStaffEvents();
}

function toggleExternalFields() {
    const isEx = document.getElementById('isExternal').value === '1';
    document.getElementById('collegeGroup').style.display = isEx ? 'block' : 'none';
    document.getElementById('mapsGroup').style.display = isEx ? 'block' : 'none';
    document.getElementById('internalVenueGroup').style.display = isEx ? 'none' : 'block';
}

// Load Events (Table view for management)
async function loadStaffEvents() {
    const response = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const allEvents = await response.json();
    
    const list = document.getElementById('staffEventList');
    if (!list) return;
    list.innerHTML = allEvents.map(e => `
        <tr>
            <td>${e.title}</td>
            <td>${new Date(e.event_date).toLocaleDateString()}</td>
            <td><span class="status-badge">${e.is_external ? 'External' : 'Internal'}</span></td>
            <td>
                <button class="btn-sm btn-approve" onclick="viewParticipants(${e.id})" style="background: #3b82f6;"><i class="fas fa-users"></i> View</button>
            </td>
            <td>
                <button class="btn-sm btn-approve" onclick="editEvent(${e.id})"><i class="fas fa-edit"></i></button>
            </td>
            <td>
                <button class="btn-sm btn-reject" onclick="deleteEvent(${e.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Edit Mode
async function editEvent(id) {
    const response = await fetch(`/api/events/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const eventData = await response.json();

    document.getElementById('editEventId').value = String(id);
    document.getElementById('eventTitle').value = eventData.title;
    document.getElementById('eventDate').value = eventData.event_date.split('T')[0];
    document.getElementById('eventDesc').value = eventData.description;
    document.getElementById('isExternal').value = eventData.is_external ? '1' : '0';
    document.getElementById('venue').value = eventData.venue || '';
    
    toggleExternalFields();
    if (eventData.is_external) {
        document.getElementById('collegeName').value = eventData.college_name || '';
        document.getElementById('mapsUrl').value = eventData.google_maps_url || '';
    }

    document.getElementById('formTitle').innerText = 'Edit Event Details';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'block';
    
    switchTab('create');
}

function cancelEdit() {
    document.getElementById('createEventForm').reset();
    document.getElementById('editEventId').value = '';
    document.getElementById('formTitle').innerText = 'Create New Event';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    switchTab('events');
}

async function deleteEvent(id) {
    if (!confirm('Permanent delete this event?')) return;
    try {
        const response = await fetch(`/api/events/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (response.ok) {
            showToast(result.message || 'Event deleted successfully');
            loadStaffEvents();
        } else {
            showToast(result.message || 'Deletion failed', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

// Save Event (Create or Update)
document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editEventId').value;
    const createBtn = document.getElementById('createBtn');
    createBtn.innerText = 'Saving...';
    createBtn.disabled = true;

    const formData = new FormData();
    formData.append('title', document.getElementById('eventTitle').value);
    formData.append('event_date', document.getElementById('eventDate').value);
    formData.append('description', document.getElementById('eventDesc').value);
    formData.append('is_external', document.getElementById('isExternal').value);
    formData.append('venue', document.getElementById('venue').value);
    formData.append('department', user.department);
    
    if (document.getElementById('isExternal').value === '1') {
        formData.append('college_name', document.getElementById('collegeName').value);
        formData.append('google_maps_url', document.getElementById('mapsUrl').value);
    }

    const posterFile = document.getElementById('eventPoster').files[0];
    if (posterFile) {
        formData.append('poster', posterFile);
    }

    try {
        const url = editId ? `/api/events/${editId}` : '/api/events';
        const method = editId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.message || 'Saved successfully');
            cancelEdit();
        } else {
            showToast(result.message || 'Action failed', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    } finally {
        createBtn.innerText = 'Save Event';
        createBtn.disabled = false;
    }
});

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Initial Load
loadExploreEvents(token);
