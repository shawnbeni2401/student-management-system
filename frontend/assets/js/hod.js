// Auth Guard
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user || user.role !== 'hod') {
    window.location.href = 'index.html';
}

document.getElementById('hodName').innerText = user.name;
document.getElementById('hodDept').innerText = user.department;

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
        'approvals': 'approvalsTab',
        'history': 'historyTab',
        'events': 'eventsTab',
        'create': 'createTab',
        'permApprovals': 'permApprovalsTab'
    };
    
    const targetId = tabMap[tab];
    if (targetId) {
        document.getElementById(targetId).classList.remove('hidden');
    }

    document.getElementById('tabTitle').innerText = 
        tab === 'explore' ? 'Campus Event Grid' :
        tab === 'approvals' ? 'Pending Event Approvals' : 
        tab === 'history' ? 'Approval History' : 
        tab === 'permApprovals' ? 'Permission Approvals' : 'Event Management';

    if (tab === 'explore') loadExploreEvents(token);
    if (tab === 'approvals' || tab === 'history') loadParticipations();
    if (tab === 'events') loadStaffEvents();
    if (tab === 'permApprovals') loadPermissions();
}

async function loadParticipations() {
    const response = await fetch('/api/participations', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const participations = await response.json();
    
    const pendingList = document.getElementById('pendingParticipationList');
    const historyList = document.getElementById('historyParticipationList');
    
    const pendingData = participations.filter(p => p.status === 'pending');
    const historyData = participations.filter(p => p.status !== 'pending');

    if (pendingList) {
        pendingList.innerHTML = pendingData.length === 0
            ? '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:1.5rem;">No pending approvals.</td></tr>'
            : pendingData.map(p => `
            <tr>
                <td>${p.student_name}</td>
                <td>${p.register_number}</td>
                <td>${p.event_title}</td>
                <td>${new Date(p.event_date).toLocaleDateString()}</td>
                <td>
                    <button class="btn-sm" style="background:rgba(99,102,241,0.15);color:#818cf8;border:1px solid #6366f1;" onclick="openEventDetails(${p.event_id})">
                        <i class="fas fa-info-circle"></i> View
                    </button>
                </td>
                <td>
                    <button class="btn-sm btn-approve" onclick="updateStatus(${p.id}, 'approved')">Approve</button>
                    <button class="btn-sm btn-reject" onclick="updateStatus(${p.id}, 'rejected')">Reject</button>
                </td>
            </tr>
        `).join('');
    }

    if (historyList) {
        historyList.innerHTML = historyData.length === 0
            ? '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:1.5rem;">No approval history yet.</td></tr>'
            : historyData.map(p => {
                const location = p.is_external
                    ? (p.college_name || 'External')
                    : (p.venue || 'On Campus');
                return `
                <tr>
                    <td>${p.student_name}</td>
                    <td>${p.event_title}</td>
                    <td>${new Date(p.event_date).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${p.status}">${p.status.toUpperCase()}</span></td>
                    <td>${location}</td>
                    <td>
                        <button class="btn-sm" style="background:rgba(99,102,241,0.15);color:#818cf8;border:1px solid #6366f1;" onclick="openEventDetails(${p.event_id})">
                            <i class="fas fa-info-circle"></i> View
                        </button>
                    </td>
                </tr>`;
            }).join('');
    }
}

async function updateStatus(id, status) {
    if (!confirm(`Confirm ${status} for this student?`)) return;

    const response = await fetch(`/api/participations/${id}/status`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
    });

    if (response.ok) {
        showToast('Participation record updated!');
        loadParticipations();
    }
}

// Event Management Logic for HOD
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
                <button class="btn-sm btn-approve" onclick="editEvent(${e.id})"><i class="fas fa-edit"></i></button>
            </td>
            <td>
                <button class="btn-sm btn-reject" onclick="deleteEvent(${e.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

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

