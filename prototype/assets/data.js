/**
 * MDT prototype — fictional data.
 *
 * Every name, prison number, sample reference and audit user is fictional.
 * Names are drawn from the workspace's `prisoners.csv` (Peaky Blinders characters).
 * Do not add any real personal data to this file.
 *
 * Exposes: window.MDT_FIXTURES
 */
(function () {
  'use strict';

  // Prisoner pool (subset of prisoners.csv, treated as the whole prison for the demo).
  const prisoners = [
    { id: 'p1', prisonNumber: 'G2632BB', displayName: 'Shelby, Thomas', location: 'A-3-027', incentiveLevel: 'Enhanced', age: 34, releaseDate: '2027-11-14' , currentActivity: 'Workshop — furniture making' },
    { id: 'p2', prisonNumber: 'A1147CX', displayName: 'Solomons, Alfie', location: 'A-1-014', incentiveLevel: 'Standard', age: 52, releaseDate: '2026-07-31' , currentActivity: 'Kitchen work party' }, // released tomorrow (current month scenario)
    { id: 'p3', prisonNumber: 'J8834RT', displayName: 'Shelby, Arthur', location: 'B-4-009', incentiveLevel: 'Basic',    age: 38, releaseDate: '2028-03-02' , currentActivity: 'Gym induction' },
    { id: 'p4', prisonNumber: 'K2210LM', displayName: 'Shelby, John',    location: 'B-2-031', incentiveLevel: 'Standard', age: 29, releaseDate: '2029-02-01' , currentActivity: 'Education — Functional Skills English' },
    { id: 'p5', prisonNumber: 'B5521ZQ', displayName: 'Gray, Michael',   location: 'C-1-002', incentiveLevel: 'Enhanced', age: 26, releaseDate: '2030-08-19' , currentActivity: 'Library orderly duties' },
    { id: 'p6', prisonNumber: 'F7719NP', displayName: 'Kimber, Billy',   location: 'A-3-018', incentiveLevel: 'Basic',    age: 61, releaseDate: '2026-08-04' , currentActivity: 'Education — Functional Skills Maths' }, // release within 7 days
    { id: 'p7', prisonNumber: 'H3092YU', displayName: 'Thorne, Freddie', location: 'B-2-045', incentiveLevel: 'Standard', age: 31, releaseDate: '2032-06-30' , currentActivity: 'Workshop — textiles' },
    { id: 'p8', prisonNumber: 'E6644OP', displayName: 'Whizz-Bang, Danny', location: 'C-1-011', incentiveLevel: 'Basic',  age: 44, releaseDate: '2027-04-22' , currentActivity: 'Substance misuse programme (SMP)' },
    { id: 'p9', prisonNumber: 'C1289WD', displayName: 'Jesus, Isaiah',    location: 'C-2-036', incentiveLevel: 'Enhanced', age: 23, releaseDate: '2028-12-01' , currentActivity: 'Education — Level 1 IT' },
    { id: 'p10', prisonNumber: 'D9930GH', displayName: 'Bridges, Curly',  location: 'A-2-005', incentiveLevel: 'Standard', age: 58, releaseDate: '2029-05-16' , currentActivity: 'Gardens work party' },
    { id: 'p11', prisonNumber: 'G4456TK', displayName: 'Jesus, Jeremiah', location: 'B-1-022', incentiveLevel: 'Basic',    age: 49, releaseDate: '2031-10-08' , currentActivity: 'Peer mentor training' },
    { id: 'p12', prisonNumber: 'A8871VN', displayName: 'Strong, Charlie', location: 'B-3-014', incentiveLevel: 'Standard', age: 67, releaseDate: '2027-01-25' , currentActivity: 'Chaplaincy — pastoral support' },
    { id: 'p13', prisonNumber: 'K5502FR', displayName: 'Gold, Aberama',   location: 'C-3-028', incentiveLevel: 'Enhanced', age: 55, releaseDate: '2030-02-11' , currentActivity: 'Workshop — laundry' },
    { id: 'p14', prisonNumber: 'B1147QZ', displayName: 'Thomason, Barney', location: 'A-4-003', incentiveLevel: 'Basic',   age: 22, releaseDate: '2028-09-04' , currentActivity: 'Education — Level 2 Business Admin' },
    { id: 'p15', prisonNumber: 'F3390LC', displayName: 'Changretta, Vincente', location: 'B-3-041', incentiveLevel: 'Standard', age: 60, releaseDate: '2026-08-07' , currentActivity: 'No activity scheduled' }, // release within 7d (reserve fixture)
    { id: 'p16', prisonNumber: 'H9021MB', displayName: 'Changretta, Luca', location: 'C-4-017', incentiveLevel: 'Enhanced', age: 33, releaseDate: '2032-01-19' , currentActivity: 'Gym — PE induction' },
    { id: 'p17', prisonNumber: 'J6642XR', displayName: 'Darby, Sabini',   location: 'A-1-009', incentiveLevel: 'Basic',    age: 45, releaseDate: '2027-06-30' , currentActivity: 'Kitchen work party' },
    { id: 'p18', prisonNumber: 'C2287TY', displayName: 'Grade, Billy',    location: 'C-4-022', incentiveLevel: 'Standard', age: 39, releaseDate: '2028-04-12' , currentActivity: 'Education — Functional Skills English' },
    { id: 'p19', prisonNumber: 'E5510DW', displayName: 'Nelson, Jack',    location: 'B-2-013', incentiveLevel: 'Enhanced', age: 41, releaseDate: '2029-11-30' , currentActivity: 'Resettlement — employment workshop' },
    { id: 'p20', prisonNumber: 'D8834PN', displayName: 'Changretta, Angel', location: 'C-1-006', incentiveLevel: 'Basic',  age: 27, releaseDate: '2027-09-16' }
  ];

  /* Ten extra closed months (2025-07 to 2026-04) so "previous months" has a realistic amount
     of history. Most prisoners are tested each month, but a handful of exceptions (and a
     reserve stepping in to cover one of them) are scattered through the run so the history
     doesn't look artificially perfect. */
  const extraMonthDefs = [
    { month: '2025-07', label: 'July 2025' },
    { month: '2025-08', label: 'August 2025' },
    { month: '2025-09', label: 'September 2025' },
    { month: '2025-10', label: 'October 2025' },
    { month: '2025-11', label: 'November 2025' },
    { month: '2025-12', label: 'December 2025' },
    { month: '2026-01', label: 'January 2026' },
    { month: '2026-02', label: 'February 2026' },
    { month: '2026-03', label: 'March 2026' },
    { month: '2026-04', label: 'April 2026' }
  ];

  const extraReportingMonths = extraMonthDefs.map((def, mi) => ({
    id: `m-${def.month}`,
    month: def.month,
    label: def.label,
    establishmentId: 'est-1',
    allocatedTests: 10,
    status: 'closed',
    randomListGeneratedAt: `${def.month}-01T08:${String(10 + mi).padStart(2, '0')}:00Z`,
    reserveListGeneratedAt: `${def.month}-01T08:${String(10 + mi).padStart(2, '0')}:00Z`,
    generatedBy: 'Officer J. Marston (fictional)',
    populationAtGeneration: 290 + ((mi * 3) % 20),
    percentageRequested: 10,
    reserveListSize: 5,
    selectionReference: `SEED-${def.month.replace('-', '')}-LH-0${100 + mi}`
  }));

  let extraSelections = [];
  extraReportingMonths.forEach((m, mi) => {
    const monthKey = m.id.replace('m-', '');
    const offset = mi * 3;
    const randomIds = Array.from({ length: 10 }, (_, i) => prisoners[(offset + i * 2) % prisoners.length].id);
    const reserveIds = Array.from({ length: 5 }, (_, i) => prisoners[(offset + 10 + i * 2) % prisoners.length].id);

    // A couple of months have no exceptions at all; others have one or two prisoners not tested.
    const exceptionSlots = mi % 4 === 0 ? [2, 7] : (mi % 3 === 0 ? [4] : []);

    const monthRandom = randomIds.map((pid, i) => {
      const isException = exceptionSlots.includes(i);
      return {
        id: `s-${monthKey}-r-${i + 1}`,
        reportingMonthId: m.id,
        prisonerId: pid,
        listType: 'random',
        listPosition: i + 1,
        status: isException ? 'exception' : 'completed',
        ...(isException ? { exceptionReason: i === 2 ? 'Refused' : 'Released' } : {})
      };
    });

    const monthReserve = reserveIds.map((pid, i) => ({
      id: `s-${monthKey}-x-${i + 1}`,
      reportingMonthId: m.id,
      prisonerId: pid,
      listType: 'reserve',
      listPosition: i + 1,
      status: 'not-started'
    }));

    // Most months where a prisoner had an exception, a reserve was activated to cover it —
    // showing up in the "Original list" column as someone pulled from the reserve list.
    if (exceptionSlots.length && mi % 3 !== 1) {
      const original = monthRandom[exceptionSlots[0]];
      const reserve = monthReserve[0];
      reserve.status = 'completed';
      reserve.originalSelectionId = original.id;
      original.replacementSelectionId = reserve.id;
    }

    extraSelections = extraSelections.concat(monthRandom, monthReserve);
  });

  // Fourteen reporting months in total: ten extra closed months, three closed months and the
  // current (not yet generated) month. The prototype's "today" is 30 July 2026 — August 2026
  // is the month about to be generated.
  const reportingMonths = [
    ...extraReportingMonths,
    { id: 'm-2026-05', month: '2026-05', label: 'May 2026',  establishmentId: 'est-1', allocatedTests: 10, status: 'closed', randomListGeneratedAt: '2026-05-01T08:15:00Z', reserveListGeneratedAt: '2026-05-01T08:15:00Z',
      generatedBy: 'Officer J. Marston (fictional)', populationAtGeneration: 298, percentageRequested: 10, reserveListSize: 5, selectionReference: 'SEED-2026-05-LH-0142' },
    { id: 'm-2026-06', month: '2026-06', label: 'June 2026', establishmentId: 'est-1', allocatedTests: 10, status: 'closed', randomListGeneratedAt: '2026-06-01T08:22:00Z', reserveListGeneratedAt: '2026-06-01T08:22:00Z',
      generatedBy: 'Officer J. Marston (fictional)', populationAtGeneration: 301, percentageRequested: 10, reserveListSize: 5, selectionReference: 'SEED-2026-06-LH-0198' },
    { id: 'm-2026-07', month: '2026-07', label: 'July 2026', establishmentId: 'est-1', allocatedTests: 10, status: 'closed', randomListGeneratedAt: '2026-07-01T08:04:00Z', reserveListGeneratedAt: '2026-07-01T08:04:00Z',
      generatedBy: 'Officer J. Marston (fictional)', populationAtGeneration: 300, percentageRequested: 10, reserveListSize: 5, selectionReference: 'SEED-2026-07-LH-0231' },
    { id: 'm-2026-08', month: '2026-08', label: 'August 2026', establishmentId: 'est-1', allocatedTests: 10, status: 'not-started', randomListGeneratedAt: null, reserveListGeneratedAt: null,
      generatedBy: null, populationAtGeneration: null, percentageRequested: null, reserveListSize: null, selectionReference: null }
  ];

  const establishment = {
    id: 'est-1',
    name: 'HMP Little Heath',
    avgPopulation30Days: 300, // < 400 → 10% policy assumption
    reservePercentDefault: 50   // reserve list is 50% of random list (configurable)
  };

  const currentUser = { id: 'u-marston', displayName: 'Officer J. Marston (fictional)' };

  /* -----------------------------------------------------------------------
   * Selections
   *
   * Current month (m-2026-07) — 10 random + 5 reserve, scenarios per brief §12.
   * ----------------------------------------------------------------------- */

  const currentRandom = [
    { id: 's-07-r-1',  reportingMonthId: 'm-2026-07', prisonerId: 'p2',  listType: 'random', listPosition: 1,  status: 'attempt-required' }, // Alfie Solomons, released tomorrow
    { id: 's-07-r-2',  reportingMonthId: 'm-2026-07', prisonerId: 'p6',  listType: 'random', listPosition: 2,  status: 'sample-collected' }, // Billy Kimber, positive follow-up
    { id: 's-07-r-3',  reportingMonthId: 'm-2026-07', prisonerId: 'p1',  listType: 'random', listPosition: 3,  status: 'sample-collected' }, // Thomas Shelby, awaiting result
    { id: 's-07-r-4',  reportingMonthId: 'm-2026-07', prisonerId: 'p4',  listType: 'random', listPosition: 4,  status: 'completed' },        // John Shelby, negative
    { id: 's-07-r-5',  reportingMonthId: 'm-2026-07', prisonerId: 'p5',  listType: 'random', listPosition: 5,  status: 'exception', exceptionReason: 'At court' }, // Michael Gray, at court, reserve used
    { id: 's-07-r-6',  reportingMonthId: 'm-2026-07', prisonerId: 'p7',  listType: 'random', listPosition: 6,  status: 'exception', exceptionReason: 'Refused' }, // Freddie Thorne
    { id: 's-07-r-7',  reportingMonthId: 'm-2026-07', prisonerId: 'p8',  listType: 'random', listPosition: 7,  status: 'sample-collected' }, // Danny — inconclusive returned
    { id: 's-07-r-8',  reportingMonthId: 'm-2026-07', prisonerId: 'p9',  listType: 'random', listPosition: 8,  status: 'attempt-required' }, // Isaiah — temporarily unavailable, not yet reserved
    { id: 's-07-r-9',  reportingMonthId: 'm-2026-07', prisonerId: 'p10', listType: 'random', listPosition: 9,  status: 'not-started' },      // Curly — incomplete record
    { id: 's-07-r-10', reportingMonthId: 'm-2026-07', prisonerId: 'p11', listType: 'random', listPosition: 10, status: 'not-started' }       // Jeremiah — not started
  ];

  const currentReserve = [
    { id: 's-07-x-1', reportingMonthId: 'm-2026-07', prisonerId: 'p12', listType: 'reserve', listPosition: 1, status: 'sample-collected', originalSelectionId: 's-07-r-5' }, // Charlie Strong — used to replace Michael Gray
    { id: 's-07-x-2', reportingMonthId: 'm-2026-07', prisonerId: 'p13', listType: 'reserve', listPosition: 2, status: 'not-started' },
    { id: 's-07-x-3', reportingMonthId: 'm-2026-07', prisonerId: 'p14', listType: 'reserve', listPosition: 3, status: 'not-started' },
    { id: 's-07-x-4', reportingMonthId: 'm-2026-07', prisonerId: 'p15', listType: 'reserve', listPosition: 4, status: 'not-started' },
    { id: 's-07-x-5', reportingMonthId: 'm-2026-07', prisonerId: 'p16', listType: 'reserve', listPosition: 5, status: 'not-started' }
  ];
  // back-link on original selection
  currentRandom.find(s => s.id === 's-07-r-5').replacementSelectionId = 's-07-x-1';

  /* Previous month (m-2026-06) — mostly complete, one rolled-over result, one unresolved follow-up */
  const previousRandom = [
    { id: 's-06-r-1', reportingMonthId: 'm-2026-06', prisonerId: 'p3',  listType: 'random', listPosition: 1, status: 'completed' },
    { id: 's-06-r-2', reportingMonthId: 'm-2026-06', prisonerId: 'p17', listType: 'random', listPosition: 2, status: 'sample-collected' }, // rolled-over: awaiting late result
    { id: 's-06-r-3', reportingMonthId: 'm-2026-06', prisonerId: 'p18', listType: 'random', listPosition: 3, status: 'completed' }, // positive with unresolved follow-up
    { id: 's-06-r-4', reportingMonthId: 'm-2026-06', prisonerId: 'p19', listType: 'random', listPosition: 4, status: 'completed' },
    { id: 's-06-r-5', reportingMonthId: 'm-2026-06', prisonerId: 'p20', listType: 'random', listPosition: 5, status: 'completed' },
    { id: 's-06-r-6', reportingMonthId: 'm-2026-06', prisonerId: 'p16', listType: 'random', listPosition: 6, status: 'completed' },
    { id: 's-06-r-7', reportingMonthId: 'm-2026-06', prisonerId: 'p13', listType: 'random', listPosition: 7, status: 'completed' },
    { id: 's-06-r-8', reportingMonthId: 'm-2026-06', prisonerId: 'p12', listType: 'random', listPosition: 8, status: 'completed' },
    { id: 's-06-r-9', reportingMonthId: 'm-2026-06', prisonerId: 'p11', listType: 'random', listPosition: 9, status: 'completed' },
    { id: 's-06-r-10', reportingMonthId: 'm-2026-06', prisonerId: 'p10', listType: 'random', listPosition: 10, status: 'completed' }
  ];
  const previousReserve = [
    { id: 's-06-x-1', reportingMonthId: 'm-2026-06', prisonerId: 'p14', listType: 'reserve', listPosition: 1, status: 'not-started' },
    { id: 's-06-x-2', reportingMonthId: 'm-2026-06', prisonerId: 'p15', listType: 'reserve', listPosition: 2, status: 'not-started' },
    { id: 's-06-x-3', reportingMonthId: 'm-2026-06', prisonerId: 'p9',  listType: 'reserve', listPosition: 3, status: 'not-started' },
    { id: 's-06-x-4', reportingMonthId: 'm-2026-06', prisonerId: 'p8',  listType: 'reserve', listPosition: 4, status: 'not-started' },
    { id: 's-06-x-5', reportingMonthId: 'm-2026-06', prisonerId: 'p7',  listType: 'reserve', listPosition: 5, status: 'not-started' }
  ];

  /* Closed month (m-2026-05) — fully completed */
  const closedRandom = Array.from({ length: 10 }, (_, i) => ({
    id: `s-05-r-${i + 1}`,
    reportingMonthId: 'm-2026-05',
    prisonerId: prisoners[(i * 2) % prisoners.length].id,
    listType: 'random',
    listPosition: i + 1,
    status: 'completed'
  }));
  const closedReserve = Array.from({ length: 5 }, (_, i) => ({
    id: `s-05-x-${i + 1}`,
    reportingMonthId: 'm-2026-05',
    prisonerId: prisoners[(i * 2 + 1) % prisoners.length].id,
    listType: 'reserve',
    listPosition: i + 1,
    status: 'not-started'
  }));

  const selections = [
    ...extraSelections,
    ...currentRandom, ...currentReserve,
    ...previousRandom, ...previousReserve,
    ...closedRandom, ...closedReserve
  ];

  /* Test attempts */
  const testAttempts = [
    // current month
    { id: 'ta-1', selectionId: 's-07-r-5', outcome: 'At court', recordedAt: '2026-07-14T09:11:00Z', recordedBy: 'u-marston', notes: 'Court appearance in Birmingham. Officer confirmed via SO.' },
    { id: 'ta-2', selectionId: 's-07-r-6', outcome: 'Refused', recordedAt: '2026-07-16T10:32:00Z', recordedBy: 'u-marston', notes: 'Prisoner refused verbally. Placed on report.' },
    { id: 'ta-3', selectionId: 's-07-r-2', outcome: 'Sample collected', recordedAt: '2026-07-06T08:45:00Z', recordedBy: 'u-marston' },
    { id: 'ta-4', selectionId: 's-07-r-3', outcome: 'Sample collected', recordedAt: '2026-07-24T09:02:00Z', recordedBy: 'u-marston' },
    { id: 'ta-5', selectionId: 's-07-r-4', outcome: 'Sample collected', recordedAt: '2026-07-08T08:30:00Z', recordedBy: 'u-marston' },
    { id: 'ta-6', selectionId: 's-07-r-7', outcome: 'Sample collected', recordedAt: '2026-07-12T09:20:00Z', recordedBy: 'u-marston' },
    { id: 'ta-7', selectionId: 's-07-r-8', outcome: 'Temporarily unavailable', recordedAt: '2026-07-28T14:15:00Z', recordedBy: 'u-marston', notes: 'In healthcare — chest infection. Retry in 48 hours.' },
    { id: 'ta-8', selectionId: 's-07-x-1', outcome: 'Sample collected', recordedAt: '2026-07-15T08:55:00Z', recordedBy: 'u-marston' },
    // previous month
    { id: 'ta-p1', selectionId: 's-06-r-2', outcome: 'Sample collected', recordedAt: '2026-06-26T09:15:00Z', recordedBy: 'u-marston' },
    { id: 'ta-p2', selectionId: 's-06-r-3', outcome: 'Sample collected', recordedAt: '2026-06-10T08:40:00Z', recordedBy: 'u-marston' },
    { id: 'ta-p3', selectionId: 's-06-r-1', outcome: 'Sample collected', recordedAt: '2026-06-05T09:00:00Z', recordedBy: 'u-marston' }
    // closed-month attempts omitted for brevity — figures derive from status
  ];

  /* Samples */
  const samples = [
    { id: 'sm-1', selectionId: 's-07-r-2', reference: 'LH-070006', collectedAt: '2026-07-06T08:45:00Z', collectedBy: 'u-marston', testType: 'Random MDT (urine)', status: 'result-received' },
    { id: 'sm-2', selectionId: 's-07-r-3', reference: 'LH-070024', collectedAt: '2026-07-24T09:02:00Z', collectedBy: 'u-marston', testType: 'Random MDT (urine)', status: 'awaiting-result' },
    { id: 'sm-3', selectionId: 's-07-r-4', reference: 'LH-070008', collectedAt: '2026-07-08T08:30:00Z', collectedBy: 'u-marston', testType: 'Random MDT (urine)', status: 'result-received' },
    { id: 'sm-4', selectionId: 's-07-r-7', reference: 'LH-070012', collectedAt: '2026-07-12T09:20:00Z', collectedBy: 'u-marston', testType: 'Random MDT (urine)', status: 'result-received' },
    { id: 'sm-5', selectionId: 's-07-x-1', reference: 'LH-070015', collectedAt: '2026-07-15T08:55:00Z', collectedBy: 'u-marston', testType: 'Random MDT (urine)', status: 'awaiting-result' },
    // previous month rolled-over
    { id: 'sm-p1', selectionId: 's-06-r-2', reference: 'LH-060126', collectedAt: '2026-06-26T09:15:00Z', collectedBy: 'u-marston', testType: 'Random MDT (urine)', status: 'awaiting-result' },
    { id: 'sm-p2', selectionId: 's-06-r-3', reference: 'LH-060110', collectedAt: '2026-06-10T08:40:00Z', collectedBy: 'u-marston', testType: 'Random MDT (urine)', status: 'result-received' },
    { id: 'sm-p3', selectionId: 's-06-r-1', reference: 'LH-060105', collectedAt: '2026-06-05T09:00:00Z', collectedBy: 'u-marston', testType: 'Random MDT (urine)', status: 'result-received' }
  ];

  const testResults = [
    { id: 'tr-1', sampleId: 'sm-1', outcome: 'positive',     receivedAt: '2026-07-13T11:00:00Z', recordedAt: '2026-07-13T14:22:00Z', recordedBy: 'u-marston' },
    { id: 'tr-3', sampleId: 'sm-3', outcome: 'negative',     receivedAt: '2026-07-15T10:15:00Z', recordedAt: '2026-07-15T15:03:00Z', recordedBy: 'u-marston' },
    { id: 'tr-4', sampleId: 'sm-4', outcome: 'inconclusive', receivedAt: '2026-07-19T11:32:00Z', recordedAt: '2026-07-19T16:11:00Z', recordedBy: 'u-marston' },
    { id: 'tr-p2', sampleId: 'sm-p2', outcome: 'positive',   receivedAt: '2026-06-17T11:10:00Z', recordedAt: '2026-06-17T14:44:00Z', recordedBy: 'u-marston' },
    { id: 'tr-p3', sampleId: 'sm-p3', outcome: 'negative',   receivedAt: '2026-06-12T09:50:00Z', recordedAt: '2026-06-12T13:20:00Z', recordedBy: 'u-marston' }
  ];

  /* Follow-up actions.
     The service does not automatically place a prisoner on report; the task is presented for the officer. */
  const followUpActions = [
    // s-07-r-2 (Billy Kimber) positive result — mixed follow-up state
    { id: 'fu-1', selectionId: 's-07-r-2', actionType: 'Place prisoner on report',              requirement: 'mandatory',   status: 'completed', completedAt: '2026-07-13T15:10:00Z', completedBy: 'u-marston' },
    { id: 'fu-2', selectionId: 's-07-r-2', actionType: 'Record result in NOMIS',                requirement: 'recommended', status: 'not-started' },
    { id: 'fu-3', selectionId: 's-07-r-2', actionType: 'Consider drug rehabilitation referral', requirement: 'local',       status: 'not-started' },
    // s-06-r-3 (Billy Grade) previous-month positive — unresolved
    { id: 'fu-p1', selectionId: 's-06-r-3', actionType: 'Place prisoner on report',              requirement: 'mandatory',   status: 'not-started' },
    { id: 'fu-p2', selectionId: 's-06-r-3', actionType: 'Record result in NOMIS',                requirement: 'recommended', status: 'not-started' },
    { id: 'fu-p3', selectionId: 's-06-r-3', actionType: 'Consider drug rehabilitation referral', requirement: 'local',       status: 'not-started' }
  ];

  /* Audit history — one representative event per state change above.
     The prototype adds more as the participant works. */
  const auditEvents = [
    { id: 'a-1', entityType: 'reportingMonth', entityId: 'm-2026-07', action: 'Random list generated', newState: { count: 10 }, occurredAt: '2026-07-01T08:04:00Z', performedBy: 'u-marston' },
    { id: 'a-2', entityType: 'reportingMonth', entityId: 'm-2026-07', action: 'Reserve list generated', newState: { count: 5 },  occurredAt: '2026-07-01T08:04:00Z', performedBy: 'u-marston' },
    { id: 'a-3', entityType: 'selection', entityId: 's-07-r-2', action: 'Sample collected', reason: 'Random MDT collection', previousState: { status: 'attempt-required' }, newState: { status: 'sample-collected', sampleReference: 'LH-070006' }, occurredAt: '2026-07-06T08:45:00Z', performedBy: 'u-marston' },
    { id: 'a-4', entityType: 'selection', entityId: 's-07-r-2', action: 'Result recorded — positive', previousState: { status: 'sample-collected' }, newState: { status: 'sample-collected', result: 'positive' }, occurredAt: '2026-07-13T14:22:00Z', performedBy: 'u-marston' },
    { id: 'a-5', entityType: 'selection', entityId: 's-07-r-2', action: 'Follow-up completed — placed on report', previousState: { fu: 'not-started' }, newState: { fu: 'completed' }, occurredAt: '2026-07-13T15:10:00Z', performedBy: 'u-marston' },
    { id: 'a-6', entityType: 'selection', entityId: 's-07-r-5', action: 'Exception recorded — at court', reason: 'At court', previousState: { status: 'attempt-required' }, newState: { status: 'exception', exceptionReason: 'At court' }, occurredAt: '2026-07-14T09:11:00Z', performedBy: 'u-marston' },
    { id: 'a-7', entityType: 'selection', entityId: 's-07-r-5', action: 'Reserve linked', reason: 'Original selection at court', previousState: { replacementSelectionId: null }, newState: { replacementSelectionId: 's-07-x-1' }, occurredAt: '2026-07-14T09:12:00Z', performedBy: 'u-marston' },
    { id: 'a-8', entityType: 'selection', entityId: 's-07-x-1', action: 'Reserve activated — replaces s-07-r-5', previousState: { originalSelectionId: null, status: 'not-started' }, newState: { originalSelectionId: 's-07-r-5', status: 'attempt-required' }, occurredAt: '2026-07-14T09:12:00Z', performedBy: 'u-marston' },
    { id: 'a-9', entityType: 'selection', entityId: 's-07-x-1', action: 'Sample collected', previousState: { status: 'attempt-required' }, newState: { status: 'sample-collected', sampleReference: 'LH-070015' }, occurredAt: '2026-07-15T08:55:00Z', performedBy: 'u-marston' },
    { id: 'a-10', entityType: 'selection', entityId: 's-07-r-6', action: 'Exception recorded — refused', reason: 'Refused', previousState: { status: 'attempt-required' }, newState: { status: 'exception', exceptionReason: 'Refused' }, occurredAt: '2026-07-16T10:32:00Z', performedBy: 'u-marston' },
    { id: 'a-11', entityType: 'selection', entityId: 's-07-r-8', action: 'Exception recorded — temporarily unavailable', reason: 'Temporarily unavailable', previousState: { status: 'attempt-required' }, newState: { status: 'attempt-required', note: 'Retry — no reserve yet' }, occurredAt: '2026-07-28T14:15:00Z', performedBy: 'u-marston' }
  ];

  const followUpTemplate = [
    { actionType: 'Place prisoner on report',              requirement: 'mandatory'   },
    { actionType: 'Record result in NOMIS',                requirement: 'recommended' },
    { actionType: 'Consider drug rehabilitation referral', requirement: 'local'       }
  ];

  window.MDT_FIXTURES = {
    schemaVersion: 3,
    establishment,
    currentUser,
    prisoners,
    reportingMonths,
    selections,
    testAttempts,
    samples,
    testResults,
    followUpActions,
    auditEvents,
    followUpTemplate,
    now: '2026-07-30T09:00:00Z'
  };
})();
