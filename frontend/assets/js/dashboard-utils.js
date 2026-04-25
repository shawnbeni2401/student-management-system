// ─── Utility: Table Filter ───────────────────────────────────────────────────
function filterTable(tbodyId, query) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const q = query.toLowerCase();
    for (const row of tbody.getElementsByTagName('tr')) {
        row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
    }
}

// ─── Utility: Role Badge ─────────────────────────────────────────────────────
function getRoleBadge(role) {
    const map = { admin: 'status-verified', hod: 'status-pending', staff: 'status-verified', student: 'status-rejected' };
    return `<span class="status-badge ${map[role] || ''}">${role.toUpperCase()}</span>`;
}

// ─── Card Styles (injected once) ─────────────────────────────────────────────
(function injectCardStyles() {
    if (document.getElementById('shared-card-styles')) return;
    const style = document.createElement('style');
    style.id = 'shared-card-styles';
    style.textContent = [
        '.events-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; padding: 1rem; }',
        '.event-card-item { padding: 0; overflow: hidden; transition: transform 0.3s; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; display: flex; flex-direction: column; }',
        '.event-card-item:hover { transform: translateY(-5px); }',
        '.event-poster { height: 160px; background: #1e293b; overflow: hidden; }',
        '.event-poster img { width: 100%; height: 100%; object-fit: cover; }',
        '.poster-placeholder { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: #334155; }',
        '.event-details { padding: 1.25rem; position: relative; flex: 1; display: flex; flex-direction: column; }',
        '.dept-label { position: absolute; top: -12px; right: 15px; background: #6366f1; color: white; padding: 2px 10px; border-radius: 10px; font-size: 0.65rem; font-weight: bold; }',
        '.event-details h3 { margin-bottom: 0.5rem; font-size: 1.1rem; }',
        '.event-date, .event-loc { font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.4rem; }',
        '.event-loc a { color: #6366f1; text-decoration: none; }',
        '.btn-detail { width: 100%; margin-top: 0.5rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: #94a3b8; padding: 0.5rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.82rem; transition: all 0.2s; }',
        '.btn-detail:hover { background: rgba(99,102,241,0.2); color: #818cf8; border-color: #6366f1; }',
        '.apply-btn { width: 100%; margin-top: 0.5rem; background: #6366f1; border: none; padding: 0.7rem; color: white; border-radius: 0.5rem; cursor: pointer; font-weight: 600; }'
    ].join('\n');
    document.head.appendChild(style);
})();

