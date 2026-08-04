/**
 * MDT prototype — store, router, views, main.
 *
 * State is persisted to localStorage under STORAGE_KEY. The prototype rehydrates
 * from window.MDT_FIXTURES on first load or after a research-mode reset.
 *
 * All significant mutations must go through mutate(), which:
 *   1. applies the change,
 *   2. writes an audit event,
 *   3. persists to localStorage,
 *   4. re-renders.
 */
(function () {
  'use strict';

  const D = window.MDT_DOMAIN;
  const F = window.MDT_FIXTURES;
  const STORAGE_KEY = 'mdt-prototype-state:v1';

  /* =====================================================================
   * State store
   * ===================================================================== */

  let state = load();
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.schemaVersion === F.schemaVersion) return parsed;
      }
    } catch (e) { /* ignore */ }
    return clone(F);
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Could not persist prototype state', e); }
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function resetToFixtures() {
    state = clone(F);
    persist();
    notify();
  }

  function subscribe(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
  function notify() { listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } }); }

  /**
   * Apply a mutation function and record an audit event describing it.
   * mutation: (draftState) => { entityType, entityId, action, previousState?, newState?, reason? }
   */
  function mutate(mutation) {
    const draft = clone(state);
    const audit = mutation(draft);
    if (audit) {
      draft.auditEvents.push({
        id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        occurredAt: new Date().toISOString(),
        performedBy: state.currentUser.id,
        ...audit
      });
    }
    state = draft;
    persist();
    notify();
  }

  /* =====================================================================
   * Rendering helpers
   * ===================================================================== */

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const escape = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return escape(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return escape(iso);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function formatPercent(v) {
    if (v == null) return '—';
    return `${Math.round(v * 100)}%`;
  }

  const tag = (text, modifier) =>
    `<strong class="govuk-tag govuk-tag--${modifier || 'blue'}">${escape(text)}</strong>`;

  /**
   * Plain-text version of a "could not test" reason, for use in confirmation
   * copy (rather than quoting the raw policy-list value).
   */
  function reasonToPlainText(reason) {
    const map = {
      'Refused': 'the prisoner refused the test',
      'Unable to provide a sample': 'the prisoner was unable to provide a sample',
      'Temporarily unavailable': 'the prisoner was temporarily unavailable',
      'At court': 'the prisoner was at court',
      'In healthcare': 'the prisoner was in healthcare',
      'Segregated': 'the prisoner was segregated',
      'Transferred out': 'the prisoner had transferred out',
      'Released': 'the prisoner had been released',
      'Other': 'the test could not be completed for another reason'
    };
    return map[reason] || 'the test could not be completed';
  }

  function priorityBadge(sel, prisoner) {
    const p = D.priorityFor(sel, prisoner, state.now || new Date().toISOString());
    return `<span class="mdt-priority mdt-priority--${p.code}" title="${escape(p.reason)}">${escape(p.label)}</span>`;
  }

  function breadcrumbs(items) {
    const html = items.map((it, i) => {
      if (i === items.length - 1) {
        return `<li class="govuk-breadcrumbs__list-item" aria-current="page">${escape(it.text)}</li>`;
      }
      return `<li class="govuk-breadcrumbs__list-item"><a class="govuk-breadcrumbs__link" href="${escape(it.href)}">${escape(it.text)}</a></li>`;
    }).join('');
    return `<ol class="govuk-breadcrumbs__list">${html}</ol>`;
  }

  function errorSummary(errors) {
    if (!errors || !errors.length) return '';
    const items = errors.map(e =>
      `<li><a href="#field-${escape(e.field)}">${escape(e.message)}</a></li>`
    ).join('');
    return `
      <div class="govuk-error-summary" data-module="govuk-error-summary" tabindex="-1">
        <div role="alert">
          <h2 class="govuk-error-summary__title">There is a problem</h2>
          <div class="govuk-error-summary__body">
            <ul class="govuk-list govuk-error-summary__list">${items}</ul>
          </div>
        </div>
      </div>`;
  }

  function fieldErrorMsg(errors, field) {
    const e = (errors || []).find(x => x.field === field);
    if (!e) return '';
    return `<p class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> ${escape(e.message)}</p>`;
  }

  /* =====================================================================
   * Router — hash-based, tiny path matcher.
   * ===================================================================== */

  const routes = [];
  function route(pattern, handler) { routes.push({ pattern, handler }); }

  function matchRoute(path) {
    for (const r of routes) {
      const paramNames = [];
      const rx = new RegExp('^' + r.pattern.replace(/:[^/]+/g, (m) => {
        paramNames.push(m.slice(1));
        return '([^/]+)';
      }) + '$');
      const m = path.match(rx);
      if (m) {
        const params = {};
        paramNames.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
        return { handler: r.handler, params };
      }
    }
    return null;
  }

  function currentPath() {
    const hash = window.location.hash || '#/';
    return hash.slice(1) || '/';
  }

  function navigate(path) { window.location.hash = path; }

  function render() {
    const path = currentPath();
    const match = matchRoute(path);
    const root = $('#view-root');
    const bc = $('#breadcrumbs');
    if (!match) {
      document.title = 'Page not found — MDT prototype';
      bc.innerHTML = breadcrumbs([{ href: '#/', text: 'Home' }, { text: 'Page not found' }]);
      root.innerHTML = `
        <h1 class="govuk-heading-xl">Page not found</h1>
        <p class="govuk-body">The path <code>${escape(path)}</code> is not a valid route.</p>
        <p class="govuk-body"><a class="govuk-link" href="#/">Return to the MDT service homepage</a>.</p>`;
      return;
    }
    try {
      const { title, breadcrumbs: crumbs, html } = match.handler(match.params, state);
      document.title = title + ' — MDT prototype';
      bc.innerHTML = crumbs ? breadcrumbs(crumbs) : '';
      root.innerHTML = html;
      // move focus to h1 or error summary after navigation
      const errSummary = root.querySelector('.govuk-error-summary');
      if (errSummary) errSummary.focus();
      else $('#main-content').focus();
      // wire up any data-action handlers
      root.querySelectorAll('form[data-form-action]').forEach(f => {
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          const submitter = e.submitter;
          const confirmMsg = submitter && submitter.dataset ? submitter.dataset.mdtConfirm : null;
          if (confirmMsg && !window.confirm(confirmMsg)) return;
          const formData = Object.fromEntries(new FormData(f).entries());
          handleFormAction(f.dataset.formAction, formData, match.params);
        });
      });
      // interactive list features (search + sort)
      wireListInteractions(root);
    } catch (err) {
      console.error(err);
      root.innerHTML = `<h1 class="govuk-heading-xl">Something went wrong</h1><pre class="govuk-body">${escape(err.stack || err.message)}</pre>`;
    }
  }

  window.addEventListener('hashchange', render);

  /* =====================================================================
   * Form action dispatch
   * ===================================================================== */

  function handleFormAction(action, data, params) {
    switch (action) {
      case 'generate-lists':      return actionGenerateLists(data, params);
      case 'reset-current-month': return actionResetCurrentMonth(data, params);
      case 'record-test-step1':   return actionRecordTestStep1(data, params);
      case 'record-test-reason':  return actionRecordTestNotCompleted(data, params);
      case 'record-attempt':      return actionRecordAttempt(data, params);
      case 'record-sample':       return actionRecordSample(data, params);
      case 'use-reserve':         return actionUseReserve(data, params);
      case 'record-result':       return actionRecordResult(data, params);
      case 'complete-followup':   return actionCompleteFollowUp(data, params);
      case 'close-month':         return actionCloseMonth(data, params);
      default: console.warn('Unknown form action', action);
    }
  }

  /* =====================================================================
   * Actions (mutations)
   * ===================================================================== */

  function actionGenerateLists(data, params) {
    const monthId = params.monthId || data.monthId;
    const month = D.monthFor(state, monthId);
    if (!month) return;
    if (D.isListGenerated(state, monthId)) {
      navigate(`/mdt/${monthId}/random-list`);
      return;
    }
    const est = state.establishment;
    const defaultRandomSize = Math.min(month.allocatedTests, state.prisoners.length);
    const defaultReserveSize = D.calculateReserveSize(defaultRandomSize, est.reservePercentDefault);
    // The officer can adjust the proposed sizes before generating; clamp to sane bounds.
    const requestedRandomSize = parseInt(data.randomSize, 10);
    const requestedReserveSize = parseInt(data.reserveSize, 10);
    const randomSize = Number.isFinite(requestedRandomSize) && requestedRandomSize > 0
      ? Math.min(requestedRandomSize, state.prisoners.length)
      : defaultRandomSize;
    const reserveSize = Number.isFinite(requestedReserveSize) && requestedReserveSize >= 0
      ? Math.min(requestedReserveSize, state.prisoners.length - randomSize)
      : Math.min(defaultReserveSize, state.prisoners.length - randomSize);
    const shuffled = D.shuffle(state.prisoners.map(p => p.id));
    const randomIds = shuffled.slice(0, randomSize);
    const reserveIds = shuffled.slice(randomSize, randomSize + reserveSize);
    const ts = new Date().toISOString();
    const percentageRequested = Math.round((randomSize / (est.avgPopulation30Days || state.prisoners.length)) * 100);
    const selectionReference = `SEED-${monthId.replace('m-', '').toUpperCase()}-LH-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

    mutate((draft) => {
      randomIds.forEach((pid, i) => {
        draft.selections.push({
          id: `s-${monthId}-r-${i + 1}-${Date.now()}`,
          reportingMonthId: monthId, prisonerId: pid,
          listType: 'random', listPosition: i + 1, status: 'not-started'
        });
      });
      reserveIds.forEach((pid, i) => {
        draft.selections.push({
          id: `s-${monthId}-x-${i + 1}-${Date.now()}`,
          reportingMonthId: monthId, prisonerId: pid,
          listType: 'reserve', listPosition: i + 1, status: 'not-started'
        });
      });
      const m = draft.reportingMonths.find(m => m.id === monthId);
      if (m) {
        m.randomListGeneratedAt = ts;
        m.reserveListGeneratedAt = ts;
        m.generatedBy = draft.currentUser.displayName;
        m.populationAtGeneration = est.avgPopulation30Days;
        m.percentageRequested = percentageRequested;
        m.reserveListSize = reserveIds.length;
        m.selectionReference = selectionReference;
        if (m.status === 'not-started') m.status = 'in-progress';
      }
      return {
        entityType: 'reportingMonth', entityId: monthId,
        action: `Random and reserve lists generated (${randomIds.length} + ${reserveIds.length})`,
        newState: { randomSize: randomIds.length, reserveSize: reserveIds.length, selectionReference }
      };
    });
    navigate(`/mdt/${monthId}/random-list`);
  }

  function actionResetCurrentMonth(data, params) {
    const monthId = params.monthId || data.monthId;
    const month = D.monthFor(state, monthId);
    if (!month) return;
    mutate((draft) => {
      const selIds = new Set(draft.selections.filter(s => s.reportingMonthId === monthId).map(s => s.id));
      draft.selections = draft.selections.filter(s => s.reportingMonthId !== monthId);
      draft.testAttempts = draft.testAttempts.filter(a => !selIds.has(a.selectionId));
      const smIds = new Set(draft.samples.filter(sm => selIds.has(sm.selectionId)).map(sm => sm.id));
      draft.samples = draft.samples.filter(sm => !selIds.has(sm.selectionId));
      draft.testResults = draft.testResults.filter(r => !smIds.has(r.sampleId));
      draft.followUpActions = draft.followUpActions.filter(f => !selIds.has(f.selectionId));
      const m = draft.reportingMonths.find(m => m.id === monthId);
      if (m) {
        m.randomListGeneratedAt = null;
        m.reserveListGeneratedAt = null;
        m.status = 'not-started';
      }
      return {
        entityType: 'reportingMonth', entityId: monthId,
        action: 'Month reset — random and reserve lists cleared',
        reason: 'Facilitator/officer restarted the month'
      };
    });
    navigate(`/mdt/${monthId}`);
  }

  /**
   * Record test — was the test completed? Yes records the test as done
   * (with the date it was attempted) and moves straight to confirmation —
   * recording the laboratory result is out of scope for this service.
   * No goes to the reason page.
   */
  function actionRecordTestStep1(data, params) {
    const completed = data.completed;
    const errors = [];
    if (completed !== 'yes' && completed !== 'no') {
      errors.push({ field: 'completed', message: 'Choose yes or no' });
    }
    if (completed === 'yes' && !data.attemptedDate) {
      errors.push({ field: 'attemptedDate', message: 'Enter the date the test was attempted' });
    }
    if (errors.length) {
      window.__mdtLastErrors = { form: 'test-step1', errors, values: data };
      render();
      return;
    }
    window.__mdtLastErrors = null;
    if (completed === 'no') {
      navigate(`/mdt/${params.monthId}/selection/${params.selectionId}/test/reason`);
      return;
    }
    mutate((draft) => {
      const s = draft.selections.find(x => x.id === params.selectionId);
      if (!s) return null;
      const prev = { status: s.status };
      const nowIso = new Date().toISOString();
      draft.testAttempts.push({
        id: `ta-${Date.now()}`, selectionId: s.id, outcome: 'Sample collected',
        attemptedAt: data.attemptedDate, recordedAt: nowIso, recordedBy: draft.currentUser.id
      });
      s.status = 'completed';
      return {
        entityType: 'selection', entityId: s.id,
        action: 'Test recorded as completed — awaiting laboratory result by email',
        previousState: prev,
        newState: { status: 'completed', attemptedAt: data.attemptedDate }
      };
    });
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}/test/confirmation`);
  }

  /**
   * Record test — not-completed path. Records reason + auto-activates the
   * next available reserve (top of reserve list). Journey map step 2b → confirmation.
   */
  function actionRecordTestNotCompleted(data, params) {
    const reason = (data.reason || '').trim();
    if (!reason) {
      window.__mdtLastErrors = { form: 'test-reason', errors: [{ field: 'reason', message: 'Choose a reason' }], values: data };
      render();
      return;
    }

    mutate((draft) => {
      const s = draft.selections.find(x => x.id === params.selectionId);
      if (!s) return null;
      const prev = { status: s.status };
      const nowIso = new Date().toISOString();
      draft.testAttempts.push({
        id: `ta-${Date.now()}`, selectionId: s.id, outcome: reason,
        recordedAt: nowIso, recordedBy: draft.currentUser.id
      });
      s.status = 'exception';
      s.exceptionReason = reason;

      // Auto-activate the next reserve (top of list, first unused).
      const nextReserve = draft.selections
        .filter(x => x.reportingMonthId === s.reportingMonthId && x.listType === 'reserve' && !x.originalSelectionId)
        .sort((a, b) => a.listPosition - b.listPosition)[0];
      let reserveInfo = null;
      if (nextReserve) {
        nextReserve.originalSelectionId = s.id;
        nextReserve.status = 'not-started';
        s.replacementSelectionId = nextReserve.id;
        reserveInfo = { reserveId: nextReserve.id };
      }
      return {
        entityType: 'selection', entityId: s.id,
        action: `Test not completed — ${reason}${nextReserve ? '; reserve activated' : '; no reserve available'}`,
        previousState: prev,
        newState: { status: 'exception', exceptionReason: reason, ...(reserveInfo || {}) }
      };
    });
    window.__mdtLastErrors = null;
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}/test/confirmation`);
  }

  function actionRecordAttempt(data, params) {
    const sel = D.selectionFor(state, params.selectionId);
    if (!sel) return;
    const outcome = data.outcome;
    const notes = data.notes || '';
    if (!outcome) return; // handled by view-side validation

    mutate((draft) => {
      const s = draft.selections.find(x => x.id === params.selectionId);
      const prev = { status: s.status, exceptionReason: s.exceptionReason };
      draft.testAttempts.push({
        id: `ta-${Date.now()}`,
        selectionId: s.id,
        outcome,
        notes,
        recordedAt: new Date().toISOString(),
        recordedBy: draft.currentUser.id
      });
      if (outcome === 'Sample collected') {
        // continue to sample recording — status set on sample step
      } else if (D.OUTCOMES_ALLOW_RESERVE.has(outcome)) {
        s.status = 'exception';
        s.exceptionReason = outcome;
      } else {
        s.status = 'attempt-required';
      }
      return {
        entityType: 'selection', entityId: s.id,
        action: `Test attempt recorded — ${outcome}`,
        reason: notes || undefined,
        previousState: prev,
        newState: { status: s.status, exceptionReason: s.exceptionReason }
      };
    });

    if (outcome === 'Sample collected') {
      navigate(`/mdt/${params.monthId}/selection/${params.selectionId}/sample`);
    } else if (D.OUTCOMES_ALLOW_RESERVE.has(outcome)) {
      navigate(`/mdt/${params.monthId}/selection/${params.selectionId}/use-reserve`);
    } else {
      navigate(`/mdt/${params.monthId}/selection/${params.selectionId}`);
    }
  }

  function actionRecordSample(data, params) {
    const existingSamples = state.samples;
    const errors = D.validateSampleForm(data, existingSamples);
    if (errors.length) {
      window.__mdtLastErrors = { form: 'sample', errors, values: data };
      render();
      return;
    }

    mutate((draft) => {
      const s = draft.selections.find(x => x.id === params.selectionId);
      const prev = { status: s.status };
      const sample = {
        id: `sm-${Date.now()}`,
        selectionId: s.id,
        reference: data.reference.trim(),
        collectedAt: new Date(data.collectedAt).toISOString(),
        collectedBy: draft.currentUser.id,
        testType: data.testType,
        status: 'awaiting-result'
      };
      draft.samples.push(sample);
      s.status = 'sample-collected';
      return {
        entityType: 'selection', entityId: s.id,
        action: 'Sample collected',
        previousState: prev,
        newState: { status: 'sample-collected', sampleReference: sample.reference }
      };
    });
    window.__mdtLastErrors = null;
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}`);
  }

  function actionUseReserve(data, params) {
    const reserveId = data.reserveId;
    const reason = data.reason || '';
    if (!reserveId) {
      window.__mdtLastErrors = { form: 'reserve', errors: [{ field: 'reserveId', message: 'Choose a reserve to activate' }], values: data };
      render();
      return;
    }
    if (!reason.trim()) {
      window.__mdtLastErrors = { form: 'reserve', errors: [{ field: 'reason', message: 'Enter a reason for using a reserve' }], values: data };
      render();
      return;
    }

    mutate((draft) => {
      const original = draft.selections.find(x => x.id === params.selectionId);
      const reserve  = draft.selections.find(x => x.id === reserveId);
      const prevOriginal = { replacementSelectionId: original.replacementSelectionId, status: original.status };
      const prevReserve  = { originalSelectionId: reserve.originalSelectionId, status: reserve.status };
      original.replacementSelectionId = reserve.id;
      if (!original.exceptionReason) original.exceptionReason = 'Reserve used';
      original.status = 'exception';
      reserve.originalSelectionId = original.id;
      reserve.status = 'attempt-required';
      return {
        entityType: 'selection', entityId: original.id,
        action: `Reserve activated — ${reserve.id}`,
        reason: reason,
        previousState: prevOriginal,
        newState: { replacementSelectionId: reserve.id, status: original.status, reserveId: reserve.id, reservePreviousState: prevReserve }
      };
    });
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}`);
  }

  function actionRecordResult(data, params) {
    const outcome = data.outcome;
    if (!outcome) {
      window.__mdtLastErrors = { form: 'result', errors: [{ field: 'outcome', message: 'Choose a result' }], values: data };
      render();
      return;
    }
    mutate((draft) => {
      const s = draft.selections.find(x => x.id === params.selectionId);
      const sample = draft.samples.find(sm => sm.selectionId === s.id && sm.status === 'awaiting-result');
      if (!sample) return null;
      const prev = { sampleStatus: sample.status, selectionStatus: s.status };
      sample.status = 'result-received';
      draft.testResults.push({
        id: `tr-${Date.now()}`,
        sampleId: sample.id,
        outcome,
        receivedAt: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        recordedBy: draft.currentUser.id
      });
      // Auto-create follow-up tasks for a positive result — mandatory / recommended / local
      if (outcome === 'positive') {
        draft.followUpTemplate.forEach((t, i) => {
          draft.followUpActions.push({
            id: `fu-${Date.now()}-${i}`,
            selectionId: s.id,
            actionType: t.actionType,
            requirement: t.requirement,
            status: 'not-started'
          });
        });
        s.status = 'sample-collected'; // stays until follow-up completed
      } else if (outcome === 'negative') {
        s.status = 'completed';
      } else {
        s.status = 'sample-collected'; // inconclusive / rejected — officer decides next step
      }
      return {
        entityType: 'selection', entityId: s.id,
        action: `Result recorded — ${outcome}`,
        previousState: prev,
        newState: { selectionStatus: s.status, sampleId: sample.id, result: outcome }
      };
    });
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}`);
  }

  function actionCompleteFollowUp(data, params) {
    const followUpId = data.followUpId;
    mutate((draft) => {
      const f = draft.followUpActions.find(x => x.id === followUpId);
      if (!f) return null;
      const prev = { status: f.status };
      f.status = 'completed';
      f.completedAt = new Date().toISOString();
      f.completedBy = draft.currentUser.id;
      // Check if the selection is now complete
      const outstanding = draft.followUpActions.filter(x =>
        x.selectionId === f.selectionId && x.requirement === 'mandatory' && x.status !== 'completed'
      );
      if (outstanding.length === 0) {
        const s = draft.selections.find(x => x.id === f.selectionId);
        if (s) s.status = 'completed';
      }
      return {
        entityType: 'selection', entityId: f.selectionId,
        action: `Follow-up completed — ${f.actionType}`,
        previousState: prev,
        newState: { status: 'completed', requirement: f.requirement }
      };
    });
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}`);
  }

  function actionCloseMonth(data, params) {
    mutate((draft) => {
      const m = draft.reportingMonths.find(x => x.id === params.monthId);
      if (!m) return null;
      const prev = { status: m.status };
      m.status = 'closed';
      return {
        entityType: 'reportingMonth', entityId: m.id,
        action: 'Month closed',
        reason: data.reason || 'Marked complete by officer',
        previousState: prev,
        newState: { status: 'closed' }
      };
    });
    navigate(`/mdt/${params.monthId}`);
  }

  /* =====================================================================
   * VIEWS
   * ===================================================================== */

  // ---- Home ---------------------------------------------------------------
  // The MDT landing page IS the current month's workspace — no separate hub.
  route('/', () => {
    const cm = state.reportingMonths
      .filter(m => m.status === 'in-progress' || m.status === 'ready-to-close')
      .sort((a, b) => b.month.localeCompare(a.month))[0]
      || D.currentMonth(state);
    return renderGenerateView(cm, { isHome: true });
  });

  // ---- Dedicated static routes before the generic month route -------------
  route('/mdt/previous-months', () => {
    const months = state.reportingMonths.filter(m => m.id !== D.currentMonth(state).id);
    return {
      title: 'Previous months',
      breadcrumbs: [{ href: '#/', text: 'MDT' }, { text: 'Previous months' }],
      html: `
        <h1 class="govuk-heading-xl">Previous months</h1>
        ${renderMonthHistorySection(months, { hideHeading: true })}
      `
    };
  });

  route('/mdt/guidance', () => ({
    title: 'Guidance',
    breadcrumbs: [{ href: '#/', text: 'MDT' }, { text: 'Guidance' }],
    html: `
      <h1 class="govuk-heading-xl">Guidance</h1>
      <p class="govuk-body">This prototype is for user research only. Rules encoded here are prototype assumptions, not policy.</p>

      <h2 class="govuk-heading-m">Random MDT vs suspicion testing</h2>
      <p class="govuk-body">
        This service handles random MDT only. Suspicion-based testing is managed by Security teams
        and has a different aim (evidence and enforcement) and a different expected positive rate.
      </p>

      <h2 class="govuk-heading-m">List generation</h2>
      <p class="govuk-body">
        A random list and a reserve list are generated at the start of each month and then locked.
        Random list size is calculated as a percentage of the establishment's average population.
      </p>

      <h2 class="govuk-heading-m">Reserves</h2>
      <p class="govuk-body">
        A reserve may be used when a random-list selection cannot be tested. The service will not
        select a reserve for you — the officer records a reason on the original record and confirms
        the reserve. The link between the two records is preserved and both records show it.
      </p>

      <h2 class="govuk-heading-m">Follow-up after a positive result</h2>
      <p class="govuk-body">
        A positive result creates a task list split into:
      </p>
      <ul class="govuk-list govuk-list--bullet">
        <li><strong>Mandatory</strong> — must be completed. Blocks month closure until done.</li>
        <li><strong>Recommended</strong> — the service recommends but does not require.</li>
        <li><strong>Local</strong> — the officer may decide based on local policy.</li>
      </ul>

      <h2 class="govuk-heading-m">Rollover</h2>
      <p class="govuk-body">
        Records are not silently moved between months. If a sample is awaited across a month
        boundary, the record still belongs to its original reporting month; both months show it
        until the result is recorded.
      </p>

      <p class="govuk-body">
        See <a class="govuk-link" href="../ASSUMPTIONS.md">ASSUMPTIONS.md</a> and
        <a class="govuk-link" href="../OPEN_QUESTIONS.md">OPEN_QUESTIONS.md</a> for policy uncertainties.
      </p>
    `
  }));

  // ---- Monthly workspace (current or previous month) ---------------------
  route('/mdt/:monthId', (params) => {
    const m = D.monthFor(state, params.monthId);
    if (!m) return notFound(params.monthId);
    if (!D.isListGenerated(state, m.id)) return renderGenerateView(m, { isHome: false });
    return renderTabView(m, 'random', { isHome: false });
  });

  route('/mdt/:monthId/random-list', (params) => {
    const m = D.monthFor(state, params.monthId);
    if (!m) return notFound(params.monthId);
    if (!D.isListGenerated(state, m.id)) return renderGenerateView(m, { isHome: false });
    return renderTabView(m, 'random', { isHome: false });
  });
  route('/mdt/:monthId/reserve-list', (params) => {
    const m = D.monthFor(state, params.monthId);
    if (!m) return notFound(params.monthId);
    if (!D.isListGenerated(state, m.id)) return renderGenerateView(m, { isHome: false });
    return renderTabView(m, 'reserve', { isHome: false });
  });
  route('/mdt/:monthId/awaiting-results', (params) => {
    const m = D.monthFor(state, params.monthId);
    if (!m) return notFound(params.monthId);
    if (!D.isListGenerated(state, m.id)) return renderGenerateView(m, { isHome: false });
    return renderTabView(m, 'awaiting', { isHome: false });
  });

  route('/mdt/:monthId/contained', (params) => {
    const m = D.monthFor(state, params.monthId);
    if (!m) return notFound(params.monthId);
    if (!D.isListGenerated(state, m.id)) return renderGenerateView(m, { isHome: false });
    return renderContainedMonthView(m);
  });

  /* ---- Generate-list view (start of the journey) -------------------- */

  function previousMonthFor(month) {
    if (!month || !month.month) return null;
    const [yearStr, monthStr] = month.month.split('-');
    if (!yearStr || !monthStr) return null;
    const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    d.setMonth(d.getMonth() - 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return state.reportingMonths.find(m => m.month === key) || null;
  }

  function renderOutstandingIssueAlert(month) {
    const previousMonth = previousMonthFor(month);
    if (!previousMonth) return '';

    const report = D.buildMonthlyReport(state, previousMonth.id);
    const outstanding = (report.figures.awaitingResults || 0) + (report.figures.positive || 0);
    if (!outstanding) return '';

    return `
      <div class="moj-alert moj-alert--info govuk-!-margin-bottom-6" role="status">
        <div class="moj-alert__content">
          <h2 class="govuk-heading-s govuk-!-margin-bottom-2">Outstanding tests from ${escape(previousMonth.label)} need attention</h2>
          <p class="govuk-body govuk-!-margin-bottom-2">
            There are ${outstanding} outstanding tests from ${escape(previousMonth.label)} that still need review before you continue.
          </p>
          <p class="govuk-body govuk-!-margin-bottom-0">
            <a class="govuk-link" href="#/mdt/${escape(previousMonth.id)}/contained">Review the ${escape(previousMonth.label)} list</a>
          </p>
        </div>
      </div>`;
  }

  function renderMonthHistorySection(months, opts) {
    const showHeading = !(opts && opts.hideHeading);
    const items = months.map(m => {
      const report = D.buildMonthlyReport(state, m.id);
      return `
        <li class="mdt-month-history-item">
          <div class="mdt-month-history-item__header">
            <h3 class="govuk-heading-s govuk-!-margin-bottom-2">${escape(m.label)}</h3>
            ${tag(monthStatusLabel(m.status), monthStatusModifier(m.status))}
          </div>
          <div class="mdt-month-history-item__kpis">
            <div class="mdt-month-history-kpi">
              <p class="mdt-month-history-kpi__label">Tests completed</p>
              <p class="mdt-month-history-kpi__value">${report.figures.completed}<span class="mdt-month-history-kpi__value--sub">of ${m.allocatedTests}</span></p>
            </div>
          </div>
          <p class="govuk-body govuk-!-margin-top-2 govuk-!-margin-bottom-0">
            <a class="govuk-link" href="#/mdt/${escape(m.id)}/contained">View ${escape(m.label)}</a>
          </p>
        </li>`;
    }).join('');

    return `
      <div class="govuk-!-margin-top-8">
        ${showHeading ? `<h2 class="govuk-heading-m">Previous months</h2>
        <p class="govuk-body">Review earlier months and their outstanding work before you continue.</p>` : ''}
        <ul class="govuk-list govuk-list--spaced mdt-month-history-list">${items}</ul>
      </div>`;
  }

  function renderGenerateView(month, opts) {
    const est = state.establishment;
    const percent = est.avgPopulation30Days >= 400 ? 5 : 10;
    const randomSize = Math.min(month.allocatedTests, state.prisoners.length);
    const reserveSize = D.calculateReserveSize(randomSize, est.reservePercentDefault);
    return {
      title: `Generate the random list for ${month.label}`,
      breadcrumbs: opts.isHome
        ? [{ text: 'Digital Prison Services' }, { text: 'Mandatory Drug Testing' }]
        : [{ href: '#/', text: 'MDT' }, { text: month.label }],
      html: `
        <span class="govuk-caption-xl">${escape(est.name)}</span>
        <h1 class="govuk-heading-xl">Generate the random list for ${escape(month.label)}</h1>

        ${renderOutstandingIssueAlert(month)}

        <h2 class="govuk-heading-m govuk-!-margin-top-6">Calculation details</h2>
        <dl class="govuk-summary-list">
          <div class="govuk-summary-list__row">
            <dt class="govuk-summary-list__key">Average population of ${escape(est.name)} (last 30 days)</dt>
            <dd class="govuk-summary-list__value">${est.avgPopulation30Days}</dd>
          </div>
        </dl>

        <form data-form-action="generate-lists" data-month-id="${escape(month.id)}" class="govuk-!-margin-top-4" novalidate>
          <input type="hidden" name="monthId" value="${escape(month.id)}" />

          <div class="govuk-form-group">
            <label class="govuk-label govuk-label--m" for="field-random-size">Select random list size</label>
            <div class="govuk-hint">The policy rule for a prison this size is to select ${percent}% of the prison population.</div>
            <input class="govuk-input govuk-input--width-5" id="field-random-size" name="randomSize" type="number" inputmode="numeric" min="1" max="${state.prisoners.length}" value="${randomSize}">
          </div>

          <div class="govuk-form-group">
            <label class="govuk-label govuk-label--m" for="field-reserve-size">Select reserve list size</label>
            <div class="govuk-hint">The reserve list is typically ${est.reservePercentDefault}% of the size of the main random list.</div>
            <input class="govuk-input govuk-input--width-5" id="field-reserve-size" name="reserveSize" type="number" inputmode="numeric" min="0" max="${state.prisoners.length}" value="${reserveSize}">
          </div>

          <button type="submit" class="govuk-button govuk-!-margin-top-2" data-module="govuk-button">Generate list</button>
          <a class="govuk-link govuk-!-margin-left-3" href="#/mdt/guidance">Read the guidance first</a>
        </form>
      `
    };
  }

  /* ---- Month shell (secondary nav + metric strip + tabs + content) --- */

  function renderTabView(month, activeTab, opts) {
    const rand = D.random(state, month.id);
    const rsv = D.reserves(state, month.id);
    const awaitingList = D.awaitingResults(state, month.id);
    const positiveList = D.positiveResultsAwaitingFollowUp(state, month.id);

    const content =
      activeTab === 'random'   ? contentRandomList(month, rand)
    : activeTab === 'reserve'  ? contentReserveList(month, rsv)
    : activeTab === 'awaiting' ? contentAwaitingResults(month, awaitingList, positiveList)
    : '';

    return {
      title: opts.isHome ? 'Mandatory Drug Testing' : `${month.label} — ${tabLabelFor(activeTab)}`,
      breadcrumbs: opts.isHome
        ? [{ text: 'Digital Prison Services' }, { text: 'Mandatory Drug Testing' }]
        : [{ href: '#/', text: 'MDT' }, { text: month.label }],
      html: `
        <div class="mdt-workspace-header">
          <div>
            <span class="govuk-caption-xl">${escape(state.establishment.name)}</span>
            <h1 class="govuk-heading-xl govuk-!-margin-bottom-2">
              ${escape(month.label)}
              ${tag(monthStatusLabel(month.status), monthStatusModifier(month.status))}
            </h1>
          </div>
          <div class="mdt-workspace-header__actions">
            <a class="govuk-link" href="#/mdt/previous-months">View previous months</a>
            <a class="govuk-link" href="#/mdt/${escape(month.id)}/report">Monthly report</a>
            <button type="button" class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" data-mdt-print="${escape(month.id)}">
              Print testing list
            </button>
            <form data-form-action="reset-current-month" style="display:inline;">
              <input type="hidden" name="monthId" value="${escape(month.id)}" />
              <button type="submit" class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" data-mdt-confirm="Start this month over? This clears all lists and any recorded activity for ${escape(month.label)}. Fictional data only.">
                Start over
              </button>
            </form>
          </div>
        </div>

        ${renderOrderingDetails(month, rand, rsv)}

        ${renderTabsNav(month, activeTab, { rand, rsv, awaitingList, positiveList })}

        <div class="mdt-tab-panel" role="tabpanel" aria-labelledby="tab-${escape(activeTab)}">
          ${content}
        </div>

        ${renderPrintableLists(month, rand, rsv)}
      `
    };
  }

  function tabLabelFor(tab) {
    return { random: 'Random list', reserve: 'Reserve list', awaiting: 'Awaiting results' }[tab] || '';
  }

  function renderTabsNav(month, activeTab, counts) {
    const tabs = [
      { id: 'random',   label: 'Random list',      href: `#/mdt/${month.id}/random-list`,       count: counts.rand.length },
      { id: 'reserve',  label: 'Reserve list',     href: `#/mdt/${month.id}/reserve-list`,      count: counts.rsv.length }
    ];
    return `
      <nav class="mdt-tabs" aria-label="Monthly work areas">
        <ul class="mdt-tabs__list" role="tablist">
          ${tabs.map(t => `
            <li class="mdt-tabs__item" role="presentation">
              <a
                id="tab-${escape(t.id)}"
                role="tab"
                aria-selected="${t.id === activeTab ? 'true' : 'false'}"
                class="mdt-tabs__link ${t.id === activeTab ? 'mdt-tabs__link--current' : ''}"
                href="${escape(t.href)}"
              >
                ${escape(t.label)}
                <span class="mdt-tabs__count">${t.count}</span>
              </a>
            </li>`).join('')}
        </ul>
      </nav>`;
  }

  /**
   * "How is the random list ordered?" details, now placed above the tabs so it
   * applies to the whole monthly workspace. Includes the generation record —
   * the traceable evidence behind this month's random selection.
   */
  function renderOrderingDetails(month, rand, rsv) {
    const generatedAt = month.randomListGeneratedAt ? formatDateTime(month.randomListGeneratedAt) : 'Not yet generated';
    const randomCount = rand ? rand.length : null;
    const reserveCount = rsv ? rsv.length : null;
    const reservePercent = month.percentageRequested != null ? state.establishment.reservePercentDefault : null;
    return `
      <details class="govuk-details govuk-!-margin-bottom-6" data-module="govuk-details">
        <summary class="govuk-details__summary"><span class="govuk-details__summary-text">How is the random list ordered?</span></summary>
        <div class="govuk-details__text">
          <p class="govuk-body">
            The list is generated in random order (not by release date, alphabet or any other characteristic) and then locked. The columns can be sorted for convenience, but list position is preserved as the source of truth. Reserves that have been activated appear at the bottom with a flag.
          </p>
          <table class="govuk-table">
            <caption class="govuk-visually-hidden">Generation record for ${escape(month.label)}</caption>
            <tbody class="govuk-table__body">
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">List reference</th>
                <td class="govuk-table__cell">${escape(month.id)}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Generated time and date</th>
                <td class="govuk-table__cell">${escape(generatedAt)}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Generated by</th>
                <td class="govuk-table__cell">${escape(month.generatedBy || 'Not yet generated')}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Population at generation</th>
                <td class="govuk-table__cell">${month.populationAtGeneration != null ? month.populationAtGeneration : '—'}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Percentage requested</th>
                <td class="govuk-table__cell">${month.percentageRequested != null ? `${month.percentageRequested}%${randomCount != null ? ` (${randomCount} prisoners)` : ''}` : '—'}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Reserve list size</th>
                <td class="govuk-table__cell">${reservePercent != null ? `${reservePercent}%${reserveCount != null ? ` (${reserveCount} prisoners)` : ''}` : '—'}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Selection reference (random seed evidence)</th>
                <td class="govuk-table__cell">${escape(month.selectionReference || 'Not yet generated')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>`;
  }

  /**
   * Printable random + reserve lists, in original generated (list position) order.
   * Hidden on screen; shown (landscape) only when printed via the "Print testing
   * list" button. See the @media print rules in styles.css.
   */
  function renderPrintableLists(month, rand, rsv) {
    const rowsFor = (items) => items.map(s => {
      const p = D.prisonerFor(state, s.prisonerId);
      return `
        <tr>
          <td>${s.listPosition}</td>
          <td>${escape(p.displayName)}</td>
          <td>${escape(p.prisonNumber)}</td>
          <td>${escape(p.location)}</td>
        </tr>`;
    }).join('');
    const table = (title, items) => `
      <h2>${escape(title)}</h2>
      <table>
        <thead><tr><th>Position</th><th>Prisoner</th><th>Prison number</th><th>Location</th></tr></thead>
        <tbody>${rowsFor(items)}</tbody>
      </table>`;
    return `
      <div class="mdt-print-only">
        <h1>${escape(state.establishment.name)} — ${escape(month.label)} testing list</h1>
        <p>List reference: ${escape(month.id)}. Generated ${month.randomListGeneratedAt ? escape(formatDateTime(month.randomListGeneratedAt)) : 'not yet generated'}.</p>
        ${table('Random list', rand)}
        <div class="mdt-print-pagebreak"></div>
        ${table('Reserve list', rsv)}
      </div>`;
  }

  /* ---- Tab content: random list ------------------------------------- */

  function contentRandomList(month, items, opts) {
    if (!items.length) return '<p class="govuk-body">The random list has not been generated for this month.</p>';
    const simplified = !!(opts && opts.simplified);
    const activatedReserves = D.reserves(state, month.id).filter(r => r.originalSelectionId);
    const rowsForCounts = [...items, ...activatedReserves];
    const isDone = (s) => s.status === 'completed' || (simplified && s.status === 'sample-collected');
    const completed = rowsForCounts.filter(isDone).length;
    const releasing = rowsForCounts.filter(s => {
      const p = D.prisonerFor(state, s.prisonerId);
      return p && D.isReleasingInMonth(p.releaseDate, month.month);
    }).length;
    const weekend = D.testedOnWeekendStats(state, month.id);
    return `
      <ul class="mdt-stat-strip mdt-stat-strip--tight" role="list">
        ${statTile('Completed', `${completed}`, `of ${month.allocatedTests}`)}
        ${statTile('Releasing this month', releasing, null, releasing > 0 ? 'warning' : null)}
        ${statTile('Tested on weekend', weekend.percent == null ? '—' : `${weekend.percent}%`, 'target 14%', (weekend.percent != null && weekend.percent > 14) ? 'warning' : null)}
      </ul>
      <div class="mdt-list-toolbar">
        <div class="govuk-form-group govuk-!-margin-bottom-0 mdt-search-two-thirds">
          <label class="govuk-label" for="mdt-search-random">Search by name or prison number</label>
          <input class="govuk-input" id="mdt-search-random" type="search" data-mdt-search="random-tbody" autocomplete="off" />
        </div>
      </div>
      <p class="govuk-body-s govuk-!-margin-top-4" data-mdt-count-for="random-tbody">${rowsForCounts.length} prisoners</p>
      ${renderSelectionTable(items, month, 'random', { activatedReserves, simplified })}`;
  }

  function contentReserveList(month, items) {
    if (!items.length) return '<p class="govuk-body">The reserve list has not been generated for this month.</p>';
    const used = items.filter(r => r.originalSelectionId).length;
    const releasing = items.filter(s => {
      const p = D.prisonerFor(state, s.prisonerId);
      return p && D.isReleasingInMonth(p.releaseDate, month.month);
    }).length;
    return `
      <ul class="mdt-stat-strip mdt-stat-strip--tight" role="list">
        ${statTile('Reserves used', `${used}`, `of ${items.length}`)}
        ${statTile('Releasing this month', releasing, null, releasing > 0 ? 'warning' : null)}
      </ul>
      <p class="govuk-body">Reserves are used when a random-list prisoner cannot be tested. They need to be tested in list order if used.</p>
      ${renderSelectionTable(items, month, 'reserve')}`;
  }

  function contentAwaitingResults(month, samples, positives) {
    const awaitingRows = samples.map(sm => {
      const sel = D.selectionFor(state, sm.selectionId);
      const p = D.prisonerFor(state, sel.prisonerId);
      return `
        <tr class="govuk-table__row">
          <td class="govuk-table__cell"><a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">${escape(sm.reference)}</a></td>
          <td class="govuk-table__cell">${escape(p.displayName)}<br><span class="govuk-hint govuk-!-font-size-16">${escape(p.prisonNumber)}</span></td>
          <td class="govuk-table__cell">${formatDate(sm.collectedAt)}</td>
          <td class="govuk-table__cell"><a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}/result">Record result</a></td>
        </tr>`;
    }).join('');

    return `
      <h2 class="govuk-heading-m">Samples awaiting a laboratory result</h2>
      ${samples.length === 0 ? '<p class="govuk-body">No samples are currently awaiting a result.</p>' : `
        <table class="govuk-table">
          <thead class="govuk-table__head">
            <tr class="govuk-table__row">
              <th class="govuk-table__header" scope="col">Sample reference</th>
              <th class="govuk-table__header" scope="col">Prisoner</th>
              <th class="govuk-table__header" scope="col">Collected</th>
              <th class="govuk-table__header" scope="col">Action</th>
            </tr>
          </thead>
          <tbody class="govuk-table__body">${awaitingRows}</tbody>
        </table>`}

      <h2 class="govuk-heading-m govuk-!-margin-top-6">Positive results — follow-up required</h2>
      <p class="govuk-body-s">Follow-up tasks after a positive laboratory result are split into <strong>mandatory</strong>, <strong>recommended</strong> and <strong>local</strong>. Mandatory tasks must be complete before the month can be closed.</p>
      ${positives.length === 0 ? '<p class="govuk-body">No positive results are awaiting follow-up.</p>' : `
        <ul class="govuk-list">
          ${positives.map(sm => {
            const sel = D.selectionFor(state, sm.selectionId);
            const p = D.prisonerFor(state, sel.prisonerId);
            const fu = D.followUpFor(state, sel.id);
            const outstandingMandatory = fu.filter(f => f.requirement === 'mandatory' && f.status !== 'completed').length;
            return `
              <li class="govuk-!-margin-bottom-2">
                <a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">${escape(p.displayName)}</a>
               , ${escape(p.prisonNumber)}
               , sample ${escape(sm.reference)}
               , ${outstandingMandatory > 0 ? `<strong class="govuk-tag govuk-tag--red">${outstandingMandatory} mandatory outstanding</strong>` : '<strong class="govuk-tag govuk-tag--green">All mandatory complete</strong>'}
              </li>`;
          }).join('')}
        </ul>`}`;
  }

  /* ---- Shared selection table --------------------------------------- */

  function renderSelectionTable(items, month, listType, opts) {
    if (!items.length) return '<p class="govuk-body">There are no selections in this list.</p>';
    const monthYYYYMM = month.month;
    const activatedReserves = (opts && opts.activatedReserves) || [];
    const simplified = !!(opts && opts.simplified);

    const renderRow = (sel, isActivatedReserve) => {
      const p = D.prisonerFor(state, sel.prisonerId);
      const status = D.statusLabel(sel);
      const lastTested = lastTestedFor(sel.id);
      const releasingThisMonth = D.isReleasingInMonth(p.releaseDate, monthYYYYMM);
      const nameSuffix = isActivatedReserve
        ? `<div><span class="mdt-reserve-flag">Added from reserve list</span></div>`
        : (listType === 'random' && sel.replacementSelectionId
            ? `<div><span class="mdt-reserve-link">Replaced by a reserve</span></div>`
            : '');
      const searchKey = `${p.displayName} ${p.prisonNumber} ${p.location}`.toLowerCase();
      const canRecord = sel.status === 'not-started' || sel.status === 'attempt-required';
      const alreadyTested = sel.status === 'completed' || (sel.status === 'exception' && (sel.exceptionReason || '').toLowerCase() === 'refused');
      let actionCell;
      if (listType === 'reserve') {
        actionCell = '';
      } else if (alreadyTested) {
        actionCell = '<span class="govuk-body-s govuk-!-margin-0">Already tested</span>';
      } else if (canRecord) {
        actionCell = `<a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}/test">Record test</a>`;
      } else {
        actionCell = `<a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Open</a>`;
      }

      let statusForRow = (listType === 'reserve')
        ? (sel.originalSelectionId
            ? { text: 'Activated as reserve', modifier: 'green' }
            : { text: 'Not activated as reserve', modifier: 'grey' })
        : status;

      if (simplified && listType === 'random') {
        // Previous months are closed: a collected sample is effectively a
        // completed test, so only ever show "Tested" or "Exception: X".
        statusForRow = (sel.status === 'completed' || sel.status === 'sample-collected')
          ? { text: 'Tested', modifier: 'green' }
          : statusForRow;
      }

      return `
        <tr class="govuk-table__row" data-search="${escape(searchKey)}">
          <td class="govuk-table__cell" data-sort-value="${escape(p.displayName)}">
            <a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">${escape(p.displayName)}</a>
            ${nameSuffix}
          </td>
          <td class="govuk-table__cell" data-sort-value="${escape(p.prisonNumber)}">${escape(p.prisonNumber)}</td>
          <td class="govuk-table__cell" data-sort-value="${escape(p.location)}">${escape(p.location)}</td>
          <td class="govuk-table__cell" data-sort-value="${escape(p.releaseDate || '')}">
            ${formatDate(p.releaseDate)}
            ${releasingThisMonth ? `<div><span class="mdt-releasing-flag">Releasing this month</span></div>` : ''}
          </td>
          <td class="govuk-table__cell" data-sort-value="${escape(statusForRow.text)}">${tag(statusForRow.text, statusForRow.modifier)}</td>
          ${simplified ? '' : `<td class="govuk-table__cell govuk-!-font-size-16" data-sort-value="${escape(lastTested || '')}">${lastTested ? formatDateTime(lastTested) : 'Not tested before'}</td>`}
          ${(listType === 'reserve' || simplified) ? '' : `<td class="govuk-table__cell">${actionCell}</td>`}
        </tr>`;
    };

    const primaryRows = items.map(sel => renderRow(sel, false)).join('');
    const reserveRows = activatedReserves.map(sel => renderRow(sel, true)).join('');

    const headers = [
      { key: 'name',      label: 'Prisoner' },
      { key: 'number',    label: 'Prison no.' },
      { key: 'location',  label: 'Location' },
      { key: 'release',   label: 'Release date (CRD)' },
      { key: 'status',    label: 'Status' },
      ...(simplified ? [] : [{ key: 'tested', label: 'Last tested' }])
    ].map((h, i) => `
      <th scope="col" class="govuk-table__header">
        <button type="button" class="mdt-sort-btn" data-mdt-sort="${escape(h.key)}" data-mdt-sort-col="${i}" aria-label="Sort by ${escape(h.label)}">
          ${escape(h.label)} <span class="mdt-sort-btn__indicator" aria-hidden="true"></span>
        </button>
      </th>`).join('');

    return `
      <table class="govuk-table mdt-selection-table" data-mdt-table>
        <caption class="govuk-visually-hidden">${escape(listType === 'random' ? 'Random list' : 'Reserve list')} for ${escape(month.label)}</caption>
        <thead class="govuk-table__head">
          <tr class="govuk-table__row">
            ${headers}
            ${(listType === 'reserve' || simplified) ? '' : '<th scope="col" class="govuk-table__header">Action</th>'}
          </tr>
        </thead>
        <tbody class="govuk-table__body" data-mdt-tbody="${listType === 'random' ? 'random-tbody' : 'reserve-tbody'}">${primaryRows}${reserveRows}</tbody>
      </table>`;
  }

  function statTile(label, value, sub, modifier) {
    return `
      <li class="mdt-stat-tile ${modifier ? 'mdt-stat-tile--' + modifier : ''}">
        <p class="mdt-stat-tile__label">${escape(label)}</p>
        <p class="mdt-stat-tile__value">${escape(value)}${sub ? `<span class="mdt-stat-tile__value--sub">${escape(sub)}</span>` : ''}</p>
      </li>`;
  }

  function statCard(label, value, modifier) {
    return `
      <div class="mdt-stat-card ${modifier ? 'mdt-stat-card--' + modifier : ''}" role="listitem">
        <p class="mdt-stat-card__label">${escape(label)}</p>
        <p class="mdt-stat-card__value">${escape(value)}</p>
      </div>`;
  }

  function monthStatusLabel(s) {
    return { 'not-started': 'Not started', 'in-progress': 'In progress', 'ready-to-close': 'Ready to close', 'closed': 'Closed' }[s] || s;
  }
  function monthStatusModifier(s) {
    return { 'not-started': 'grey', 'in-progress': 'blue', 'ready-to-close': 'yellow', 'closed': 'green' }[s] || 'grey';
  }

  /**
   * Look up the most recent selection audit event that represents a test outcome.
   * Used for the "Last tested" column — falls back to the latest audit for the row.
   */
  function lastTestedFor(selectionId) {
    const events = state.auditEvents
      .filter(a => a.entityType === 'selection' && a.entityId === selectionId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return events.length ? events[0].occurredAt : null;
  }


  function lastActionFor(selectionId) {
    const audit = state.auditEvents
      .filter(a => a.entityType === 'selection' && a.entityId === selectionId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return audit.length ? audit[0].occurredAt : null;
  }

  // ---- Awaiting results list (now handled by the tabbed workspace shell) ----
  // The tab route above (`/mdt/:monthId/awaiting-results`) renders both awaiting
  // samples and outstanding follow-up work in one place.

  // ---- Follow-up list -----------------------------------------------------
  route('/mdt/:monthId/follow-up', (params) => {
    // Backwards-compatible redirect — awaiting results tab now includes follow-up.
    navigate(`/mdt/${params.monthId}/awaiting-results`);
    return { title: 'Redirecting…', html: '' };
  });

  // ---- Monthly report -----------------------------------------------------
  route('/mdt/:monthId/report', (params) => {
    const month = D.monthFor(state, params.monthId);
    if (!month) return notFound(params.monthId);
    const report = D.buildMonthlyReport(state, month.id);
    const f = report.figures;
    const def = report.definitions;

    const rowLink = (key, label, value, defText) => `
      <div class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key">${escape(label)}</dt>
        <dd class="govuk-summary-list__value">${escape(String(value))}</dd>
        <dd class="govuk-summary-list__actions">
          <a class="govuk-link" href="#/mdt/${escape(month.id)}/report/breakdown/${escape(key)}">View records</a>
        </dd>
      </div>
      <div class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key" style="font-weight:normal;font-size:14px;color:#505a5f;">How is this calculated?</dt>
        <dd class="govuk-summary-list__value" colspan="2" style="font-size:14px;color:#505a5f;">${escape(defText || '')}</dd>
      </div>`;

    const exceptionsList = Object.entries(f.exceptionsByReason)
      .map(([r, n]) => `<li>${escape(r)}: <strong>${n}</strong></li>`).join('');

    return {
      title: `Monthly report — ${month.label}`,
      breadcrumbs: [{ href: '#/', text: 'MDT' }, { href: `#/mdt/${month.id}`, text: month.label }, { text: 'Monthly report' }],
      html: `
        <h1 class="govuk-heading-xl">Monthly report</h1>
        <p class="govuk-body-l">${escape(month.label)}, every figure is derived from the underlying records.</p>

        <dl class="govuk-summary-list">
          ${rowLink('allocation',     'Monthly allocation',       f.allocation,     def.allocation)}
          ${rowLink('random',         'On the random list',       f.randomListSize, 'Selections created when the random list was generated.')}
          ${rowLink('reservesUsed',   'Reserves used',            f.reservesUsed,   'Reserve-list selections that were activated to replace a random-list selection.')}
          ${rowLink('attempted',      'Attempted',                f.attempted,      def.attempted)}
          ${rowLink('completed',      'Completed',                f.completed,      def.completed)}
          ${rowLink('notCompleted',   'Not completed (exception)',f.notCompleted,   'Random-list selections with status = exception.')}
          ${rowLink('awaiting',       'Awaiting results',         f.awaitingResults, def.awaitingResults)}
          ${rowLink('positive',       'Positive',                 f.positive,       'Samples with a positive laboratory result.')}
          ${rowLink('negative',       'Negative',                 f.negative,       'Samples with a negative laboratory result.')}
          ${rowLink('inconclusive',   'Inconclusive',             f.inconclusive,   'Samples returned as inconclusive by the laboratory.')}
          ${rowLink('rejected',       'Rejected',                 f.rejected,       'Samples rejected by the laboratory.')}
        </dl>

        <div class="govuk-grid-row">
          <div class="govuk-grid-column-one-half">
            <div class="mdt-stat-card">
              <p class="mdt-stat-card__label">Completion rate</p>
              <p class="mdt-stat-card__value">${formatPercent(f.completionRate)}</p>
              <p class="govuk-body-s govuk-!-margin-bottom-0">${escape(def.completionRate)}</p>
            </div>
          </div>
          <div class="govuk-grid-column-one-half">
            <div class="mdt-stat-card">
              <p class="mdt-stat-card__label">Positive rate</p>
              <p class="mdt-stat-card__value">${formatPercent(f.positiveRate)}</p>
              <p class="govuk-body-s govuk-!-margin-bottom-0">${escape(def.positiveRate)}</p>
            </div>
          </div>
        </div>

        <h2 class="govuk-heading-m govuk-!-margin-top-6">Exceptions by reason</h2>
        ${exceptionsList ? `<ul class="govuk-list">${exceptionsList}</ul>` : '<p class="govuk-body">No exceptions recorded.</p>'}

        <p class="govuk-body govuk-!-margin-top-6">
          <a class="govuk-link" href="javascript:window.print()">Print this report</a>
        </p>
      `
    };
  });

  // Report drill-down
  route('/mdt/:monthId/report/breakdown/:key', (params) => {
    const month = D.monthFor(state, params.monthId);
    if (!month) return notFound(params.monthId);
    const report = D.buildMonthlyReport(state, month.id);
    const keyMap = {
      allocation:  null,
      random:      report.breakdown.randomIds,
      reservesUsed: report.breakdown.reservesUsedIds,
      attempted:   report.breakdown.attemptedIds,
      completed:   report.breakdown.completedIds,
      notCompleted: report.breakdown.notCompletedIds,
      awaiting:    report.breakdown.awaitingResultIds,
      positive:    report.breakdown.positiveIds,
      negative:    report.breakdown.negativeIds,
      inconclusive: report.breakdown.inconclusiveIds,
      rejected:    report.breakdown.rejectedIds
    };
    const ids = keyMap[params.key];
    const items = (ids || []).map(id => D.selectionFor(state, id)).filter(Boolean);
    return {
      title: `${params.key} — records`,
      breadcrumbs: [
        { href: '#/', text: 'MDT' },
        { href: `#/mdt/${month.id}`, text: month.label },
        { href: `#/mdt/${month.id}/report`, text: 'Monthly report' },
        { text: params.key }
      ],
      html: `
        <h1 class="govuk-heading-xl">Records — ${escape(params.key)}</h1>
        ${ids == null ? '<p class="govuk-body">This figure is supplied by an upstream source and does not have a drill-down.</p>' :
          items.length === 0 ? '<p class="govuk-body">No records.</p>' : `
          <ul class="mdt-drilldown-list">
            ${items.map(s => {
              const p = D.prisonerFor(state, s.prisonerId);
              return `<li><a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(s.id)}">${escape(p.displayName)}</a>, ${escape(p.prisonNumber)}, list pos ${s.listPosition}</li>`;
            }).join('')}
          </ul>`}
      `
    };
  });

  // ---- Selection detail ---------------------------------------------------
  route('/mdt/:monthId/selection/:selectionId', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const samples = D.samplesFor(state, sel.id);
    const fu = D.followUpFor(state, sel.id);
    const status = D.statusLabel(sel);
    const priority = D.priorityFor(sel, p, state.now);
    const history = testHistoryFor(state, p.id);

    const linked = sel.replacementSelectionId
      ? D.selectionFor(state, sel.replacementSelectionId)
      : (sel.originalSelectionId ? D.selectionFor(state, sel.originalSelectionId) : null);
    const linkedP = linked ? D.prisonerFor(state, linked.prisonerId) : null;

    // Determine primary action
    const alreadyTested = sel.status === 'completed' || (sel.status === 'exception' && (sel.exceptionReason || '').toLowerCase() === 'refused');
    let primary = null;
    if (!alreadyTested && (sel.status === 'not-started' || sel.status === 'attempt-required' || sel.status === 'priority')) {
      primary = { href: `#/mdt/${month.id}/selection/${sel.id}/test`, label: 'Record test' };
    }
    if (sel.status === 'exception' && !sel.replacementSelectionId) {
      primary = { href: `#/mdt/${month.id}/selection/${sel.id}/use-reserve`, label: 'Use a reserve' };
    }

    return {
      title: `${p.displayName} — MDT record`,
      breadcrumbs: [
        { href: '#/', text: 'MDT' },
        { href: `#/mdt/${month.id}`, text: month.label },
        { href: `#/mdt/${month.id}/${sel.listType === 'random' ? 'random-list' : 'reserve-list'}`, text: sel.listType === 'random' ? 'Random list' : 'Reserve list' },
        { text: p.displayName }
      ],
      html: `
        <span class="govuk-caption-xl">${escape(sel.listType === 'random' ? 'Random list' : 'Reserve list')}, position ${sel.listPosition}</span>
        <h1 class="govuk-heading-xl">${escape(p.displayName)}</h1>
        <p class="govuk-body">
          ${tag(status.text, status.modifier)}
          ${priority.code !== 'standard' ? `<span class="mdt-priority mdt-priority--${priority.code}" title="${escape(priority.reason)}">${escape(priority.label)}</span>` : ''}
        </p>

        ${linked ? `
        <div class="mdt-selection-summary govuk-!-margin-bottom-4">
          <dl class="govuk-summary-list govuk-summary-list--no-border govuk-!-margin-bottom-0">
            <div class="govuk-summary-list__row">
              <dt class="govuk-summary-list__key">${sel.replacementSelectionId ? 'Replaced by' : 'Replaces'}</dt>
              <dd class="govuk-summary-list__value">
                <a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(linked.id)}">${escape(linkedP.displayName)} (${escape(linked.id)})</a>
              </dd>
            </div>
          </dl>
        </div>` : ''}

        <p class="govuk-body">
          <span class="govuk-!-font-weight-bold">Current activity today:</span> ${escape(p.currentActivity || 'No activity scheduled')}
        </p>

        ${alreadyTested
          ? `<p class="govuk-body govuk-!-font-weight-bold">Already tested</p>`
          : (primary ? `<p class="govuk-body"><a class="govuk-button" data-module="govuk-button" href="${escape(primary.href)}">${escape(primary.label)}</a></p>` : '')}

        <div class="govuk-tabs" data-module="govuk-tabs">
          <h2 class="govuk-tabs__title">Contents</h2>
          <ul class="govuk-tabs__list">
            <li class="govuk-tabs__list-item govuk-tabs__list-item--selected">
              <a class="govuk-tabs__tab" aria-selected="true" href="#panel-prisoner-details">Prisoner details</a>
            </li>
            <li class="govuk-tabs__list-item">
              <a class="govuk-tabs__tab" aria-selected="false" href="#panel-drug-test-history">Drug test history</a>
            </li>
          </ul>

          <div class="govuk-tabs__panel" id="panel-prisoner-details">
            <h2 class="govuk-heading-l">Prisoner details</h2>
            <table class="govuk-table">
              <caption class="govuk-visually-hidden">Prisoner details for ${escape(p.displayName)}</caption>
              <tbody class="govuk-table__body">
                <tr class="govuk-table__row">
                  <th scope="row" class="govuk-table__header">Prison number</th>
                  <td class="govuk-table__cell">${escape(p.prisonNumber)}</td>
                </tr>
                <tr class="govuk-table__row">
                  <th scope="row" class="govuk-table__header">Location</th>
                  <td class="govuk-table__cell">${escape(p.location)}</td>
                </tr>
                <tr class="govuk-table__row">
                  <th scope="row" class="govuk-table__header">Release date</th>
                  <td class="govuk-table__cell">${formatDate(p.releaseDate)}</td>
                </tr>
              </tbody>
            </table>

            ${renderSamples(samples)}
            ${renderFollowUps(fu, month.id, sel.id)}
          </div>

          <div class="govuk-tabs__panel govuk-tabs__panel--hidden" id="panel-drug-test-history">
            <h2 class="govuk-heading-l">Drug test history</h2>
            ${history.length === 0 ? '<p class="govuk-body">No previous test history recorded.</p>' : `
              <table class="govuk-table">
                <caption class="govuk-visually-hidden">Drug test history for ${escape(p.displayName)}</caption>
                <thead class="govuk-table__head">
                  <tr class="govuk-table__row">
                    <th scope="col" class="govuk-table__header">Date</th>
                    <th scope="col" class="govuk-table__header">Reporting month</th>
                    <th scope="col" class="govuk-table__header">Result</th>
                  </tr>
                </thead>
                <tbody class="govuk-table__body">
                  ${history.map(h => `
                    <tr class="govuk-table__row">
                      <td class="govuk-table__cell">${h.date ? formatDateTime(h.date) : '(not tested yet)'}</td>
                      <td class="govuk-table__cell">${escape(h.monthLabel)}</td>
                      <td class="govuk-table__cell">${tag(h.label, h.modifier)}</td>
                    </tr>`).join('')}
                </tbody>
              </table>`}
          </div>
        </div>
      `
    };
  });

  /**
   * A prisoner's previous test outcomes across all reporting months, for the
   * "Drug test history" tab. Tags echo the ones used in the main list tables.
   */
  function testHistoryFor(state, prisonerId) {
    const cm = D.currentMonth(state);
    return state.selections
      .filter(s => s.prisonerId === prisonerId)
      .map(s => {
        const month = D.monthFor(state, s.reportingMonthId);
        if (s.status === 'completed') {
          return { date: lastTestedFor(s.id), label: 'Tested', modifier: 'green', monthLabel: month ? month.label : '' };
        }
        if (s.status === 'exception' && (s.exceptionReason || '').toLowerCase() === 'refused') {
          return { date: lastTestedFor(s.id), label: 'Refused test', modifier: 'red', monthLabel: month ? month.label : '' };
        }
        if (cm && s.reportingMonthId === cm.id) {
          return { date: null, label: 'Not started', modifier: 'grey', monthLabel: '(Current month)' };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  function renderSamples(samples) {
    if (!samples.length) return '';
    return `
      <h2 class="govuk-heading-m govuk-!-margin-top-6">Samples</h2>
      <ul class="govuk-list">
        ${samples.map(sm => {
          const result = state.testResults.find(r => r.sampleId === sm.id);
          return `
            <li>
              <strong>${escape(sm.reference)}</strong>, ${escape(sm.testType)}, collected ${formatDateTime(sm.collectedAt)}
              <br>
              Status: ${tag(sm.status.replace('-', ' '), sm.status === 'awaiting-result' ? 'yellow' : 'blue')}
              ${result ? `, Result: ${tag(result.outcome, result.outcome === 'positive' ? 'red' : (result.outcome === 'negative' ? 'green' : 'grey'))} (recorded ${formatDateTime(result.recordedAt)})` : ''}
            </li>`;
        }).join('')}
      </ul>`;
  }
  function renderFollowUps(fu, monthId, selectionId) {
    if (!fu.length) return '';
    const groups = ['mandatory', 'recommended', 'local'];
    return `
      <h2 class="govuk-heading-m govuk-!-margin-top-6">Follow-up actions</h2>
      ${groups.map(g => {
        const items = fu.filter(x => x.requirement === g);
        if (!items.length) return '';
        const label = g[0].toUpperCase() + g.slice(1);
        return `
          <div class="mdt-followup-group mdt-followup-group--${g}">
            <span class="mdt-followup-group__label">${escape(label)}</span>
            <ul class="govuk-list">
              ${items.map(i => `
                <li>
                  ${escape(i.actionType)}
                  ${i.status === 'completed'
                    ? `<br>${tag('Completed', 'green')} ${i.completedAt ? ', ' + formatDateTime(i.completedAt) : ''}`
                    : `<br>${tag('Not started', 'grey')}
                        <form data-form-action="complete-followup" style="display:inline-block;margin-left:10px;">
                          <input type="hidden" name="followUpId" value="${escape(i.id)}">
                          <button class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0">Mark done</button>
                        </form>`}
                </li>`).join('')}
            </ul>
          </div>`;
      }).join('')}
    `;
  }

  // ---- Record test — step 1: was the test completed? --------------------
  route('/mdt/:monthId/selection/:selectionId/test', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const errors = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'test-step1') ? window.__mdtLastErrors.errors : [];
    const values = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'test-step1') ? window.__mdtLastErrors.values : {};
    return {
      title: 'Record test',
      breadcrumbs: [
        { href: '#/', text: 'MDT' },
        { href: `#/mdt/${month.id}`, text: month.label },
        { href: `#/mdt/${month.id}/selection/${sel.id}`, text: p.displayName },
        { text: 'Record test' }
      ],
      html: `
        <span class="govuk-caption-l">${escape(p.displayName)}, ${escape(p.prisonNumber)}, ${escape(p.location)}</span>
        <h1 class="govuk-heading-xl">Record test</h1>

        ${errorSummary(errors)}

        <form data-form-action="record-test-step1" novalidate>
          <div class="govuk-form-group ${errors.some(e => e.field === 'completed') ? 'govuk-form-group--error' : ''}">
            <fieldset class="govuk-fieldset">
              <legend class="govuk-fieldset__legend"><h3 class="govuk-fieldset__heading govuk-heading-s">Was the test completed?</h3></legend>
              <div class="govuk-hint">If yes, you will confirm the test is complete and await the laboratory result by email. If no, you will record the reason now and the next reserve will be added automatically.</div>
              ${fieldErrorMsg(errors, 'completed')}
              <div class="govuk-radios" data-module="govuk-radios">
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="completed-yes" name="completed" type="radio" value="yes"${values.completed === 'yes' ? ' checked' : ''}>
                  <label class="govuk-label govuk-radios__label" for="completed-yes">Yes — test completed</label>
                </div>
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="completed-no" name="completed" type="radio" value="no"${values.completed === 'no' ? ' checked' : ''}>
                  <label class="govuk-label govuk-radios__label" for="completed-no">No — could not complete</label>
                </div>
              </div>
            </fieldset>
          </div>

          <div class="govuk-form-group ${errors.some(e => e.field === 'attemptedDate') ? 'govuk-form-group--error' : ''}">
            <h3 class="govuk-heading-s">When was the test attempted?</h3>
            <div class="govuk-hint" id="attempted-date-hint">For example, 27 7 2026</div>
            ${fieldErrorMsg(errors, 'attemptedDate')}
            <input class="govuk-input govuk-input--width-10" id="field-attempted-date" name="attemptedDate" type="date" aria-describedby="attempted-date-hint" value="${escape(values.attemptedDate || defaultDatetime().slice(0, 10))}">
          </div>

          <div class="govuk-button-group">
            <button class="govuk-button" data-module="govuk-button">Continue</button>
            <a class="govuk-link" href="#/mdt/${escape(month.id)}/random-list">Cancel and go back</a>
          </div>
        </form>
      `
    };
  });

  // ---- Record test — reason (not completed) -------------------------------
  route('/mdt/:monthId/selection/:selectionId/test/reason', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const errors = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'test-reason') ? window.__mdtLastErrors.errors : [];
    const values = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'test-reason') ? window.__mdtLastErrors.values : {};
    const reasons = ['Refused', 'Unable to provide a sample', 'Temporarily unavailable', 'At court', 'In healthcare', 'Segregated', 'Transferred out', 'Released', 'Other'];
    return {
      title: 'Record reason',
      breadcrumbs: [
        { href: '#/', text: 'MDT' },
        { href: `#/mdt/${month.id}`, text: month.label },
        { href: `#/mdt/${month.id}/selection/${sel.id}`, text: p.displayName },
        { href: `#/mdt/${month.id}/selection/${sel.id}/test`, text: 'Record test' },
        { text: 'Record reason' }
      ],
      html: `
        <span class="govuk-caption-l">${escape(p.displayName)}, ${escape(p.prisonNumber)}, ${escape(p.location)}</span>
        <h1 class="govuk-heading-xl">Record reason</h1>

        ${errorSummary(errors)}

        <form data-form-action="record-test-reason" novalidate>
          <div class="govuk-form-group ${errors.some(e => e.field === 'reason') ? 'govuk-form-group--error' : ''}">
            <label class="govuk-label govuk-label--m" for="reason">Why could the test not be completed?</label>
            <p class="govuk-hint">The next available reserve will be added to this month's list automatically. If the prisoner refused a test, they will also need adjudication.</p>
            ${fieldErrorMsg(errors, 'reason')}
            <select class="govuk-select" id="reason" name="reason">
              <option value="">Choose a reason</option>
              ${reasons.map(r => `<option value="${escape(r)}"${values.reason === r ? ' selected' : ''}>${escape(r)}</option>`).join('')}
            </select>
          </div>

          <div class="govuk-button-group">
            <button class="govuk-button" data-module="govuk-button">Save reason</button>
            <a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}/test">Back</a>
          </div>
        </form>
      `
    };
  });

  // ---- Record test — step 3: confirmation --------------------------------
  route('/mdt/:monthId/selection/:selectionId/test/confirmation', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const reserveSel = sel.replacementSelectionId ? D.selectionFor(state, sel.replacementSelectionId) : null;
    const reserveP = reserveSel ? D.prisonerFor(state, reserveSel.prisonerId) : null;
    const isRefusal = sel.status === 'exception' && (sel.exceptionReason || '').toLowerCase() === 'refused';
    const needsAdjudication = isRefusal;

    let panel;
    let feedback = '';
    if (sel.status === 'completed') {
      panel = `
        <div class="govuk-panel govuk-panel--confirmation">
          <h1 class="govuk-panel__title">Test recorded</h1>
          <div class="govuk-panel__body">${escape(p.displayName)}'s test has been completed</div>
        </div>`;
      feedback = `
        <p class="govuk-body">${escape(p.displayName)}'s test has been recorded as completed for ${escape(month.label)}.</p>
        <p class="govuk-body">You will need to await an email from the testing team to find out the result. No further action is required from you until then.</p>`;
    } else if (sel.status === 'exception') {
      panel = `
        <div class="govuk-panel govuk-panel--confirmation">
          <h1 class="govuk-panel__title">Reason recorded</h1>
          <div class="govuk-panel__body">${escape(p.displayName)}</div>
        </div>`;
      const reserveLine = reserveSel
        ? `<p class="govuk-body"><strong>${escape(reserveP.displayName)}</strong> (${escape(reserveP.prisonNumber)}, ${escape(reserveP.location)}) has been added to this month's random list, replacing ${escape(p.displayName)}.</p>`
        : `<p class="govuk-body">No reserves are available to replace ${escape(p.displayName)} this month.</p>`;
      const refusalLine = isRefusal
        ? `<p class="govuk-body">${escape(p.displayName)} refused the test — refusal is a chargeable offence and requires adjudication.</p>`
        : '';
      feedback = `
        <p class="govuk-body">${escape(p.displayName)} has been recorded as unable to test this month because ${escape(reasonToPlainText(sel.exceptionReason))}.</p>
        ${reserveLine}
        ${refusalLine}`;
    } else {
      panel = `<p class="govuk-body">Nothing to confirm.</p>`;
    }

    const adjudicationLink = needsAdjudication
      ? `<a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}" data-mdt-dummy="adjudication">Continue to adjudication service</a>`
      : '';

    return {
      title: 'Confirmation',
      breadcrumbs: [
        { href: '#/', text: 'MDT' },
        { href: `#/mdt/${month.id}`, text: month.label },
        { text: 'Confirmation' }
      ],
      html: `
        ${panel}

        ${feedback}

        <div class="govuk-button-group govuk-!-margin-top-4">
          <a class="govuk-button" data-module="govuk-button" href="#/mdt/${escape(month.id)}/random-list">Return to the random list</a>
          ${adjudicationLink}
        </div>
      `
    };
  });

  // ---- Record test attempt ------------------------------------------------
  route('/mdt/:monthId/selection/:selectionId/attempt', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const errors = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'attempt') ? window.__mdtLastErrors.errors : [];
    return {
      title: 'Record test attempt',
      breadcrumbs: [
        { href: '#/', text: 'MDT' },
        { href: `#/mdt/${month.id}`, text: month.label },
        { href: `#/mdt/${month.id}/selection/${sel.id}`, text: p.displayName },
        { text: 'Record attempt' }
      ],
      html: `
        ${errorSummary(errors)}
        <span class="govuk-caption-xl">${escape(p.displayName)}, ${escape(p.prisonNumber)}</span>
        <h1 class="govuk-heading-xl">Record test attempt</h1>

        <form data-form-action="record-attempt" novalidate>
          <div class="govuk-form-group">
            <fieldset class="govuk-fieldset">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--m">What happened?</legend>
              <p class="govuk-hint">Choose one outcome. Reasons come from a prototype policy list (see <a class="govuk-link" href="../ASSUMPTIONS.md">assumptions</a>).</p>
              <div class="govuk-radios" data-module="govuk-radios">
                ${D.OUTCOMES.map((o, i) => `
                  <div class="govuk-radios__item">
                    <input class="govuk-radios__input" id="field-outcome${i === 0 ? '' : '-' + i}" name="outcome" type="radio" value="${escape(o)}" required>
                    <label class="govuk-label govuk-radios__label" for="field-outcome${i === 0 ? '' : '-' + i}">${escape(o)}</label>
                  </div>`).join('')}
              </div>
            </fieldset>
          </div>

          <div class="govuk-form-group">
            <label class="govuk-label" for="field-notes">Reason or notes (optional)</label>
            <div class="govuk-hint">Required when the outcome is "Other" or when policy requires a specific reason.</div>
            <textarea class="govuk-textarea" id="field-notes" name="notes" rows="3"></textarea>
          </div>

          <button class="govuk-button" data-module="govuk-button">Continue</button>
          <a class="govuk-link govuk-!-margin-left-3" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Cancel</a>
        </form>
      `
    };
  });

  // ---- Record sample ------------------------------------------------------
  route('/mdt/:monthId/selection/:selectionId/sample', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const errs = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'sample') ? window.__mdtLastErrors : { errors: [], values: {} };
    const v = errs.values || {};
    const fieldError = (name) => (errs.errors || []).find(e => e.field === name);
    const err = (name) => fieldError(name) ? `<p class="govuk-error-message" id="err-${name}"><span class="govuk-visually-hidden">Error:</span> ${escape(fieldError(name).message)}</p>` : '';
    const grp = (name) => fieldError(name) ? 'govuk-form-group govuk-form-group--error' : 'govuk-form-group';

    return {
      title: 'Record sample information',
      breadcrumbs: [
        { href: '#/', text: 'MDT' },
        { href: `#/mdt/${month.id}`, text: month.label },
        { href: `#/mdt/${month.id}/selection/${sel.id}`, text: p.displayName },
        { text: 'Sample information' }
      ],
      html: `
        ${errorSummary(errs.errors)}
        <span class="govuk-caption-xl">${escape(p.displayName)}, ${escape(p.prisonNumber)}</span>
        <h1 class="govuk-heading-xl">Sample information</h1>

        <form data-form-action="record-sample" novalidate autocomplete="off">
          <div class="${grp('reference')}">
            <label class="govuk-label" for="field-reference">Sample reference number <span class="mdt-required-hint">*</span></label>
            <div class="govuk-hint">Enter the reference exactly as it appears on the sample. References must be unique.</div>
            ${err('reference')}
            <input class="govuk-input govuk-input--width-20" id="field-reference" name="reference" type="text" value="${escape(v.reference || '')}" required>
          </div>

          <div class="${grp('collectedAt')}">
            <label class="govuk-label" for="field-collectedAt">Collection date and time <span class="mdt-required-hint">*</span></label>
            ${err('collectedAt')}
            <input class="govuk-input" id="field-collectedAt" name="collectedAt" type="datetime-local" value="${escape(v.collectedAt || defaultDatetime())}" required>
          </div>

          <div class="${grp('testType')}">
            <label class="govuk-label" for="field-testType">Test type <span class="mdt-required-hint">*</span></label>
            ${err('testType')}
            <select class="govuk-select" id="field-testType" name="testType" required>
              <option value="">Choose</option>
              <option value="Random MDT (urine)" ${v.testType === 'Random MDT (urine)' ? 'selected' : ''}>Random MDT (urine)</option>
              <option value="Random MDT (oral fluid)" ${v.testType === 'Random MDT (oral fluid)' ? 'selected' : ''}>Random MDT (oral fluid)</option>
            </select>
          </div>

          <div class="${grp('confirm')}">
            <div class="govuk-checkboxes__item">
              <input class="govuk-checkboxes__input" id="field-confirm" name="confirm" type="checkbox" value="yes" required ${v.confirm ? 'checked' : ''}>
              <label class="govuk-label govuk-checkboxes__label" for="field-confirm">
                I confirm the sample details above match the physical sample
              </label>
            </div>
            ${err('confirm')}
          </div>

          <button class="govuk-button" data-module="govuk-button">Save sample</button>
          <a class="govuk-link govuk-!-margin-left-3" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Cancel</a>
        </form>
      `
    };
  });

  function defaultDatetime() {
    // "YYYY-MM-DDTHH:MM"
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  // ---- Use a reserve ------------------------------------------------------
  route('/mdt/:monthId/selection/:selectionId/use-reserve', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const available = D.reserves(state, month.id).filter(r => !r.originalSelectionId);
    const next = available[0];
    const errs = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'reserve') ? window.__mdtLastErrors : { errors: [], values: {} };
    const v = errs.values || {};

    if (!available.length) {
      return {
        title: 'No reserves available',
        breadcrumbs: [{ href: '#/', text: 'MDT' }, { href: `#/mdt/${month.id}`, text: month.label }, { text: 'Use a reserve' }],
        html: `
          <h1 class="govuk-heading-xl">No reserves available</h1>
          <p class="govuk-body">All reserves for ${escape(month.label)} have already been used.</p>
          <p class="govuk-body"><a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Return to record</a></p>`
      };
    }

    return {
      title: 'Use a reserve',
      breadcrumbs: [
        { href: '#/', text: 'MDT' },
        { href: `#/mdt/${month.id}`, text: month.label },
        { href: `#/mdt/${month.id}/selection/${sel.id}`, text: p.displayName },
        { text: 'Use a reserve' }
      ],
      html: `
        ${errorSummary(errs.errors)}
        <span class="govuk-caption-xl">${escape(p.displayName)}, ${escape(p.prisonNumber)}</span>
        <h1 class="govuk-heading-xl">Use a reserve</h1>

        <p class="govuk-body">
          Reserves are used when a random-list selection cannot be tested. The reserve is proposed
          in list order (top of list first). You must record a reason on the original record and
          confirm the reserve before the substitution is saved.
        </p>

        <form data-form-action="use-reserve" novalidate>
          <div class="govuk-form-group">
            <label class="govuk-label govuk-label--m" for="field-reason">Reason for using a reserve <span class="mdt-required-hint">*</span></label>
            <div class="govuk-hint">This is written to the audit history on both records and cannot be edited later.</div>
            <textarea class="govuk-textarea" id="field-reason" name="reason" rows="3" required>${escape(v.reason || (sel.exceptionReason || ''))}</textarea>
          </div>

          <div class="govuk-form-group">
            <fieldset class="govuk-fieldset">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--m">Confirm the next reserve</legend>
              <p class="govuk-hint">Reserves are proposed in list order. Selecting a lower reserve requires a policy override (not shown in this prototype).</p>
              <div class="govuk-radios">
                ${available.map((r, i) => {
                  const rp = D.prisonerFor(state, r.prisonerId);
                  return `
                    <div class="govuk-radios__item">
                      <input class="govuk-radios__input" id="field-reserveId${i === 0 ? '' : '-' + i}" name="reserveId" type="radio" value="${escape(r.id)}" ${i === 0 && !v.reserveId ? 'checked' : ''} ${v.reserveId === r.id ? 'checked' : ''}>
                      <label class="govuk-label govuk-radios__label" for="field-reserveId${i === 0 ? '' : '-' + i}">
                        Reserve ${r.listPosition} — ${escape(rp.displayName)} <span class="govuk-hint govuk-!-font-size-16">${escape(rp.prisonNumber)}</span>
                      </label>
                    </div>`;
                }).join('')}
              </div>
            </fieldset>
          </div>

          <button class="govuk-button" data-module="govuk-button">Confirm reserve</button>
          <a class="govuk-link govuk-!-margin-left-3" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Cancel</a>
        </form>
      `
    };
  });

  // ---- Record result ------------------------------------------------------
  route('/mdt/:monthId/selection/:selectionId/result', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const sample = D.samplesFor(state, sel.id).find(sm => sm.status === 'awaiting-result');
    if (!sample) {
      return {
        title: 'No sample awaiting result',
        breadcrumbs: [{ href: '#/', text: 'MDT' }, { href: `#/mdt/${month.id}`, text: month.label }, { text: 'Result' }],
        html: `
          <h1 class="govuk-heading-xl">No sample is awaiting a result</h1>
          <p class="govuk-body">This record does not have a sample currently awaiting a laboratory result.</p>
          <p class="govuk-body"><a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Return to record</a></p>`
      };
    }
    const errs = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'result') ? window.__mdtLastErrors.errors : [];
    return {
      title: 'Record laboratory result',
      breadcrumbs: [
        { href: '#/', text: 'MDT' },
        { href: `#/mdt/${month.id}`, text: month.label },
        { href: `#/mdt/${month.id}/selection/${sel.id}`, text: p.displayName },
        { text: 'Record result' }
      ],
      html: `
        ${errorSummary(errs)}
        <span class="govuk-caption-xl">${escape(p.displayName)}, ${escape(p.prisonNumber)}, sample ${escape(sample.reference)}</span>
        <h1 class="govuk-heading-xl">Record laboratory result</h1>

        <form data-form-action="record-result" novalidate>
          <div class="govuk-form-group">
            <fieldset class="govuk-fieldset">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--m">Result</legend>
              <div class="govuk-radios" data-module="govuk-radios">
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="field-outcome" name="outcome" type="radio" value="negative" required>
                  <label class="govuk-label govuk-radios__label" for="field-outcome">Negative</label>
                </div>
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="field-outcome-1" name="outcome" type="radio" value="positive">
                  <label class="govuk-label govuk-radios__label" for="field-outcome-1">Positive</label>
                  <div class="govuk-hint govuk-radios__hint">Recording a positive result will create the required follow-up task list. It will not automatically place the prisoner on report.</div>
                </div>
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="field-outcome-2" name="outcome" type="radio" value="inconclusive">
                  <label class="govuk-label govuk-radios__label" for="field-outcome-2">Inconclusive</label>
                </div>
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="field-outcome-3" name="outcome" type="radio" value="rejected">
                  <label class="govuk-label govuk-radios__label" for="field-outcome-3">Sample rejected by laboratory</label>
                </div>
              </div>
            </fieldset>
          </div>
          <button class="govuk-button" data-module="govuk-button">Save result</button>
          <a class="govuk-link govuk-!-margin-left-3" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Cancel</a>
        </form>
      `
    };
  });

  function renderContainedMonthView(month) {
    const rand = D.random(state, month.id);
    const rsv = D.reserves(state, month.id);
    return {
      title: `${month.label} — random list`,
      breadcrumbs: [{ href: '#/', text: 'MDT' }, { href: '#/mdt/previous-months', text: 'Previous months' }, { text: month.label }],
      html: `
        <div class="mdt-contained-view">
          <div class="mdt-contained-view__header">
            <span class="govuk-caption-xl">${escape(state.establishment.name)}</span>
            <h1 class="govuk-heading-xl govuk-!-margin-bottom-2">
              ${escape(month.label)}
              ${tag(monthStatusLabel(month.status), monthStatusModifier(month.status))}
            </h1>
            <p class="govuk-body">
              <a class="govuk-link" href="#/mdt/previous-months">Back to previous months</a>
            </p>
            <button type="button" class="govuk-button govuk-button--secondary" data-mdt-print="${escape(month.id)}">
              Print testing list
            </button>
          </div>
          ${renderOrderingDetails(month, rand, rsv)}
          ${contentRandomList(month, rand, { simplified: true })}
          ${renderPrintableLists(month, rand, rsv)}
        </div>
      `
    };
  }


  function notFound(id) {
    return {
      title: 'Record not found',
      breadcrumbs: [{ href: '#/', text: 'MDT' }, { text: 'Not found' }],
      html: `<h1 class="govuk-heading-xl">Record not found</h1><p class="govuk-body">No record could be found for <code>${escape(id)}</code>.</p>`
    };
  }

  /* =====================================================================
   * Research mode (Phase 9)
   * ===================================================================== */

  function renderResearchControls() {
    const container = $('#research-controls');
    container.innerHTML = `
      <div class="govuk-form-group">
        <label class="govuk-label" for="research-month">Prototype "current month"</label>
        <select class="govuk-select" id="research-month">
          ${state.reportingMonths.map(m => `<option value="${escape(m.id)}" ${m.status === 'in-progress' ? 'selected' : ''}>${escape(m.label)} (${escape(m.status)})</option>`).join('')}
        </select>
      </div>

      <button class="govuk-button" id="research-set-month">Make selected month current</button>

      <hr class="govuk-section-break govuk-section-break--visible">

      <p class="govuk-body-s">Scenario shortcuts</p>
      <ul class="govuk-list">
        <li><a class="govuk-link" href="#/mdt/m-2026-07/selection/s-07-r-1/attempt">Scenario 2 — imminent release (Alfie Solomons)</a></li>
        <li><a class="govuk-link" href="#/mdt/m-2026-07/selection/s-07-r-8/attempt">Scenario 3 — unavailable prisoner (Isaiah Jesus)</a></li>
        <li><a class="govuk-link" href="#/mdt/m-2026-07/awaiting-results">Scenario 4 — record a laboratory result</a></li>
        <li><a class="govuk-link" href="#/mdt/m-2026-07/report">Scenario 5 — complete monthly reporting</a></li>
        <li><a class="govuk-link" href="#/mdt/m-2026-06">Scenario 6 — resolve a previous-month item</a></li>
      </ul>

      <hr class="govuk-section-break govuk-section-break--visible">

      <button class="govuk-button govuk-button--warning" id="research-reset">Reset all fictional data</button>
      <p class="govuk-body-s">Clears every change made in this session and restores the seed dataset.</p>

      <hr class="govuk-section-break govuk-section-break--visible">

      <details class="govuk-details" data-module="govuk-details">
        <summary class="govuk-details__summary"><span class="govuk-details__summary-text">Simulate a delayed laboratory result</span></summary>
        <div class="govuk-details__text">
          <p class="govuk-body-s">Choose an awaiting sample and record its result to simulate the lab response.</p>
          ${(function () {
            const awaiting = state.samples.filter(s => s.status === 'awaiting-result');
            if (!awaiting.length) return '<p class="govuk-body-s">No samples currently awaiting a result.</p>';
            return `<ul class="govuk-list">${awaiting.map(sm => {
              const sel = D.selectionFor(state, sm.selectionId);
              return `<li><a class="govuk-link" href="#/mdt/${escape(sel.reportingMonthId)}/selection/${escape(sel.id)}/result">${escape(sm.reference)}</a></li>`;
            }).join('')}</ul>`;
          })()}
        </div>
      </details>
    `;
    $('#research-reset').addEventListener('click', () => {
      if (window.confirm('Reset all prototype data? This cannot be undone.')) {
        resetToFixtures();
        navigate('/');
      }
    });
    $('#research-set-month').addEventListener('click', () => {
      const newCurrentId = $('#research-month').value;
      mutate((draft) => {
        draft.reportingMonths.forEach(m => {
          if (m.id === newCurrentId) m.status = 'in-progress';
          else if (m.status === 'in-progress') m.status = 'ready-to-close';
        });
        return {
          entityType: 'reportingMonth', entityId: newCurrentId,
          action: 'Facilitator set current month',
          previousState: null,
          newState: { status: 'in-progress' }
        };
      });
      navigate(`/mdt/${newCurrentId}`);
    });
  }

  function wireResearchToggle() {
    const toggle = $('#research-toggle');
    const panel = $('#research-panel');
    toggle.addEventListener('click', () => {
      const open = !panel.hidden;
      panel.hidden = open;
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (!open) renderResearchControls();
    });
  }

  /* =====================================================================
   * Interactive list features (search, sort, conditional reveal)
   * ===================================================================== */

  function wireListInteractions(root) {
    // Print testing list — shows the hidden .mdt-print-only lists via @media print.
    root.querySelectorAll('[data-mdt-print]').forEach(btn => {
      btn.addEventListener('click', () => window.print());
    });

    // Tabs (prisoner MDT history page) — minimal GOV.UK-style tab behaviour.
    root.querySelectorAll('.govuk-tabs').forEach(tabsEl => {
      const tabLinks = Array.from(tabsEl.querySelectorAll('.govuk-tabs__tab'));
      tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href').slice(1);
          tabLinks.forEach(l => {
            l.setAttribute('aria-selected', 'false');
            l.closest('.govuk-tabs__list-item').classList.remove('govuk-tabs__list-item--selected');
          });
          tabsEl.querySelectorAll('.govuk-tabs__panel').forEach(p => p.classList.add('govuk-tabs__panel--hidden'));
          link.setAttribute('aria-selected', 'true');
          link.closest('.govuk-tabs__list-item').classList.add('govuk-tabs__list-item--selected');
          const panel = tabsEl.querySelector(`#${targetId}`);
          if (panel) panel.classList.remove('govuk-tabs__panel--hidden');
        });
      });
    });

    // Search: filter tbody rows by `data-search` attribute
    root.querySelectorAll('input[data-mdt-search]').forEach(input => {
      const tbodyKey = input.getAttribute('data-mdt-search');
      const tbody = root.querySelector(`tbody[data-mdt-tbody="${tbodyKey}"]`);
      if (!tbody) return;
      const countEl = root.querySelector(`[data-mdt-count-for="${tbodyKey}"]`);
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        let visible = 0;
        tbody.querySelectorAll('tr').forEach(tr => {
          const key = tr.getAttribute('data-search') || '';
          const show = !q || key.includes(q);
          tr.style.display = show ? '' : 'none';
          if (show) visible++;
        });
        if (countEl) countEl.textContent = `${visible} prisoner${visible === 1 ? '' : 's'}`;
      });
    });

    // Column sort
    root.querySelectorAll('[data-mdt-table]').forEach(table => {
      const tbody = table.querySelector('tbody');
      if (!tbody) return;
      const originalOrder = Array.from(tbody.querySelectorAll('tr'));
      let currentKey = null;
      let currentDir = 1;
      table.querySelectorAll('.mdt-sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-mdt-sort');
          const colIdx = parseInt(btn.getAttribute('data-mdt-sort-col'), 10);
          if (currentKey === key) {
            currentDir = currentDir === 1 ? -1 : (currentDir === -1 ? 0 : 1);
          } else {
            currentKey = key;
            currentDir = 1;
          }
          // clear indicators
          table.querySelectorAll('.mdt-sort-btn__indicator').forEach(el => el.textContent = '');
          const indicator = btn.querySelector('.mdt-sort-btn__indicator');
          if (currentDir === 0) {
            currentKey = null;
            // restore original order
            originalOrder.forEach(tr => tbody.appendChild(tr));
            return;
          }
          if (indicator) indicator.textContent = currentDir === 1 ? '▲' : '▼';
          const rows = Array.from(tbody.querySelectorAll('tr'));
          rows.sort((a, b) => {
            const av = a.children[colIdx] ? a.children[colIdx].getAttribute('data-sort-value') || '' : '';
            const bv = b.children[colIdx] ? b.children[colIdx].getAttribute('data-sort-value') || '' : '';
            if (av < bv) return -1 * currentDir;
            if (av > bv) return 1 * currentDir;
            return 0;
          });
          rows.forEach(tr => tbody.appendChild(tr));
        });
      });
    });

    // Conditional reveal on the record-result form (show drug dropdown only
    // when "positive" is chosen).
    const posRadio = root.querySelector('#outcome-positive');
    const posWrap = root.querySelector('#ct-pos');
    if (posRadio && posWrap) {
      const toggle = () => posWrap.classList.toggle('govuk-radios__conditional--hidden', !posRadio.checked);
      root.querySelectorAll('input[name="outcome"]').forEach(r => r.addEventListener('change', toggle));
      toggle();
    }
  }

  /* =====================================================================
   * Boot
   * ===================================================================== */

  subscribe(renderResearchControls);
  subscribe(render);
  wireResearchToggle();
  render();
})();