async function deleteEvent(id) {
    if (!confirm('Permanent delete this event?')) return;
    try {
        const response = await fetch(`/api/events/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (response.ok) {
            showToast(result.message || 'Event deleted');
            loadStaffEvents();
        } else {
            showToast(result.message || 'Deletion failed', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Initial Load
loadExploreEvents(token);

// ─── Permission Management ───────────────────────────────────────────────────
async function loadPermissions() {
    const response = await fetch('/api/permissions', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const permissions = await response.json();
    
    const pendingList = document.getElementById('pendingPermissionList');
    const historyList = document.getElementById('historyPermissionList');
    
    if (!pendingList || !historyList) return;

    const pendingData = permissions.filter(p => p.status === 'pending');
    const historyData = permissions.filter(p => p.status !== 'pending');

    pendingList.innerHTML = pendingData.length === 0
        ? '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:1.5rem;">No pending permissions.</td></tr>'
        : pendingData.map(p => {
        const dateStr = p.permission_type === 'leave' && p.to_date && p.to_date !== p.date 
            ? `${new Date(p.date).toLocaleDateString()}<br><small>to</small><br>${new Date(p.to_date).toLocaleDateString()}` 
            : new Date(p.date).toLocaleDateString();

        return `
        <tr>
            <td>${p.student_name}</td>
            <td>${p.register_number}</td>
            <td><strong>${p.reason}</strong> <span style="font-size:0.75rem; background:rgba(255,255,255,0.1); padding:0.2rem 0.5rem; border-radius:1rem; margin-left:0.5rem; color:#cbd5e1;">${p.permission_type === 'leave' ? '🎓 Leave' : '🚪 Outgoing'}</span></td>
            <td style="max-width: 200px; white-space: normal;">${p.description || '-'}</td>
            <td>${dateStr}<br><small>${p.permission_type === 'leave' ? 'Full Day Leave' : `${p.out_time || '-'} to ${p.in_time || '-'}`}</small></td>
            <td>
                <button class="btn-sm btn-approve" onclick="updatePermStatus(${p.id}, 'approved')">Approve</button>
                <button class="btn-sm btn-reject" onclick="updatePermStatus(${p.id}, 'rejected')">Reject</button>
            </td>
        </tr>
        `;
    }).join('');

    historyList.innerHTML = historyData.length === 0
        ? '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:1.5rem;">No history found.</td></tr>'
        : historyData.map(p => {
        const dateStr = p.permission_type === 'leave' && p.to_date && p.to_date !== p.date 
            ? `${new Date(p.date).toLocaleDateString()} to ${new Date(p.to_date).toLocaleDateString()}` 
            : new Date(p.date).toLocaleDateString();
        
        return `
        <tr>
            <td>${p.student_name}</td>
            <td>${p.reason} <span style="font-size:0.75rem; color:#64748b; margin-left:0.5rem;">[${p.permission_type === 'leave' ? 'Leave' : 'Out-pass'}]</span></td>
            <td>${dateStr}</td>
            <td><span class="status-badge status-${p.status}">${p.status.toUpperCase()}</span></td>
            <td>
                ${p.status === 'approved' && p.permission_letter_path
                    ? `<a href="/uploads/${p.permission_letter_path}" target="_blank" class="download-link" style="color:#6366f1;text-decoration:none;">
                           <i class="fas fa-file-pdf"></i> Download Letter
                       </a>`
                    : `<span style="color:#64748b;font-size:0.85rem;">${p.status === 'approved' ? 'Generating...' : '-'}</span>`}
            </td>
        </tr>
        `;
    }).join('');
}

async function updatePermStatus(id, status) {
    if (!confirm(`Confirm ${status} for this permission request?`)) return;

    const response = await fetch(`/api/permissions/${id}/status`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
    });

    if (response.ok) {
        showToast('Permission status updated!');
        loadPermissions();
    } else {
        showToast('Failed to update status', 'error');
    }
}