// ─── Universal Event Card Renderer ───────────────────────────────────────────
async function loadExploreEvents(token) {
    const grid = document.getElementById('allEventsGrid');
    if (!grid) return; // page doesn't have the explore tab – bail silently

    try {
        const res = await fetch('/api/events', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const events = await res.json();

        injectDetailsModal();

        const currentRole = (() => { try { return JSON.parse(localStorage.getItem('user'))?.role; } catch { return null; } })();

        if (events.length === 0) {
            grid.innerHTML = '<p style="color:#94a3b8;padding:2rem;">No events found.</p>';
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

        const renderCards = (evs) => evs.map(e => `
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
                        ${currentRole === 'student'
                            ? `<button class="apply-btn" onclick="applyForEvent(${e.id})">Apply to Participate</button>`
                            : ''}
                    </div>
                </div>`).join('');

        let html = '';
        if (ongoing.length > 0) {
            html += `<h2 style="font-size: 1.25rem; font-weight: 700; margin: 1.5rem 0 0.5rem 0; color: white;">Ongoing Events</h2>
                     <div class="events-grid">${renderCards(ongoing)}</div>`;
        }
        if (upcoming.length > 0) {
            html += `<h2 style="font-size: 1.25rem; font-weight: 700; margin: 1.5rem 0 0.5rem 0; color: white;">Upcoming Events</h2>
                     <div class="events-grid">${renderCards(upcoming)}</div>`;
        }

        if (html === '') {
            html = '<p style="color:#94a3b8;padding:2rem;">No upcoming or ongoing events.</p>';
        }

        grid.innerHTML = html;
    } catch (err) {
        grid.innerHTML = `<p style="color:#f87171;padding:2rem;">Failed to load events: ${err.message}</p>`;
    }
}

// ─── Details Modal ───────────────────────────────────────────────────────────
function injectDetailsModal() {
    if (document.getElementById('eventDetailsModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
        <div id="eventDetailsModal" class="modal-overlay" onclick="closeEventDetails(event)">
            <div class="event-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <img id="modalPoster" src="" alt="Event Poster" style="display:none;">
                    <div class="modal-placeholder-header" id="modalPlaceholderHeader" style="height:100%;display:flex;align-items:center;justify-content:center;font-size:4rem;color:#334155;"><i class="fas fa-image"></i></div>
                    <div class="modal-close" onclick="closeEventDetails()"><i class="fas fa-times"></i></div>
                </div>
                <div class="modal-body">
                    <h2 id="modalTitle">Loading...</h2>
                    <div class="modal-meta">
                        <div class="meta-item"><i class="fas fa-calendar"></i> <span id="modalDate">-</span></div>
                        <div class="meta-item"><i class="fas fa-map-marker-alt"></i> <span id="modalLoc">-</span></div>
                        <div class="meta-item"><i class="fas fa-building"></i> <span id="modalDept">-</span></div>
                    </div>
                    <div class="modal-desc" id="modalDesc"></div>
                </div>
            </div>
        </div>`);
}

async function openEventDetails(id) {
    const token = localStorage.getItem('token');
    const modal = document.getElementById('eventDetailsModal');
    if (!modal) { injectDetailsModal(); }

    // Show modal in loading state first
    document.getElementById('modalTitle').innerText = 'Loading...';
    document.getElementById('modalDesc').innerText  = '';
    document.getElementById('modalPoster').style.display = 'none';
    document.getElementById('modalPlaceholderHeader').style.display = 'flex';
    document.getElementById('eventDetailsModal').classList.add('active');

    try {
        const res = await fetch(`/api/events/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const e = await res.json();

        document.getElementById('modalTitle').innerText = e.title;
        document.getElementById('modalDate').innerText  = new Date(e.event_date).toLocaleDateString();
        document.getElementById('modalDept').innerText  = e.department;
        document.getElementById('modalLoc').innerText   = e.is_external ? (e.college_name || 'External') : (e.venue || 'On Campus');
        document.getElementById('modalDesc').innerText  = e.description || 'No description provided for this event.';

        const posterImg = document.getElementById('modalPoster');
        if (e.poster_path) {
            posterImg.src = `/uploads/${e.poster_path}`;
            posterImg.style.display = 'block';
            document.getElementById('modalPlaceholderHeader').style.display = 'none';
        }
    } catch (err) {
        document.getElementById('modalTitle').innerText = 'Failed to load event details';
    }
}



function closeEventDetails(e) {
    if (e && e.target !== document.getElementById('eventDetailsModal') && !e.target.closest('.modal-close')) return;
    const modal = document.getElementById('eventDetailsModal');
    if (modal) modal.classList.remove('active');
}

// ─── Participants Modal ────────────────────────────────────────────────────────
function injectParticipantsModal() {
    if (document.getElementById('participantsModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
        <div id="participantsModal" class="modal-overlay" onclick="closeParticipantsModal(event)">
            <div class="event-modal" onclick="event.stopPropagation()" style="max-width: 700px; padding: 0;">
                <div class="modal-header" style="height: auto; padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
                    <h2 style="font-size: 1.5rem; margin:0; color:#f8fafc;" id="partModalTitle">Event Participants</h2>
                    <div style="cursor: pointer; font-size: 1.2rem; color: #94a3b8;" onclick="closeParticipantsModal()"><i class="fas fa-times"></i></div>
                </div>
                <div class="modal-body" style="padding: 1.5rem; max-height: 60vh; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid rgba(255,255,255,0.1); text-align: left; color:#cbd5e1;">
                                <th style="padding: 0.75rem;">Name</th>
                                <th style="padding: 0.75rem;">Register No</th>
                                <th style="padding: 0.75rem;">Dept</th>
                                <th style="padding: 0.75rem;">Status</th>
                            </tr>
                        </thead>
                        <tbody id="participantsListTable">
                            <!-- Dynamic Content -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `);
}

async function viewParticipants(eventId) {
    injectParticipantsModal();
    const tableBody = document.getElementById('participantsListTable');
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:#94a3b8;">Loading...</td></tr>';
    
    // Add 'active' class to fade it in matching our modal CSS rules
    document.getElementById('participantsModal').classList.add('active');

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/participations?event_id=${eventId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:#94a3b8;">No students have applied for this event yet.</td></tr>';
            return;
        }

        tableBody.innerHTML = data.map(p => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color:#f8fafc;">
                <td style="padding: 1rem 0.75rem;">${p.student_name}</td>
                <td style="padding: 1rem 0.75rem;">${p.register_number || '-'}</td>
                <td style="padding: 1rem 0.75rem;">${p.department}</td>
                <td style="padding: 1rem 0.75rem;"><span class="status-badge status-${p.status}">${p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
            </tr>
        `).join('');

    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem; color:#ef4444;">Error loading participants</td></tr>`;
    }
}

function closeParticipantsModal(e) {
    if (e && e.target !== document.getElementById('participantsModal') && !e.target.closest('.modal-close')) return;
    const modal = document.getElementById('participantsModal');
    if (modal) modal.classList.remove('active');
}
