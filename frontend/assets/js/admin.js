// Auth Guard
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user || user.role !== 'admin') {
    window.location.href = 'index.html';
}

document.getElementById('adminName').innerText = user.name;

// Tab Switching
function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // Find matching link
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('onclick')?.includes(`'${tab}'`)) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    
    const tabMap = {
        'explore': 'exploreTab',
        'overview': 'overviewTab',
        'verification': 'verificationTab',
        'users': 'usersTab',
        'events': 'eventsTab',
        'createEvent': 'createEventTab'
    };
    
    const targetId = tabMap[tab];
    if (targetId) {
        document.getElementById(targetId).classList.remove('hidden');
    }
    
    const titles = {
        'explore': 'College Event Gallery',
        'overview': 'Dashboard Overview',
        'verification': 'User Verification',
        'users': 'All Registered Users',
        'events': 'Manage Global Events',
        'createEvent': 'Event Management Portal'
    };
    document.getElementById('tabTitle').innerText = titles[tab] || 'Dashboard';

    if (tab === 'explore') loadExploreEvents(token);
    if (tab === 'overview') loadStats();
    if (tab === 'verification') loadPendingUsers();
    if (tab === 'users') loadAllUsers();
    if (tab === 'events') loadEvents();
}

async function loadStats() {
    const response = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const stats = await response.json();
    document.getElementById('statPending').innerText = stats.pendingUsers;
    document.getElementById('statStudents').innerText = stats.totalStudents;
    document.getElementById('statEvents').innerText = stats.totalEvents;
}

async function loadPendingUsers() {
    const response = await fetch('/api/auth/users?status=pending', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await response.json();
    const list = document.getElementById('pendingList');
    if (!list) return;
    list.innerHTML = users.map(u => `
        <tr>
            <td>${u.name}</td>
            <td>${getRoleBadge(u.role)}</td>
            <td>${u.department || '-'}</td>
            <td>${u.email}</td>
            <td>
                <button class="btn-sm btn-approve" onclick="verifyUser(${u.id}, 'verified')">Approve</button>
                <button class="btn-sm btn-reject" onclick="verifyUser(${u.id}, 'rejected')">Reject</button>
            </td>
        </tr>
    `).join('');
}

async function loadAllUsers() {
    const response = await fetch('/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await response.json();
    const list = document.getElementById('userList');
    if (!list) return;
    list.innerHTML = users.map(u => `
        <tr>
            <td>${u.name}</td>
            <td>${getRoleBadge(u.role)}</td>
            <td>${u.department || '-'}</td>
            <td><span class="status-badge status-${u.status}">${u.status}</span></td>
            <td>
                <button class="btn-sm btn-reject" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

async function loadEvents() {
    const response = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const events = await response.json();
    const list = document.getElementById('eventList');
    if (!list) return;
    list.innerHTML = events.map(e => `
        <tr>
            <td>${e.title}</td>
            <td>${new Date(e.event_date).toLocaleDateString()}</td>
            <td>${e.department}</td>
            <td>${e.creator_name || 'System'}</td>
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

// Event Management Logic
async function editEvent(id) {
    const response = await fetch(`/api/events/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const eventData = await response.json();

    document.getElementById('editEventId').value = String(id); // Force string for DOM consistency
    document.getElementById('eventTitle').value = eventData.title;
    document.getElementById('eventDate').value = eventData.event_date.split('T')[0];
    document.getElementById('eventDesc').value = eventData.description;
    document.getElementById('isExternal').value = eventData.is_external ? '1' : '0';
    document.getElementById('eventDept').value = eventData.department;
    document.getElementById('venue').value = eventData.venue || '';
    
    toggleExternalFields();
    if (eventData.is_external) {
        document.getElementById('collegeName').value = eventData.college_name || '';
        document.getElementById('mapsUrl').value = eventData.google_maps_url || '';
    }

    document.getElementById('formTitle').innerText = 'Edit Event Details';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'block';
    
    switchTab('createEvent');
}

function cancelEdit() {
    document.getElementById('createEventForm').reset();
    document.getElementById('editEventId').value = '';
    document.getElementById('formTitle').innerText = 'Create New Event';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    switchTab('events');
}

function toggleExternalFields() {
    const isEx = document.getElementById('isExternal').value === '1';
    document.getElementById('collegeGroup').style.display = isEx ? 'block' : 'none';
    document.getElementById('mapsGroup').style.display = isEx ? 'block' : 'none';
    document.getElementById('internalVenueGroup').style.display = isEx ? 'none' : 'block';
}

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
    formData.append('department', document.getElementById('eventDept').value);
    formData.append('venue', document.getElementById('venue').value);
    
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
            showToast(result.message || 'Operation failed', 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
    } finally {
        createBtn.innerText = 'Save Event';
        createBtn.disabled = false;
    }
});

async function verifyUser(userId, status) {
    const response = await fetch('/api/auth/verify-user', {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ userId, status })
    });

    if (response.ok) {
        showToast('User status updated');
        loadPendingUsers();
        loadStats();
    }
}

async function deleteUser(userId) {
    if (!confirm('Permanently delete this user?')) return;
    const response = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
        showToast('User deleted');
        loadAllUsers();
        loadStats();
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Delete this event?')) return;
    const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    if (response.ok) {
        showToast(result.message || 'Event deleted');
        loadEvents();
        loadStats();
    } else {
        showToast(result.message || 'Deletion failed', 'error');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Initial Load
loadStats();
loadExploreEvents(token);
