/* Dev-only booking state tools. Uses the console's existing authorized admin, modal and API client. */
(function (global) {
  'use strict';
  const states = {
    quickRequests: ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_RIDE', 'AT_DESTINATION', 'RETURN_RIDE', 'COMPLETED', 'CANCELLED', 'CANCELLED_NO_DRIVER'],
    scheduledRequests: ['SEARCHING', 'REVIEWING', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_RIDE', 'AT_DESTINATION', 'RETURN_RIDE', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
    plannedRides: ['OPEN', 'OUTBOUND', 'AT_DESTINATION', 'RETURN', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
    plannedRideRequests: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'ARRIVED', 'ON_BOARD', 'COLLECTED', 'FETCHED', 'AT_DESTINATION', 'COMPLETED', 'CANCELLED', 'EXPIRED']
  };
  const names = { quickRequests: 'Quick Ride', scheduledRequests: 'Scheduled Ride', plannedRides: 'Planned Ride', plannedRideRequests: 'Planned participant' };
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let detach = null;
  global.LaynFleetRideTesting = {
    attach({ db, environment, confirm, toast }) {
      if (detach) return detach;
      if (environment.environment !== 'dev' || environment.isDev !== true) throw new Error('Ride testing is available only in dev.');
      let records = [], selected = null, busy = false, stopped = false, request = null;
      const list = $('ride-test-list'), editor = $('ride-test-editor'), message = $('ride-test-message');
      function tell(text) { message.textContent = text; }
      function clearEditor() { selected = null; editor.classList.add('is-hidden'); }
      function renderList() {
        const type = $('ride-test-type').value, query = $('ride-test-search').value.trim().toLowerCase();
        const filtered = records.filter(r => (!type || r.data.recordType === type) && (!query || [r.data.id, r.data.status, r.data.riderName, r.data.driverName, r.data.riderId, r.data.driverId, r.data.planId].some(value => String(value || '').toLowerCase().includes(query))));
        $('ride-test-count').textContent = `${filtered.length} shown · ${records.length} loaded (latest 200)`;
        list.innerHTML = filtered.length ? `<table class="data-table"><thead><tr><th>Ride</th><th>People</th><th>Current state</th><th></th></tr></thead><tbody>${filtered.map((record) => {
          const b = record.data;
          return `<tr><td><strong>${escapeHtml(names[b.recordType])}</strong><div class="cell-dim">${escapeHtml(b.id)}</div><div>${escapeHtml(b.destination?.address || b.dropoff?.address || '')}</div></td><td>${escapeHtml(b.riderName || b.riderId || '')}<div class="cell-dim">${escapeHtml(b.driverName || b.driverId || 'Unassigned')}</div></td><td><span class="badge">${escapeHtml(b.status)}</span></td><td><button type="button" class="btn btn-ghost" data-test-record="${escapeHtml(record.path)}" ${busy ? 'disabled' : ''}>Change state</button></td></tr>`;
        }).join('')}</tbody></table>` : '<p class="empty-state">No matching dev rides.</p>';
      }
      function select(record) {
        if (busy) return;
        request = null;
        selected = record;
        const b = record.data;
        $('ride-test-record').textContent = `${names[b.recordType]} · ${b.id}`;
        $('ride-test-current').textContent = `Current state: ${b.status} · DEV`;
        $('ride-test-status').replaceChildren(...states[b.recordType].map(value => {
          const option = document.createElement('option'); option.value = value; option.textContent = value; return option;
        }));
        $('ride-test-status').value = b.status;
        $('ride-test-eta').value = Number.isSafeInteger(b.availabilityEtaMinutes) ? b.availabilityEtaMinutes : '';
        $('ride-test-eta-wrap').classList.toggle('is-hidden', b.recordType !== 'quickRequests');
        $('ride-test-driver').value = b.driverId || b.assignedDriverId || b.reviewDriverId || b.currentDriverId || '';
        $('ride-test-driver-wrap').classList.toggle('is-hidden', !['quickRequests', 'scheduledRequests'].includes(b.recordType));
        const scheduled = ['scheduledRequests', 'plannedRides'].includes(b.recordType);
        $('ride-test-departure-wrap').classList.toggle('is-hidden', !scheduled);
        $('ride-test-departure').value = '';
        $('ride-test-reason').value = '';
        $('ride-test-details').textContent = JSON.stringify(b, null, 2);
        editor.classList.remove('is-hidden');
        tell('Review the target state and related records before applying.');
        editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      function onListClick(event) {
        const button = event.target.closest('[data-test-record]');
        if (button) select(records.find(record => record.path === button.dataset.testRecord));
      }
      async function apply(event) {
        event.preventDefault();
        if (busy || !selected || stopped) return;
        if (environment.environment !== 'dev' || !global.AdminAccess.currentUser) return tell('Dev administrator sign-in required.');
        const b = selected.data;
        const reason = $('ride-test-reason').value.trim(), target = $('ride-test-status').value;
        if (!reason || reason.length > 500) return tell('Enter a test reason (up to 500 characters).');
        const payload = { recordType: b.recordType, rideId: b.id, ownerId: selected.path.split('/')[3], targetStatus: target, expectedStatus: b.status, expectedUpdatedAt: b.updatedAt, reason };
        if (['quickRequests', 'scheduledRequests'].includes(b.recordType)) payload.driverId = $('ride-test-driver').value.trim();
        if (b.recordType === 'quickRequests' && $('ride-test-eta').value) payload.availabilityEtaMinutes = Number($('ride-test-eta').value);
        const departure = $('ride-test-departure').value;
        if (departure && ['scheduledRequests', 'plannedRides'].includes(b.recordType)) {
          payload.departureAt = new Date(departure).getTime();
          if (!Number.isSafeInteger(payload.departureAt)) return tell('Enter a valid departure time.');
        }
        if (target === b.status && payload.departureAt === undefined) return tell('Choose a different state or a new departure time.');
        const signature = JSON.stringify(payload);
        if (!request || request.signature !== signature) request = { signature, payload: { ...payload, actionId: global.crypto.randomUUID() } };
        busy = true; $('ride-test-apply').disabled = true; renderList();
        try {
          const result = await confirm({ title: 'Change DEV ride state?', message: `${names[b.recordType]} ${b.id}: ${b.status} → ${target}. Related assignments, availability, timestamps and commitments will be updated. Planned ride resets also reset participant progress. Existing reviews and notification history are retained. Pending Quick Rides resume normal dispatch and may change state immediately.`, confirmText: 'Apply to DEV', confirmClass: 'btn-danger' });
          if (!result.confirmed || stopped) return;
          tell('Applying dev state change…');
          const response = await environment.request('/admin/dev-ride-state', request.payload);
          if (!stopped) {
            clearEditor(); request = null;
            tell(`Saved to DEV: ${response.data.status}. ${response.data.affectedRecords} related records updated.`);
            toast('Dev ride state updated.', 'success');
          }
        } catch (error) { if (!stopped) { tell(error.message); toast(error.message, 'error'); } }
        finally { busy = false; if (!stopped) { $('ride-test-apply').disabled = false; renderList(); } }
      }
      function filter() { renderList(); }
      function close() { if (!busy) clearEditor(); }
      $('ride-test-type').addEventListener('change', filter);
      $('ride-test-search').addEventListener('input', filter);
      list.addEventListener('click', onListClick);
      editor.addEventListener('submit', apply);
      $('ride-test-close').addEventListener('click', close);
      tell('Loading dev rides…');
      const unsubscribe = db.collectionGroup('requests').where('environment', '==', 'dev')
        .where('recordType', 'in', Object.keys(states)).orderBy('createdAt', 'desc').limit(200)
        .onSnapshot(snapshot => {
          if (stopped) return;
          const incoming = snapshot.docs.map(doc => ({ path: doc.ref.path, data: doc.data() }));
          const valid = incoming.every(record => {
            const parts = record.path.split('/'), b = record.data;
            return parts.length === 6 && parts[0] === 'laynfleet' && parts[1] === 'dev' && parts[2] === b.recordType && parts[4] === 'requests' && parts[5] === b.id && states[b.recordType]?.includes(b.status) && Number.isSafeInteger(b.updatedAt);
          });
          if (!valid) { records = []; clearEditor(); tell('Invalid dev ride metadata. Editing is unavailable until the data is corrected.'); renderList(); return; }
          records = incoming;
          if (selected && !busy) {
            const current = records.find(record => record.path === selected.path);
            if (!current || current.data.updatedAt !== selected.data.updatedAt || current.data.status !== selected.data.status) { clearEditor(); tell('The selected ride changed. Select it again to review its latest state.'); }
          }
          renderList();
          if (!selected && message.textContent === 'Loading dev rides…') tell('Choose a dev ride to change its state.');
        }, error => { records = []; clearEditor(); renderList(); tell(`Unable to load dev rides: ${error.message}`); });
      detach = () => {
        stopped = true; unsubscribe(); records = []; clearEditor(); list.replaceChildren();
        $('ride-test-type').removeEventListener('change', filter); $('ride-test-search').removeEventListener('input', filter);
        list.removeEventListener('click', onListClick); editor.removeEventListener('submit', apply); $('ride-test-close').removeEventListener('click', close);
        detach = null;
      };
      return detach;
    }
  };
})(window);
