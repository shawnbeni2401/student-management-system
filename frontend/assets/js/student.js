// Auth Guard
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user || user.role !== 'student') {
    window.location.href = 'index.html';
}

document.getElementById('stuName').innerText = user.name;
document.getElementById('stuReg').innerText = user.register_number || user.department || 'Student';

// Track which events the student has already applied to: { eventId: status }
let appliedEventMap = {};

// ─── Tab Switching ────────────────────────────────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event?.currentTarget?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

    // HTML uses 'my-eventsTab' as the ID
    const tabId = tab === 'myEvents' ? 'my-eventsTab' : tab + 'Tab';
    const el = document.getElementById(tabId);
    if (el) el.classList.remove('hidden');

    const titles = { explore: 'Explore Events', myEvents: 'My Applications', permissions: 'Out-going Permissions' };
    document.getElementById('tabTitle').innerText = titles[tab] || tab;

    if (tab === 'explore') loadStudentExplore();
    if (tab === 'myEvents') loadMyParticipations();
    if (tab === 'permissions') loadMyPermissions();
}

// ─── Explore with "Applied" state ────────────────────────────────────────────
async function loadStudentExplore() {
    const grid = document.getElementById('allEventsGrid');
    if (!grid) return;

    try {
        // Fetch events & applied IDs in parallel
        const [eventsRes, appliedRes] = await Promise.all([
            fetch('/api/events', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/participations/my-events', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const events  = await eventsRes.json();
        const applied = await appliedRes.json();

        // Build lookup map: { eventId: status }
        appliedEventMap = {};
        applied.forEach(a => { appliedEventMap[a.event_id] = a.status; });

        injectDetailsModal();

        if (events.length === 0) {
            grid.innerHTML = '<p style="color:#94a3b8;padding:2rem;">No events available.</p>';
            return;
        }

        const today = new Date();
        today.setHours(0,0,0,0);

        const ongoing = events.filter(e => {
            const d = new Date(e.event_date);
            d.setHours(0,0,0,0);
            return d.getTime() === today.getTime();
        });

        const upcoming = events.filter(e => {
            const d = new Date(e.event_date);
            d.setHours(0,0,0,0);
            return d.getTime() > today.getTime();
        });

        const renderStudentCards = (evs) => evs.map(e => {
            const appStatus = appliedEventMap[e.id];
            let actionBtn;

            if (appStatus === 'approved') {
                actionBtn = `<button class="apply-btn" style="background:#10b981;cursor:default;" disabled><i class="fas fa-check-circle"></i> Approved</button>`;
            } else if (appStatus === 'rejected') {
                actionBtn = `<button class="apply-btn" style="background:#ef4444;cursor:default;" disabled><i class="fas fa-times-circle"></i> Rejected</button>`;
            } else if (appStatus === 'pending') {
                actionBtn = `<button class="apply-btn" style="background:#f59e0b;cursor:default;" disabled><i class="fas fa-clock"></i> Applied – Pending</button>`;
            } else {
                actionBtn = `<button class="apply-btn" onclick="applyForEvent(${e.id}, this)"><i class="fas fa-paper-plane"></i> Apply to Participate</button>`;
            }

            return `
                <div class="event-card-item">
                    <div class="event-poster">
                        ${e.poster_path
                            ? `<img src="/uploads/${e.poster_path}" alt="Poster">`
                            : `<div class="poster-placeholder"><i class="fas fa-image"></i></div>`}
                    </div>
                    <div class="event-details">
                        <div class="dept-label">${e.department}</div>
                        <h3>${e.title}</h3>
                        <p class="event-date"><i class="fas fa-calendar"></i> ${new Date(e.event_date).toLocaleDateString()}</p>
                        ${e.is_external
                            ? `<p class="event-loc"><i class="fas fa-map-marker-alt"></i> <a href="${e.google_maps_url || '#'}" target="_blank">${e.college_name || 'External'}</a></p>`
                            : `<p class="event-loc"><i class="fas fa-university"></i> ${e.venue || 'On Campus'}</p>`}
                        <button class="btn-detail" onclick="openEventDetails(${e.id})"><i class="fas fa-info-circle"></i> View Details</button>
                        ${actionBtn}
                    </div>
                </div>`;
        }).join('');

        let html = '';
        if (ongoing.length > 0) {
            html += `<h2 style="font-size: 1.25rem; font-weight: 700; margin: 1.5rem 0 0.5rem 0; color: white;">Ongoing Events</h2>
                     <div class="events-grid">${renderStudentCards(ongoing)}</div>`;
        }
        if (upcoming.length > 0) {
            html += `<h2 style="font-size: 1.25rem; font-weight: 700; margin: 1.5rem 0 0.5rem 0; color: white;">Upcoming Events</h2>
                     <div class="events-grid">${renderStudentCards(upcoming)}</div>`;
        }

        if (html === '') {
            html = '<p style="color:#94a3b8;padding:2rem;">No upcoming or ongoing events.</p>';
        }

        grid.innerHTML = html;

    } catch (err) {
        grid.innerHTML = `<p style="color:#f87171;padding:2rem;">Failed to load events.</p>`;
    }
}

// ─── Apply for Event ─────────────────────────────────────────────────────────
async function applyForEvent(eventId, btn) {
    if (!confirm('Are you sure you want to apply for this event?')) return;

    // Optimistically disable the button
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    }

    try {
        const response = await fetch('/api/participations/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ event_id: eventId })
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Application sent! Check "My Applications" tab.');
            // Update button immediately without full reload
            if (btn) {
                btn.style.background = '#f59e0b';
                btn.style.cursor = 'default';
                btn.innerHTML = '<i class="fas fa-clock"></i> Applied – Pending';
                btn.onclick = null;
                btn.disabled = true;
            }
            appliedEventMap[eventId] = 'pending';
            // Pre-load My Applications in background
            loadMyParticipations();
        } else {
            showToast(data.message || 'Application failed', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Apply to Participate';
            }
        }
    } catch (err) {
        showToast('Network error', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Apply to Participate';
        }
    }
}

// ─── My Applications ─────────────────────────────────────────────────────────
async function loadMyParticipations() {
    const list = document.getElementById('myParticipationList');
    if (!list) return;

    try {
        const res = await fetch('/api/participations', { headers: { 'Authorization': `Bearer ${token}` } });
        const participations = await res.json();

        if (participations.length === 0) {
            list.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:2rem;">No applications yet.</td></tr>';
            return;
        }

        list.innerHTML = participations.map(p => `
            <tr>
                <td>${p.event_title}</td>
                <td>${new Date(p.event_date).toLocaleDateString()}</td>
                <td><span class="status-badge status-${p.status}">${p.status.toUpperCase()}</span></td>
                <td>
                    ${p.status === 'approved' && p.od_letter_path
                        ? `<a href="/uploads/${p.od_letter_path}" target="_blank" class="download-link" style="color:#6366f1;text-decoration:none;">
                               <i class="fas fa-file-pdf"></i> Download OD Letter
                           </a>`
                        : `<span style="color:#64748b;font-size:0.85rem;">${p.status === 'approved' ? 'Generating...' : 'Pending approval'}</span>`}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        list.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#f87171;">Failed to load applications.</td></tr>';
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Initial Load
loadStudentExplore();

// ─── Out-going Permissions ───────────────────────────────────────────────────
document.getElementById('permissionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('permSubmitBtn');
    btn.disabled = true;
    btn.innerText = 'Submitting...';

    const payload = {
        permission_type: document.getElementById('permType').value,
        reason: document.getElementById('permReason').value,
        date: document.getElementById('permDate').value,
        to_date: document.getElementById('permToDate') ? document.getElementById('permToDate').value : '',
        out_time: document.getElementById('permOutTime').value,
        in_time: document.getElementById('permInTime').value,
        description: document.getElementById('permDescription').value
    };

    try {
        const response = await fetch('/api/permissions/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Permission requested successfully!');
            document.getElementById('permissionForm').reset();
            loadMyPermissions();
        } else {
            showToast(data.message || 'Request failed', 'error');
        }
    } catch (err) {
        showToast('Network error', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Submit Request';
    }
});

async function loadMyPermissions() {
    const list = document.getElementById('myPermissionList');
    if (!list) return;

    try {
        const res = await fetch('/api/permissions/mine', { headers: { 'Authorization': `Bearer ${token}` } });
        const permissions = await res.json();

        if (permissions.length === 0) {
            list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:2rem;">No permissions requested yet.</td></tr>';
            return;
        }

        list.innerHTML = permissions.map(p => {
            let dateStr = new Date(p.date).toLocaleDateString();
            if (p.permission_type === 'leave' && p.to_date && p.to_date !== p.date) {
                dateStr += ` <br><small>to</small><br> ${new Date(p.to_date).toLocaleDateString()}`;
            }

            return `
            <tr>
                <td><strong>${p.reason}</strong> <span style="font-size:0.75rem; background:rgba(255,255,255,0.1); padding:0.2rem 0.5rem; border-radius:1rem; margin-left:0.5rem; color:#cbd5e1;">${p.permission_type === 'leave' ? '🎓 Leave' : '🚪 Outgoing'}</span></td>
                <td>${dateStr}</td>
                <td>${p.permission_type === 'leave' ? 'Full Day(s)' : `${p.out_time || '-'} to ${p.in_time || '-'}`}</td>
                <td><span class="status-badge status-${p.status}">${p.status.toUpperCase()}</span></td>
                <td>
                    ${p.status === 'approved' && p.permission_letter_path
                        ? `<a href="/uploads/${p.permission_letter_path}" target="_blank" class="download-link" style="color:#6366f1;text-decoration:none;">
                               <i class="fas fa-file-pdf"></i> Download Letter
                           </a>`
                        : `<span style="color:#64748b;font-size:0.85rem;">${p.status === 'approved' ? 'Generating...' : 'Pending approval'}</span>`}
                </td>
            </tr>
            `;
        }).join('');
    } catch (err) {
        list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#f87171;">Failed to load permissions.</td></tr>';
    }
}
