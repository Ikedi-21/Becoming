/**
 * Becoming - Personal Accountability Web Application
 * October 27, 2026 to December 31, 2026 (65-Day Journey)
 * 
 * Clean, modular, vanilla JavaScript with localStorage persistence.
 */

(function () {
  'use strict';

  // Constants
  const STORAGE_KEY = 'becoming_app_data_v1';
  const START_DATE_STR = '2026-10-27';
  const END_DATE_STR = '2026-12-31';

  const DEFAULT_HABITS = [
    {
      key: 'habit_study',
      title: 'Complete meaningful university study',
      category: 'University',
      points: 5,
      actionPrefix: 'habit_study'
    },
    {
      key: 'habit_project',
      title: 'Work on the main software project',
      category: 'Main Project',
      points: 5,
      actionPrefix: 'habit_project'
    },
    {
      key: 'habit_github',
      title: 'Make a meaningful GitHub contribution',
      category: 'Main Project',
      points: 3,
      actionPrefix: 'habit_github'
    },
    {
      key: 'habit_review',
      title: 'Complete a daily review',
      category: 'Personal',
      points: 2,
      actionPrefix: 'habit_review'
    },
    {
      key: 'habit_screentime',
      title: 'Record phone screen time',
      category: 'Health',
      points: 0,
      actionPrefix: null
    },
    {
      key: 'habit_bedtime',
      title: 'Maintain a reasonable bedtime routine',
      category: 'Health',
      points: 0,
      actionPrefix: null
    }
  ];

  // Weeks breakdown for 65-day period
  const WEEKS_DEF = [
    { num: 1, label: 'Week 1: Oct 27 to Nov 1', start: '2026-10-27', end: '2026-11-01' },
    { num: 2, label: 'Week 2: Nov 2 to Nov 8', start: '2026-11-02', end: '2026-11-08' },
    { num: 3, label: 'Week 3: Nov 9 to Nov 15', start: '2026-11-09', end: '2026-11-15' },
    { num: 4, label: 'Week 4: Nov 16 to Nov 22', start: '2026-11-16', end: '2026-11-22' },
    { num: 5, label: 'Week 5: Nov 23 to Nov 29', start: '2026-11-23', end: '2026-11-29' },
    { num: 6, label: 'Week 6: Nov 30 to Dec 6', start: '2026-11-30', end: '2026-12-06' },
    { num: 7, label: 'Week 7: Dec 7 to Dec 13', start: '2026-12-07', end: '2026-12-13' },
    { num: 8, label: 'Week 8: Dec 14 to Dec 20', start: '2026-12-14', end: '2026-12-20' },
    { num: 9, label: 'Week 9: Dec 21 to Dec 27', start: '2026-12-21', end: '2026-12-27' },
    { num: 10, label: 'Week 10: Dec 28 to Dec 31', start: '2026-12-28', end: '2026-12-31' }
  ];

  // Application State
  let state = {
    version: 1,
    activeDate: START_DATE_STR,
    tasks: [],
    habits: {},             // { [dateStr]: { [habitKey]: boolean } }
    projectLogs: [],        // [{ id, date, workedOn, completed, learned, nextPlan, commitUrl, createdAt }]
    studySessions: [],      // [{ id, date, subject, duration, topics, completed, createdAt }]
    exams: [
      {
        id: 'exam_placeholder_nov4',
        date: '2026-11-04',
        title: 'University Midterm Exam',
        type: 'Exam',
        status: 'Awaiting confirmation (editable)'
      }
    ],
    internshipTasks: [],    // [{ id, date, title, type, notes, completed, createdAt }]
    screenTime: [],         // [{ id, date, hours, minutes, totalMinutes, notes, createdAt }]
    dailyReviews: {},       // { [dateStr]: { accomplished, learned, distracted, tomorrowPriority, effortRating, completedAt } }
    weeklyReflections: {},  // { [weekNum]: { reflection, savedAt } }
    pointsLedger: []        // [{ id, date, actionKey, points, label, timestamp }]
  };

  // Filter state for daily view
  let currentCategoryFilter = 'all';

  // -------------------------------------------------------------
  // Utility Functions
  // -------------------------------------------------------------

  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  function parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  function formatLocalDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(dateStr, includeDayName = false) {
    const d = parseLocalDate(dateStr);
    const options = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    if (includeDayName) {
      options.weekday = 'long';
    }
    return d.toLocaleDateString('en-US', options);
  }

  function calculateDayIndex(dateStr) {
    const start = parseLocalDate(START_DATE_STR);
    const target = parseLocalDate(dateStr);
    const diffTime = target - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  function getTotalJourneyDays() {
    const start = parseLocalDate(START_DATE_STR);
    const end = parseLocalDate(END_DATE_STR);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }

  function isDateInRange(dateStr) {
    return dateStr >= START_DATE_STR && dateStr <= END_DATE_STR;
  }

  function clampDateToRange(dateStr) {
    if (dateStr < START_DATE_STR) return START_DATE_STR;
    if (dateStr > END_DATE_STR) return END_DATE_STR;
    return dateStr;
  }

  function getPreviousDate(dateStr) {
    const d = parseLocalDate(dateStr);
    d.setDate(d.getDate() - 1);
    const prev = formatLocalDate(d);
    return prev >= START_DATE_STR ? prev : START_DATE_STR;
  }

  function getNextDate(dateStr) {
    const d = parseLocalDate(dateStr);
    d.setDate(d.getDate() + 1);
    const next = formatLocalDate(d);
    return next <= END_DATE_STR ? next : END_DATE_STR;
  }

  function getWeekForDate(dateStr) {
    const found = WEEKS_DEF.find(w => dateStr >= w.start && dateStr <= w.end);
    return found ? found.num : 1;
  }

  // -------------------------------------------------------------
  // Persistence & Storage
  // -------------------------------------------------------------

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Merge safely
          state = Object.assign({}, state, parsed);
          // Ensure arrays and objects exist
          if (!Array.isArray(state.tasks)) state.tasks = [];
          if (!state.habits || typeof state.habits !== 'object') state.habits = {};
          if (!Array.isArray(state.projectLogs)) state.projectLogs = [];
          if (!Array.isArray(state.studySessions)) state.studySessions = [];
          if (!Array.isArray(state.exams)) state.exams = [];
          if (!Array.isArray(state.internshipTasks)) state.internshipTasks = [];
          if (!Array.isArray(state.screenTime)) state.screenTime = [];
          if (!state.dailyReviews || typeof state.dailyReviews !== 'object') state.dailyReviews = {};
          if (!state.weeklyReflections || typeof state.weeklyReflections !== 'object') state.weeklyReflections = {};
          if (!Array.isArray(state.pointsLedger)) state.pointsLedger = [];

          // Keep activeDate in valid bounds
          if (!isDateInRange(state.activeDate)) {
            state.activeDate = START_DATE_STR;
          }
        }
      } else {
        // First run: setup sample tasks for Oct 27, 2026
        setupInitialWelcomeData();
      }
    } catch (err) {
      console.error('Error loading Becoming state:', err);
      showToast('Error loading saved data. Defaults loaded.', 'error');
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('Error saving Becoming state:', err);
      showToast('Could not save data. Browser storage may be full.', 'error');
    }
  }

  function setupInitialWelcomeData() {
    // Add default tasks for Oct 27, 2026
    state.tasks = [
      {
        id: generateId('task'),
        title: 'Review course syllabus and exam schedule',
        category: 'University',
        duration: 45,
        completed: false,
        note: 'Check requirements and grading rubrics for midterm preparations.',
        isPriority: true,
        date: START_DATE_STR,
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('task'),
        title: 'Initialize repository structure and verify local development environment',
        category: 'Main Project',
        duration: 60,
        completed: false,
        note: 'Clean setup with clear commit history.',
        isPriority: false,
        date: START_DATE_STR,
        createdAt: new Date().toISOString()
      }
    ];

    saveState();
  }

  // -------------------------------------------------------------
  // Points & Milestones System
  // -------------------------------------------------------------

  function calculateTotalPoints() {
    return state.pointsLedger.reduce((sum, item) => sum + (item.points || 0), 0);
  }

  function awardPoints(actionKey, date, points, label) {
    if (points <= 0) return;
    // Check if points for this exact action key have already been recorded
    const existing = state.pointsLedger.find(entry => entry.actionKey === actionKey);
    if (existing) {
      // Already awarded; ignore duplicate to prevent toggling exploits
      return;
    }

    const entry = {
      id: generateId('pts'),
      date: date,
      actionKey: actionKey,
      points: points,
      label: label,
      timestamp: new Date().toISOString()
    };

    state.pointsLedger.push(entry);

    // Check for missed day recovery point award
    checkRecoveryAward(date);

    saveState();
    updatePointsUI();
    showToast(`+${points} points: ${label}`, 'reward');
  }

  function removePoints(actionKey) {
    const index = state.pointsLedger.findIndex(entry => entry.actionKey === actionKey);
    if (index !== -1) {
      const removed = state.pointsLedger.splice(index, 1)[0];
      saveState();
      updatePointsUI();
      showToast(`Removed +${removed.points} pts (${removed.label})`, 'info');
    }
  }

  function checkRecoveryAward(todayDate) {
    if (todayDate <= START_DATE_STR) return;
    const recoveryKey = `recovery_${todayDate}`;
    // If recovery already awarded today, skip
    if (state.pointsLedger.some(p => p.actionKey === recoveryKey)) return;

    const prevDate = getPreviousDate(todayDate);
    // Did yesterday have 0 completed tasks and 0 completed reviews?
    const prevTasksDone = state.tasks.filter(t => t.date === prevDate && t.completed).length;
    const prevHabits = state.habits[prevDate] || {};
    const prevHabitsDone = Object.values(prevHabits).filter(Boolean).length;
    const prevReviewDone = !!state.dailyReviews[prevDate];

    if (prevTasksDone === 0 && prevHabitsDone === 0 && !prevReviewDone) {
      // User returned after an inactive day! Award 5 points for returning.
      state.pointsLedger.push({
        id: generateId('pts_rec'),
        date: todayDate,
        actionKey: recoveryKey,
        points: 5,
        label: 'Returned to the plan after an off day',
        timestamp: new Date().toISOString()
      });
      showToast('+5 points: Returned to the plan after a missed day', 'reward');
    }
  }

  function updatePointsUI() {
    const total = calculateTotalPoints();

    // Header badge
    const headerVal = document.getElementById('headerPointsVal');
    const headerMilestone = document.getElementById('headerMilestoneTarget');
    if (headerVal) headerVal.textContent = total;

    let nextTarget = 25;
    let milestoneLabel = 'Milestone 1 (25 pts)';
    if (total >= 100) {
      nextTarget = 150;
      milestoneLabel = 'Deep Consistency Achieved';
    } else if (total >= 60) {
      nextTarget = 100;
      milestoneLabel = 'Milestone 3 (100 pts)';
    } else if (total >= 25) {
      nextTarget = 60;
      milestoneLabel = 'Milestone 2 (60 pts)';
    }

    if (headerMilestone) {
      headerMilestone.textContent = total >= 100 ? '100+ Master' : `Next: ${nextTarget}`;
    }

    // Dashboard card
    const dashPoints = document.getElementById('dashPointsDisplay');
    const dashNextTarget = document.getElementById('dashNextMilestoneTarget');
    const dashProgress = document.getElementById('dashMilestoneProgressBar');
    const dashMilestoneBadge = document.getElementById('dashMilestoneBadge');
    const dashMilestoneFootnote = document.getElementById('dashMilestoneFootnote');

    if (dashPoints) dashPoints.textContent = total;
    if (dashNextTarget) dashNextTarget.textContent = `/ ${nextTarget} pts`;
    if (dashMilestoneBadge) {
      dashMilestoneBadge.textContent = total >= 100 ? 'Gold Milestone' : (total >= 60 ? 'Silver Milestone' : 'Bronze Milestone');
    }
    if (dashMilestoneFootnote) {
      dashMilestoneFootnote.textContent = `${nextTarget} pts: ${milestoneLabel}`;
    }

    if (dashProgress) {
      const pct = Math.min(100, Math.round((total / nextTarget) * 100));
      dashProgress.style.width = `${pct}%`;
    }

    // Milestone overview boxes
    updateMilestoneBox('milestoneBox25', 'milestoneStatus25', total >= 25);
    updateMilestoneBox('milestoneBox60', 'milestoneStatus60', total >= 60);
    updateMilestoneBox('milestoneBox100', 'milestoneStatus100', total >= 100);

    // Ledger total
    const ledgerBadge = document.getElementById('ledgerTotalBadge');
    if (ledgerBadge) ledgerBadge.textContent = `Total: ${total} pts`;
  }

  function updateMilestoneBox(boxId, statusId, isReached) {
    const box = document.getElementById(boxId);
    const status = document.getElementById(statusId);
    if (!box || !status) return;
    if (isReached) {
      box.classList.add('reached');
      status.textContent = 'Unlocked';
    } else {
      box.classList.remove('reached');
      status.textContent = 'Pending';
    }
  }

  // -------------------------------------------------------------
  // Date Navigation & Active Date Management
  // -------------------------------------------------------------

  function setActiveDate(newDateStr) {
    if (!isDateInRange(newDateStr)) return;
    state.activeDate = newDateStr;
    saveState();
    renderAll();
  }

  function updateDateBadges() {
    const dayIdx = calculateDayIndex(state.activeDate);
    const totalDays = getTotalJourneyDays();

    // Top Header Badge
    const headerDay = document.getElementById('headerDayNumber');
    const headerCal = document.getElementById('headerCalendarDate');
    if (headerDay) headerDay.textContent = `Day ${dayIdx} of ${totalDays}`;
    if (headerCal) headerCal.textContent = formatDisplayDate(state.activeDate, false);

    // Prev / Next button bounds
    const prevBtn = document.getElementById('prevDayBtn');
    const nextBtn = document.getElementById('nextDayBtn');
    if (prevBtn) prevBtn.disabled = state.activeDate <= START_DATE_STR;
    if (nextBtn) nextBtn.disabled = state.activeDate >= END_DATE_STR;

    // Daily plan subtitle
    const dailyDateLabel = document.getElementById('dailyActiveDateLabel');
    if (dailyDateLabel) {
      dailyDateLabel.textContent = `Planning for ${formatDisplayDate(state.activeDate, true)}`;
    }

    // Dashboard Banner
    const dashJourneyTitle = document.getElementById('dashJourneyTitle');
    const dashDaysCompletedTag = document.getElementById('dashDaysCompletedTag');
    const dashDaysRemainingTag = document.getElementById('dashDaysRemainingTag');
    const dashJourneyProgressBar = document.getElementById('dashJourneyProgressBar');

    if (dashJourneyTitle) dashJourneyTitle.textContent = `Day ${dayIdx} of ${totalDays}`;

    // Days completed = all days before active day + 1 if today has completed items
    const daysBefore = Math.max(0, dayIdx - 1);
    const daysLeft = Math.max(0, totalDays - dayIdx);
    if (dashDaysCompletedTag) dashDaysCompletedTag.textContent = `${daysBefore} Days Completed`;
    if (dashDaysRemainingTag) dashDaysRemainingTag.textContent = `${daysLeft} Days Remaining`;

    if (dashJourneyProgressBar) {
      const pct = Math.min(100, Math.round((dayIdx / totalDays) * 100));
      dashJourneyProgressBar.style.width = `${Math.max(2, pct)}%`;
    }

    const dashPlanDateSubtitle = document.getElementById('dashPlanDateSubtitle');
    if (dashPlanDateSubtitle) {
      dashPlanDateSubtitle.textContent = `Tasks scheduled for ${formatDisplayDate(state.activeDate, true)}`;
    }
  }

  // -------------------------------------------------------------
  // Dashboard View Rendering
  // -------------------------------------------------------------

  function renderDashboard() {
    updateDateBadges();

    const todayTasks = state.tasks.filter(t => t.date === state.activeDate);
    const completedTasks = todayTasks.filter(t => t.completed);

    // Dashboard Task counts
    const dashTaskCount = document.getElementById('dashTaskCount');
    const dashCompletedCount = document.getElementById('dashCompletedCount');
    if (dashTaskCount) dashTaskCount.textContent = `${todayTasks.length} task${todayTasks.length === 1 ? '' : 's'} planned`;
    if (dashCompletedCount) dashCompletedCount.textContent = `${completedTasks.length} completed`;

    // Main Priority Display
    const priorityTask = todayTasks.find(t => t.isPriority);
    const dashPriorityDisplay = document.getElementById('dashPriorityDisplay');
    if (dashPriorityDisplay) {
      if (priorityTask) {
        dashPriorityDisplay.innerHTML = `
          <div class="priority-item-row">
            <label class="custom-checkbox-label">
              <input type="checkbox" class="custom-checkbox" id="dashPriorityCheckbox" ${priorityTask.completed ? 'checked' : ''}>
              <span class="priority-text ${priorityTask.completed ? 'completed' : ''}">${escapeHtml(priorityTask.title)}</span>
            </label>
            <span class="text-xs text-secondary mt-2">${priorityTask.duration ? priorityTask.duration + ' mins • ' : ''}${escapeHtml(priorityTask.category)}</span>
          </div>
        `;
        const cb = document.getElementById('dashPriorityCheckbox');
        if (cb) {
          cb.addEventListener('change', (e) => {
            toggleTaskCompletion(priorityTask.id, e.target.checked);
          });
        }
      } else {
        dashPriorityDisplay.innerHTML = `
          <p class="priority-text empty-hint">No main priority selected for today yet.</p>
          <button class="btn btn-subtle btn-sm" id="dashSetPriorityInlineBtn">Designate Priority</button>
        `;
        const setBtn = document.getElementById('dashSetPriorityInlineBtn');
        if (setBtn) {
          setBtn.addEventListener('click', () => switchView('daily'));
        }
      }
    }

    // Weekly progress
    const activeWeekNum = getWeekForDate(state.activeDate);
    const weekDef = WEEKS_DEF.find(w => w.num === activeWeekNum) || WEEKS_DEF[0];
    const weekTasks = state.tasks.filter(t => t.date >= weekDef.start && t.date <= weekDef.end);
    const weekDone = weekTasks.filter(t => t.completed).length;

    const dashWeekBadge = document.getElementById('dashWeekNumberBadge');
    const dashWeeklyDone = document.getElementById('dashWeeklyTasksDone');
    const dashWeeklyTarget = document.getElementById('dashWeeklyTasksTarget');
    const dashWeeklyProgress = document.getElementById('dashWeeklyProgressBar');

    if (dashWeekBadge) dashWeekBadge.textContent = `Week ${activeWeekNum}`;
    if (dashWeeklyDone) dashWeeklyDone.textContent = weekDone;
    if (dashWeeklyTarget) dashWeeklyTarget.textContent = `/ ${weekTasks.length} tasks`;
    if (dashWeeklyProgress) {
      const pct = weekTasks.length > 0 ? Math.round((weekDone / weekTasks.length) * 100) : 0;
      dashWeeklyProgress.style.width = `${pct}%`;
    }

    // 7-Day Consistency Strip
    renderConsistencyStrip();

    // Dashboard Tasks List (Quick view)
    const taskListEl = document.getElementById('dashTaskList');
    if (taskListEl) {
      if (todayTasks.length === 0) {
        taskListEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <p>No tasks scheduled for this day yet.</p>
            <button class="btn btn-subtle btn-sm mt-2" id="dashEmptyAddTaskBtn">+ Add First Task</button>
          </div>
        `;
        const addBtn = document.getElementById('dashEmptyAddTaskBtn');
        if (addBtn) addBtn.addEventListener('click', () => openTaskModal());
      } else {
        taskListEl.innerHTML = todayTasks.map(task => renderTaskItemHtml(task, false)).join('');
        bindTaskItemEvents(taskListEl);
      }
    }
  }

  function renderConsistencyStrip() {
    const stripEl = document.getElementById('dashConsistencyStrip');
    if (!stripEl) return;

    // Show 7 days ending with activeDate
    const activeDateObj = parseLocalDate(state.activeDate);
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(activeDateObj);
      d.setDate(d.getDate() - i);
      const str = formatLocalDate(d);
      days.push(str);
    }

    stripEl.innerHTML = days.map(dStr => {
      const isCurrent = dStr === state.activeDate;
      const inRange = isDateInRange(dStr);
      const dayTasks = state.tasks.filter(t => t.date === dStr);
      const doneCount = dayTasks.filter(t => t.completed).length;
      const dayHabits = state.habits[dStr] || {};
      const habitsDone = Object.values(dayHabits).filter(Boolean).length;
      const hasReview = !!state.dailyReviews[dStr];
      const isProductive = doneCount > 0 || habitsDone > 0 || hasReview;

      const dObj = parseLocalDate(dStr);
      const dayName = dObj.toLocaleDateString('en-US', { weekday: 'narrow' });
      const dayNum = dObj.getDate();

      let classes = 'consistency-dot';
      if (isCurrent) classes += ' current';
      if (isProductive) classes += ' done';

      return `
        <div class="${classes}" data-date="${dStr}" title="${dStr}: ${doneCount} tasks, ${habitsDone} habits${isProductive ? ' (Active)' : ''}">
          <span>${dayName}</span>
          <span>${dayNum}</span>
        </div>
      `;
    }).join('');

    // Allow clicking strip to navigate
    stripEl.querySelectorAll('.consistency-dot').forEach(el => {
      el.addEventListener('click', () => {
        const d = el.getAttribute('data-date');
        if (isDateInRange(d)) {
          setActiveDate(d);
        }
      });
    });
  }

  // -------------------------------------------------------------
  // Daily Planning & Tasks Rendering
  // -------------------------------------------------------------

  function renderDailyPlan() {
    updateDateBadges();

    const todayTasks = state.tasks.filter(t => t.date === state.activeDate);
    const priorityTask = todayTasks.find(t => t.isPriority);

    // North Star / Priority Headline
    const headline = document.getElementById('dailyPriorityHeadline');
    const subtext = document.getElementById('dailyPrioritySubtext');
    const btnArea = document.getElementById('dailyPriorityBtnArea');

    if (headline && subtext && btnArea) {
      if (priorityTask) {
        headline.textContent = priorityTask.title;
        subtext.textContent = priorityTask.completed
          ? 'Completed! Main priority achieved for 10 points.'
          : `${priorityTask.duration ? priorityTask.duration + ' minutes estimated • ' : ''}Category: ${priorityTask.category}`;
        btnArea.innerHTML = `
          <button class="btn btn-subtle btn-sm" id="unsetPriorityBtn">Change Priority</button>
        `;
        const unsetBtn = document.getElementById('unsetPriorityBtn');
        if (unsetBtn) {
          unsetBtn.addEventListener('click', () => {
            priorityTask.isPriority = false;
            saveState();
            renderDailyPlan();
            renderDashboard();
          });
        }
      } else {
        headline.textContent = 'No main priority designated';
        subtext.textContent = 'Designate one task as your primary focus. Completing it awards 10 points.';
        btnArea.innerHTML = `
          <button class="btn btn-secondary btn-sm" id="choosePriorityBtn">Pick from Tasks</button>
        `;
        const chooseBtn = document.getElementById('choosePriorityBtn');
        if (chooseBtn) {
          chooseBtn.addEventListener('click', () => {
            if (todayTasks.length === 0) {
              openTaskModal(null, true);
            } else {
              showToast('Click the star icon on any task below to set it as main priority.', 'info');
            }
          });
        }
      }
    }

    // Daily Habits List
    renderDailyHabits();

    // Custom Tasks List with Category Filter
    renderDailyTaskList();
  }

  function renderDailyHabits() {
    const habitsListEl = document.getElementById('dailyHabitsList');
    const progressBadge = document.getElementById('dailyHabitsProgressBadge');
    if (!habitsListEl) return;

    const todayHabits = state.habits[state.activeDate] || {};
    let doneCount = 0;

    habitsListEl.innerHTML = DEFAULT_HABITS.map(habit => {
      const isDone = !!todayHabits[habit.key];
      if (isDone) doneCount++;

      return `
        <div class="habit-card ${isDone ? 'completed' : ''}" data-key="${habit.key}">
          <div class="habit-left">
            <input type="checkbox" class="custom-checkbox habit-checkbox" data-key="${habit.key}" ${isDone ? 'checked' : ''} aria-label="${habit.title}">
            <div>
              <span class="habit-title">${escapeHtml(habit.title)}</span>
              <div class="text-xs text-secondary">${escapeHtml(habit.category)}</div>
            </div>
          </div>
          ${habit.points > 0 ? `<span class="habit-points">+${habit.points} pts</span>` : ''}
        </div>
      `;
    }).join('');

    if (progressBadge) {
      progressBadge.textContent = `${doneCount} / ${DEFAULT_HABITS.length} done`;
      if (doneCount === DEFAULT_HABITS.length) {
        progressBadge.classList.add('badge-mint');
      } else {
        progressBadge.classList.remove('badge-mint');
      }
    }

    // Habit checkbox event listeners
    habitsListEl.querySelectorAll('.habit-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const key = e.target.getAttribute('data-key');
        const checked = e.target.checked;
        toggleHabit(key, checked);
      });
    });
  }

  function toggleHabit(habitKey, isCompleted) {
    if (!state.habits[state.activeDate]) {
      state.habits[state.activeDate] = {};
    }
    state.habits[state.activeDate][habitKey] = isCompleted;

    const habitDef = DEFAULT_HABITS.find(h => h.key === habitKey);
    if (habitDef && habitDef.points > 0 && habitDef.actionPrefix) {
      const actionKey = `${habitDef.actionPrefix}_${state.activeDate}`;
      if (isCompleted) {
        awardPoints(actionKey, state.activeDate, habitDef.points, habitDef.title);
      } else {
        removePoints(actionKey);
      }
    }

    saveState();
    renderDailyPlan();
    renderDashboard();
  }

  function renderDailyTaskList() {
    const listEl = document.getElementById('dailyTaskList');
    if (!listEl) return;

    let tasks = state.tasks.filter(t => t.date === state.activeDate);
    if (currentCategoryFilter !== 'all') {
      tasks = tasks.filter(t => t.category === currentCategoryFilter);
    }

    if (tasks.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>No tasks found ${currentCategoryFilter !== 'all' ? `in category "${currentCategoryFilter}"` : 'for this date'}.</p>
          <button class="btn btn-secondary btn-sm mt-2" id="dailyEmptyAddBtn">+ Add Task</button>
        </div>
      `;
      const btn = document.getElementById('dailyEmptyAddBtn');
      if (btn) btn.addEventListener('click', () => openTaskModal());
    } else {
      listEl.innerHTML = tasks.map(task => renderTaskItemHtml(task, true)).join('');
      bindTaskItemEvents(listEl);
    }
  }

  function renderTaskItemHtml(task, showFullControls = true) {
    const catClass = task.category.replace(/\s+/g, '-');
    return `
      <div class="task-item ${task.isPriority ? 'is-priority' : ''} ${task.completed ? 'is-completed' : ''}" data-id="${task.id}">
        <div class="task-left">
          <input type="checkbox" class="custom-checkbox task-check" data-id="${task.id}" ${task.completed ? 'checked' : ''} aria-label="Mark task ${escapeHtml(task.title)} complete">
          <div class="task-body">
            <div class="task-title-line">
              <span class="task-title">${escapeHtml(task.title)}</span>
              <span class="category-tag ${catClass}">${escapeHtml(task.category)}</span>
              ${task.isPriority ? '<span class="badge badge-accent">Main Priority</span>' : ''}
            </div>
            <div class="task-meta-line">
              ${task.duration ? `<span class="duration-tag">${task.duration} mins</span>` : ''}
              ${task.note ? `<span class="task-note-text">${escapeHtml(task.note)}</span>` : ''}
            </div>
          </div>
        </div>
        ${showFullControls ? `
          <div class="task-right-actions">
            <button class="btn-icon btn-make-priority" data-id="${task.id}" title="${task.isPriority ? 'Main priority' : 'Set as main priority'}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="${task.isPriority ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
            <button class="btn-icon btn-edit-task" data-id="${task.id}" title="Edit task">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button class="btn-icon btn-delete-task" data-id="${task.id}" title="Delete task">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  function bindTaskItemEvents(container) {
    // Checkboxes
    container.querySelectorAll('.task-check').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        toggleTaskCompletion(id, e.target.checked);
      });
    });

    // Make Priority button
    container.querySelectorAll('.btn-make-priority').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        setTaskAsPriority(id);
      });
    });

    // Edit task button
    container.querySelectorAll('.btn-edit-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        const task = state.tasks.find(t => t.id === id);
        if (task) openTaskModal(task);
      });
    });

    // Delete task button
    container.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        openConfirmModal('Delete Task', 'Are you sure you want to delete this task?', () => {
          deleteTask(id);
        });
      });
    });
  }

  function toggleTaskCompletion(taskId, isCompleted) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = isCompleted;

    // Check points eligibility
    if (task.isPriority) {
      const actionKey = `priority_${task.date}_${task.id}`;
      if (isCompleted) {
        awardPoints(actionKey, task.date, 10, `Completed main priority: ${task.title}`);
      } else {
        removePoints(actionKey);
      }
    } else if (task.category === 'Main Project' || task.category === 'University') {
      const actionKey = `task_session_${task.date}_${task.id}`;
      if (isCompleted) {
        awardPoints(actionKey, task.date, 5, `Completed session: ${task.title}`);
      } else {
        removePoints(actionKey);
      }
    }

    saveState();
    renderDailyPlan();
    renderDashboard();
  }

  function setTaskAsPriority(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    // If it's already priority, toggle off
    if (task.isPriority) {
      task.isPriority = false;
      // If was completed, remove priority points
      if (task.completed) {
        removePoints(`priority_${task.date}_${task.id}`);
      }
    } else {
      // Remove priority flag from any other task on this date
      state.tasks.forEach(t => {
        if (t.date === task.date && t.id !== taskId && t.isPriority) {
          t.isPriority = false;
        }
      });
      task.isPriority = true;
      if (task.completed) {
        awardPoints(`priority_${task.date}_${task.id}`, task.date, 10, `Completed main priority: ${task.title}`);
      }
    }

    saveState();
    renderDailyPlan();
    renderDashboard();
  }

  function deleteTask(taskId) {
    const idx = state.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const task = state.tasks[idx];
      // Clean up points if it was awarded
      removePoints(`priority_${task.date}_${task.id}`);
      removePoints(`task_session_${task.date}_${task.id}`);
      state.tasks.splice(idx, 1);
      saveState();
      renderDailyPlan();
      renderDashboard();
      showToast('Task removed.', 'info');
    }
  }

  // -------------------------------------------------------------
  // Task Modal Handlers (Create & Edit)
  // -------------------------------------------------------------

  function openTaskModal(taskToEdit = null, forcePriority = false) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const titleHeader = document.getElementById('taskModalTitle');
    const idInput = document.getElementById('taskModalId');
    const titleInput = document.getElementById('taskModalTitleInput');
    const catInput = document.getElementById('taskModalCategory');
    const durInput = document.getElementById('taskModalDuration');
    const dateInput = document.getElementById('taskModalDate');
    const noteInput = document.getElementById('taskModalNote');
    const priorityCheckbox = document.getElementById('taskModalIsPriority');

    form.reset();

    if (taskToEdit) {
      titleHeader.textContent = 'Edit Task';
      idInput.value = taskToEdit.id;
      titleInput.value = taskToEdit.title;
      catInput.value = taskToEdit.category;
      durInput.value = taskToEdit.duration || '';
      dateInput.value = taskToEdit.date;
      noteInput.value = taskToEdit.note || '';
      priorityCheckbox.checked = !!taskToEdit.isPriority;
    } else {
      titleHeader.textContent = 'Add New Task';
      idInput.value = '';
      dateInput.value = state.activeDate;
      priorityCheckbox.checked = forcePriority;
    }

    modal.classList.remove('hidden');
    titleInput.focus();
  }

  function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.add('hidden');
  }

  function handleTaskFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('taskModalId').value;
    const title = document.getElementById('taskModalTitleInput').value.trim();
    const category = document.getElementById('taskModalCategory').value;
    const duration = parseInt(document.getElementById('taskModalDuration').value, 10) || null;
    const date = document.getElementById('taskModalDate').value;
    const note = document.getElementById('taskModalNote').value.trim();
    const isPriority = document.getElementById('taskModalIsPriority').checked;

    if (!title) {
      showToast('Please enter a task title.', 'error');
      return;
    }

    if (!isDateInRange(date)) {
      showToast(`Date must be between ${START_DATE_STR} and ${END_DATE_STR}.`, 'error');
      return;
    }

    // If set as priority, unset any other priority on that date
    if (isPriority) {
      state.tasks.forEach(t => {
        if (t.date === date && t.id !== id && t.isPriority) {
          t.isPriority = false;
        }
      });
    }

    if (id) {
      // Editing existing task
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        task.title = title;
        task.category = category;
        task.duration = duration;
        task.date = date;
        task.note = note;
        task.isPriority = isPriority;
      }
      showToast('Task updated.', 'success');
    } else {
      // Create new task
      const newTask = {
        id: generateId('task'),
        title: title,
        category: category,
        duration: duration,
        completed: false,
        note: note,
        isPriority: isPriority,
        date: date,
        createdAt: new Date().toISOString()
      };
      state.tasks.push(newTask);
      showToast('Task added.', 'success');
    }

    saveState();
    closeTaskModal();
    renderDailyPlan();
    renderDashboard();
  }

  // -------------------------------------------------------------
  // 65-Day Journey Calendar View
  // -------------------------------------------------------------

  function renderJourneyView() {
    renderMonthGrid('2026-10', 'journeyGridOctober', 27, 31);
    renderMonthGrid('2026-11', 'journeyGridNovember', 1, 30);
    renderMonthGrid('2026-12', 'journeyGridDecember', 1, 31);
  }

  function renderMonthGrid(yearMonth, containerId, startDay, endDay) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '';
    for (let day = startDay; day <= endDay; day++) {
      const dayStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
      const dayIdx = calculateDayIndex(dayStr);
      const isToday = dayStr === state.activeDate;

      // Stats for day
      const dayTasks = state.tasks.filter(t => t.date === dayStr);
      const doneTasks = dayTasks.filter(t => t.completed).length;
      const dayHabits = state.habits[dayStr] || {};
      const doneHabits = Object.values(dayHabits).filter(Boolean).length;
      const reviewDone = !!state.dailyReviews[dayStr];
      const isProductive = doneTasks > 0 || doneHabits > 0 || reviewDone;

      // Points earned on this date
      const dayPoints = state.pointsLedger
        .filter(p => p.date === dayStr)
        .reduce((sum, p) => sum + p.points, 0);

      let classes = 'cal-day-cell';
      if (isToday) classes += ' is-today';
      if (isProductive) classes += ' is-completed';

      html += `
        <div class="${classes}" data-date="${dayStr}">
          <div class="cal-day-header">
            <span class="cal-day-num">${day}</span>
            <span class="cal-day-seq">D${dayIdx}</span>
          </div>
          <div class="cal-day-status">
            ${dayTasks.length > 0 ? `${doneTasks}/${dayTasks.length} tasks` : (doneHabits > 0 ? `${doneHabits} habits` : 'Quiet')}
          </div>
          ${dayPoints > 0 ? `<div class="cal-day-points">+${dayPoints} pts</div>` : ''}
        </div>
      `;
    }

    container.innerHTML = html;

    // Attach click listeners to open inspector modal
    container.querySelectorAll('.cal-day-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const d = cell.getAttribute('data-date');
        openDayInspectorModal(d);
      });
    });
  }

  function openDayInspectorModal(dateStr) {
    const modal = document.getElementById('dayInspectorModal');
    const dayTag = document.getElementById('inspectorDayTag');
    const title = document.getElementById('dayInspectorTitle');
    const body = document.getElementById('dayInspectorBody');
    const makeActiveBtn = document.getElementById('inspectorMakeActiveBtn');

    const dayIdx = calculateDayIndex(dateStr);
    const totalDays = getTotalJourneyDays();

    dayTag.textContent = `Day ${dayIdx} of ${totalDays}`;
    title.textContent = formatDisplayDate(dateStr, true);

    const dayTasks = state.tasks.filter(t => t.date === dateStr);
    const dayHabits = state.habits[dateStr] || {};
    const review = state.dailyReviews[dateStr];
    const projectLog = state.projectLogs.find(p => p.date === dateStr);
    const studyLog = state.studySessions.filter(s => s.date === dateStr);
    const screen = state.screenTime.find(s => s.date === dateStr);
    const pts = state.pointsLedger.filter(p => p.date === dateStr);

    let contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem; color: var(--accent-violet);">Planned Tasks (${dayTasks.length})</h4>
          ${dayTasks.length === 0 ? '<p class="text-secondary text-xs">No tasks scheduled.</p>' : `
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.35rem;">
              ${dayTasks.map(t => `
                <li style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.45rem;">
                  <span>${t.completed ? '✓' : '○'}</span>
                  <span style="${t.completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${escapeHtml(t.title)}</span>
                  ${t.isPriority ? '<span class="badge badge-accent">Priority</span>' : ''}
                </li>
              `).join('')}
            </ul>
          `}
        </div>

        <div>
          <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem; color: var(--accent-violet);">Core Habits</h4>
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            ${DEFAULT_HABITS.map(h => {
              const done = !!dayHabits[h.key];
              return `<span class="badge ${done ? 'badge-mint' : ''}">${done ? '✓ ' : ''}${escapeHtml(h.title)}</span>`;
            }).join('')}
          </div>
        </div>

        ${review ? `
          <div>
            <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem; color: var(--accent-violet);">Daily Review Recorded</h4>
            <p class="text-xs text-secondary"><strong>Accomplished:</strong> ${escapeHtml(review.accomplished)}</p>
            <p class="text-xs text-secondary mt-2"><strong>Tomorrow Priority:</strong> ${escapeHtml(review.tomorrowPriority)}</p>
          </div>
        ` : ''}

        ${projectLog ? `
          <div>
            <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem; color: var(--accent-violet);">Project Development Log</h4>
            <p class="text-xs text-secondary">${escapeHtml(projectLog.workedOn)}</p>
          </div>
        ` : ''}

        ${screen ? `
          <div>
            <span class="text-xs text-secondary">Phone Screen Time: <strong>${screen.hours}h ${screen.minutes}m</strong></span>
          </div>
        ` : ''}

        <div>
          <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem; color: var(--accent-amber);">Points Earned on this Date: ${pts.reduce((s, p) => s + p.points, 0)} pts</h4>
          ${pts.length === 0 ? '<p class="text-secondary text-xs">No points earned on this date.</p>' : `
            <ul style="list-style: none; font-size: 0.78rem; display: flex; flex-direction: column; gap: 0.2rem;">
              ${pts.map(p => `<li>• +${p.points} pts (${escapeHtml(p.label)})</li>`).join('')}
            </ul>
          `}
        </div>
      </div>
    `;

    body.innerHTML = contentHtml;

    makeActiveBtn.onclick = () => {
      setActiveDate(dateStr);
      modal.classList.add('hidden');
      switchView('daily');
    };

    modal.classList.remove('hidden');
  }

  // -------------------------------------------------------------
  // Main Project & GitHub Log View
  // -------------------------------------------------------------

  function renderProjectView() {
    const listEl = document.getElementById('projectLogList');
    const badge = document.getElementById('projectLogCountBadge');
    const dateInput = document.getElementById('projectLogDate');

    if (dateInput) dateInput.value = state.activeDate;
    if (badge) badge.textContent = `${state.projectLogs.length} entries recorded`;

    if (!listEl) return;

    if (state.projectLogs.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💻</div>
          <p>No project logs recorded yet. Document your development progress above.</p>
        </div>
      `;
      return;
    }

    // Sort descending by date
    const sorted = [...state.projectLogs].sort((a, b) => b.date.localeCompare(a.date));

    listEl.innerHTML = sorted.map(log => `
      <div class="log-entry-card">
        <div class="log-entry-head">
          <span class="log-entry-date">${formatDisplayDate(log.date, true)} (Day ${calculateDayIndex(log.date)})</span>
          <button class="text-link text-xs delete-project-btn" data-id="${log.id}">Delete</button>
        </div>
        <div class="log-entry-section">
          <h5>What I worked on</h5>
          <p>${escapeHtml(log.workedOn)}</p>
        </div>
        ${log.completed ? `
          <div class="log-entry-section">
            <h5>What I completed</h5>
            <p>${escapeHtml(log.completed)}</p>
          </div>
        ` : ''}
        ${log.learned ? `
          <div class="log-entry-section">
            <h5>What I learned</h5>
            <p>${escapeHtml(log.learned)}</p>
          </div>
        ` : ''}
        ${log.nextPlan ? `
          <div class="log-entry-section">
            <h5>Next clear step</h5>
            <p>${escapeHtml(log.nextPlan)}</p>
          </div>
        ` : ''}
        ${log.commitUrl ? `
          <div>
            <a href="${escapeHtml(log.commitUrl)}" target="_blank" rel="noopener noreferrer" class="commit-link-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="4"></circle>
                <line x1="1.05" y1="12" x2="7" y2="12"></line>
                <line x1="17.01" y1="12" x2="22.96" y2="12"></line>
              </svg>
              <span>GitHub Commit / PR</span>
            </a>
          </div>
        ` : ''}
      </div>
    `).join('');

    // Delete project log event
    listEl.querySelectorAll('.delete-project-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openConfirmModal('Delete Entry', 'Are you sure you want to delete this project log entry?', () => {
          const idx = state.projectLogs.findIndex(p => p.id === id);
          if (idx !== -1) {
            const removed = state.projectLogs[idx];
            removePoints(`project_log_${removed.date}`);
            state.projectLogs.splice(idx, 1);
            saveState();
            renderProjectView();
            showToast('Entry removed.', 'info');
          }
        });
      });
    });
  }

  function handleProjectFormSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('projectLogDate').value;
    const commitUrl = document.getElementById('projectCommitUrl').value.trim();
    const workedOn = document.getElementById('projectWorkedOn').value.trim();
    const completed = document.getElementById('projectCompleted').value.trim();
    const learned = document.getElementById('projectLearned').value.trim();
    const nextPlan = document.getElementById('projectNextPlan').value.trim();

    if (!workedOn) {
      showToast('Please state what you worked on.', 'error');
      return;
    }

    const newLog = {
      id: generateId('proj'),
      date: date,
      commitUrl: commitUrl,
      workedOn: workedOn,
      completed: completed,
      learned: learned,
      nextPlan: nextPlan,
      createdAt: new Date().toISOString()
    };

    state.projectLogs.push(newLog);

    // Award 5 points for project work session
    awardPoints(`project_log_${date}`, date, 5, 'Recorded main software project progress');

    // Also mark project habit complete for this date if present
    if (!state.habits[date]) state.habits[date] = {};
    state.habits[date]['habit_project'] = true;

    // If commit URL is provided, also award GitHub contribution points
    if (commitUrl) {
      awardPoints(`habit_github_${date}`, date, 3, 'Recorded meaningful GitHub contribution');
      state.habits[date]['habit_github'] = true;
    }

    saveState();
    e.target.reset();
    document.getElementById('projectLogDate').value = state.activeDate;
    renderProjectView();
    showToast('Project progress saved successfully.', 'success');
  }

  // -------------------------------------------------------------
  // University & Internship View
  // -------------------------------------------------------------

  function renderAcademicView() {
    renderExamsList();
    renderStudySessionsList();
    renderInternshipList();
  }

  function renderExamsList() {
    const listEl = document.getElementById('examsList');
    if (!listEl) return;

    if (state.exams.length === 0) {
      listEl.innerHTML = `<p class="text-xs text-secondary">No upcoming exams or deadlines recorded.</p>`;
      return;
    }

    // Sort by date
    const sorted = [...state.exams].sort((a, b) => a.date.localeCompare(b.date));

    listEl.innerHTML = sorted.map(exam => `
      <div class="log-entry-card" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
            <strong style="font-size: 0.95rem; color: var(--text-main);">${escapeHtml(exam.title)}</strong>
            <span class="badge ${exam.type === 'Exam' ? 'badge-amber' : 'badge-accent'}">${escapeHtml(exam.type)}</span>
          </div>
          <div class="text-xs text-secondary">
            Date: <strong>${formatDisplayDate(exam.date, true)}</strong> • Status: <span style="color: var(--accent-violet);">${escapeHtml(exam.status || 'Scheduled')}</span>
          </div>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-subtle btn-xs edit-exam-btn" data-id="${exam.id}">Edit</button>
          <button class="btn btn-subtle btn-xs delete-exam-btn" data-id="${exam.id}">Delete</button>
        </div>
      </div>
    `).join('');

    // Events
    listEl.querySelectorAll('.edit-exam-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const exam = state.exams.find(e => e.id === id);
        if (exam) openExamModal(exam);
      });
    });

    listEl.querySelectorAll('.delete-exam-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openConfirmModal('Delete Deadline', 'Are you sure you want to remove this item?', () => {
          state.exams = state.exams.filter(e => e.id !== id);
          saveState();
          renderExamsList();
          showToast('Deadline removed.', 'info');
        });
      });
    });
  }

  function renderStudySessionsList() {
    const listEl = document.getElementById('studySessionsList');
    if (!listEl) return;

    if (state.studySessions.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No study sessions recorded yet.</p>
        </div>
      `;
      return;
    }

    const sorted = [...state.studySessions].sort((a, b) => b.date.localeCompare(a.date));

    listEl.innerHTML = sorted.map(session => `
      <div class="log-entry-card">
        <div class="log-entry-head">
          <div>
            <strong style="color: var(--text-main); font-size: 0.9rem;">${escapeHtml(session.subject)}</strong>
            <span class="text-xs text-secondary" style="margin-left: 0.5rem;">${session.duration} mins</span>
          </div>
          <span class="text-xs text-secondary">${formatDisplayDate(session.date)}</span>
        </div>
        ${session.topics ? `<p class="text-xs text-secondary">${escapeHtml(session.topics)}</p>` : ''}
      </div>
    `).join('');
  }

  function renderInternshipList() {
    const listEl = document.getElementById('internshipList');
    if (!listEl) return;

    if (state.internshipTasks.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No internship responsibilities recorded yet.</p>
        </div>
      `;
      return;
    }

    const sorted = [...state.internshipTasks].sort((a, b) => b.date.localeCompare(a.date));

    listEl.innerHTML = sorted.map(item => `
      <div class="log-entry-card" style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
            <strong style="font-size: 0.9rem; color: var(--text-main);">${escapeHtml(item.title)}</strong>
            <span class="badge">${escapeHtml(item.type)}</span>
          </div>
          <div class="text-xs text-secondary">Due: ${formatDisplayDate(item.date)}</div>
          ${item.notes ? `<p class="text-xs text-secondary mt-2">${escapeHtml(item.notes)}</p>` : ''}
        </div>
        <button class="btn btn-subtle btn-xs delete-internship-btn" data-id="${item.id}">Delete</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.delete-internship-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        state.internshipTasks = state.internshipTasks.filter(i => i.id !== id);
        saveState();
        renderInternshipList();
        showToast('Internship item removed.', 'info');
      });
    });
  }

  // Modals for Academic
  function openStudyModal() {
    const modal = document.getElementById('studyModal');
    const dateInput = document.getElementById('studyDate');
    document.getElementById('studyForm').reset();
    dateInput.value = state.activeDate;
    modal.classList.remove('hidden');
  }

  function handleStudyFormSubmit(e) {
    e.preventDefault();
    const subject = document.getElementById('studySubject').value.trim();
    const date = document.getElementById('studyDate').value;
    const duration = parseInt(document.getElementById('studyDuration').value, 10) || 60;
    const topics = document.getElementById('studyTopics').value.trim();

    const session = {
      id: generateId('study'),
      subject: subject,
      date: date,
      duration: duration,
      topics: topics,
      completed: true,
      createdAt: new Date().toISOString()
    };

    state.studySessions.push(session);

    // Award 5 points for university study session
    awardPoints(`study_session_${date}_${session.id}`, date, 5, `University study session: ${subject}`);

    // Mark habit done
    if (!state.habits[date]) state.habits[date] = {};
    state.habits[date]['habit_study'] = true;

    saveState();
    document.getElementById('studyModal').classList.add('hidden');
    renderAcademicView();
    renderDailyPlan();
    renderDashboard();
    showToast('University study session recorded (+5 pts).', 'success');
  }

  function openExamModal(examToEdit = null) {
    const modal = document.getElementById('examModal');
    const idInput = document.getElementById('examModalId');
    const titleInput = document.getElementById('examTitle');
    const dateInput = document.getElementById('examDate');
    const typeInput = document.getElementById('examType');
    const statusInput = document.getElementById('examStatus');

    document.getElementById('examForm').reset();

    if (examToEdit) {
      idInput.value = examToEdit.id;
      titleInput.value = examToEdit.title;
      dateInput.value = examToEdit.date;
      typeInput.value = examToEdit.type;
      statusInput.value = examToEdit.status || '';
    } else {
      idInput.value = '';
      dateInput.value = state.activeDate;
    }

    modal.classList.remove('hidden');
  }

  function handleExamFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('examModalId').value;
    const title = document.getElementById('examTitle').value.trim();
    const date = document.getElementById('examDate').value;
    const type = document.getElementById('examType').value;
    const status = document.getElementById('examStatus').value.trim();

    if (id) {
      const exam = state.exams.find(e => e.id === id);
      if (exam) {
        exam.title = title;
        exam.date = date;
        exam.type = type;
        exam.status = status;
      }
    } else {
      state.exams.push({
        id: generateId('exam'),
        title: title,
        date: date,
        type: type,
        status: status
      });
    }

    saveState();
    document.getElementById('examModal').classList.add('hidden');
    renderExamsList();
    showToast('Exam / deadline saved.', 'success');
  }

  function openInternshipModal() {
    const modal = document.getElementById('internshipModal');
    const dateInput = document.getElementById('internshipDate');
    document.getElementById('internshipForm').reset();
    dateInput.value = state.activeDate;
    modal.classList.remove('hidden');
  }

  function handleInternshipFormSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('internshipTitle').value.trim();
    const date = document.getElementById('internshipDate').value;
    const type = document.getElementById('internshipType').value;
    const notes = document.getElementById('internshipNotes').value.trim();

    state.internshipTasks.push({
      id: generateId('intern'),
      title: title,
      date: date,
      type: type,
      notes: notes,
      completed: false,
      createdAt: new Date().toISOString()
    });

    saveState();
    document.getElementById('internshipModal').classList.add('hidden');
    renderInternshipList();
    showToast('Internship item saved.', 'success');
  }

  // -------------------------------------------------------------
  // Phone Screen-Time Tracking View
  // -------------------------------------------------------------

  function renderScreenTimeView() {
    const dateInput = document.getElementById('screenDate');
    if (dateInput) dateInput.value = state.activeDate;

    const countBadge = document.getElementById('screenTimeCountBadge');
    if (countBadge) countBadge.textContent = `${state.screenTime.length} logged`;

    renderScreenTimeTrend();
    renderScreenTimeHistory();
  }

  function renderScreenTimeTrend() {
    const chart = document.getElementById('screenTimeTrendChart');
    const avgBadge = document.getElementById('screenAverageBadge');
    if (!chart) return;

    if (state.screenTime.length === 0) {
      chart.innerHTML = `<p class="text-xs text-secondary" style="margin: auto;">No screen time logged yet. Enter your Android Wellbeing data.</p>`;
      if (avgBadge) avgBadge.textContent = 'Avg: --';
      return;
    }

    // Take last 7 entries sorted by date
    const sorted = [...state.screenTime].sort((a, b) => a.date.localeCompare(b.date));
    const recent = sorted.slice(-7);

    const totalMinAll = sorted.reduce((sum, s) => sum + s.totalMinutes, 0);
    const avgMin = Math.round(totalMinAll / sorted.length);
    const avgH = Math.floor(avgMin / 60);
    const avgM = avgMin % 60;
    if (avgBadge) avgBadge.textContent = `Avg: ${avgH}h ${avgM}m`;

    const maxMinutes = Math.max(...recent.map(r => r.totalMinutes), 240); // at least 4h scale

    chart.innerHTML = recent.map(entry => {
      const h = Math.floor(entry.totalMinutes / 60);
      const m = entry.totalMinutes % 60;
      const heightPct = Math.max(8, Math.min(100, Math.round((entry.totalMinutes / maxMinutes) * 100)));
      const dObj = parseLocalDate(entry.date);
      const dayLabel = dObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

      return `
        <div class="trend-bar-col">
          <span class="trend-bar-val">${h}h${m > 0 ? m : ''}</span>
          <div class="trend-bar" style="height: ${heightPct}%;"></div>
          <span class="trend-bar-label">${dayLabel}</span>
        </div>
      `;
    }).join('');
  }

  function renderScreenTimeHistory() {
    const listEl = document.getElementById('screenHistoryList');
    if (!listEl) return;

    if (state.screenTime.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><p>No screen time history.</p></div>`;
      return;
    }

    const sorted = [...state.screenTime].sort((a, b) => b.date.localeCompare(a.date));

    listEl.innerHTML = sorted.map(item => `
      <div class="log-entry-card" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="display: flex; align-items: baseline; gap: 0.5rem;">
            <strong style="font-size: 1.05rem; font-family: var(--font-mono); color: var(--accent-violet);">${item.hours}h ${item.minutes}m</strong>
            <span class="text-xs text-secondary">${formatDisplayDate(item.date, true)}</span>
          </div>
          ${item.notes ? `<p class="text-xs text-secondary mt-2">${escapeHtml(item.notes)}</p>` : ''}
        </div>
        <button class="text-link text-xs delete-screen-btn" data-id="${item.id}">Delete</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.delete-screen-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        state.screenTime = state.screenTime.filter(s => s.id !== id);
        saveState();
        renderScreenTimeView();
        showToast('Screen time entry deleted.', 'info');
      });
    });
  }

  function handleScreenTimeFormSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('screenDate').value;
    const hours = parseInt(document.getElementById('screenHours').value, 10) || 0;
    const minutes = parseInt(document.getElementById('screenMinutes').value, 10) || 0;
    const notes = document.getElementById('screenNotes').value.trim();

    const totalMinutes = (hours * 60) + minutes;

    // Check if entry already exists for this date, replace or add
    const existingIdx = state.screenTime.findIndex(s => s.date === date);
    if (existingIdx !== -1) {
      state.screenTime[existingIdx] = {
        id: state.screenTime[existingIdx].id,
        date: date,
        hours: hours,
        minutes: minutes,
        totalMinutes: totalMinutes,
        notes: notes,
        createdAt: new Date().toISOString()
      };
    } else {
      state.screenTime.push({
        id: generateId('screen'),
        date: date,
        hours: hours,
        minutes: minutes,
        totalMinutes: totalMinutes,
        notes: notes,
        createdAt: new Date().toISOString()
      });
    }

    // Mark habit done for this date
    if (!state.habits[date]) state.habits[date] = {};
    state.habits[date]['habit_screentime'] = true;

    saveState();
    renderScreenTimeView();
    renderDailyPlan();
    renderDashboard();
    showToast('Screen time recorded from Android Wellbeing.', 'success');
  }

  // -------------------------------------------------------------
  // Reviews View (Daily & Weekly)
  // -------------------------------------------------------------

  function renderReviewsView() {
    renderDailyReviewSection();
    renderWeeklyReviewSection();
  }

  function renderDailyReviewSection() {
    const dateInput = document.getElementById('dailyReviewDate');
    const header = document.getElementById('dailyReviewHeader');
    const badge = document.getElementById('dailyReviewCountBadge');

    if (dateInput) dateInput.value = state.activeDate;
    if (header) header.textContent = `Daily Review for ${formatDisplayDate(state.activeDate, true)}`;

    const reviewKeys = Object.keys(state.dailyReviews);
    if (badge) badge.textContent = `${reviewKeys.length} recorded`;

    // Populate existing values if activeDate already has a review
    const existing = state.dailyReviews[state.activeDate];
    const accInput = document.getElementById('reviewAccomplished');
    const learnInput = document.getElementById('reviewLearned');
    const distInput = document.getElementById('reviewDistracted');
    const prioInput = document.getElementById('reviewTomorrowPriority');
    const effortHidden = document.getElementById('reviewEffortVal');

    if (existing) {
      accInput.value = existing.accomplished || '';
      learnInput.value = existing.learned || '';
      distInput.value = existing.distracted || '';
      prioInput.value = existing.tomorrowPriority || '';
      if (effortHidden) effortHidden.value = existing.effortRating || 3;
      setEffortRatingUI(existing.effortRating || 3);
    } else {
      accInput.value = '';
      learnInput.value = '';
      distInput.value = '';
      prioInput.value = '';
      if (effortHidden) effortHidden.value = 3;
      setEffortRatingUI(3);
    }

    // Past reviews history
    renderDailyReviewHistory();
  }

  function setEffortRatingUI(val) {
    document.querySelectorAll('#effortRatingSelector .rating-btn').forEach(btn => {
      const bVal = parseInt(btn.getAttribute('data-val'), 10);
      if (bVal === parseInt(val, 10)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function renderDailyReviewHistory() {
    const listEl = document.getElementById('dailyReviewHistoryList');
    if (!listEl) return;

    const dates = Object.keys(state.dailyReviews).sort().reverse();
    if (dates.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><p>No daily reviews recorded yet.</p></div>`;
      return;
    }

    listEl.innerHTML = dates.map(dStr => {
      const r = state.dailyReviews[dStr];
      const ratingLabels = ['', 'Gentle', 'Steady', 'Focused', 'Strong', 'Exceptional'];
      const ratingText = ratingLabels[r.effortRating] || 'Focused';

      return `
        <div class="log-entry-card">
          <div class="log-entry-head">
            <span class="log-entry-date">${formatDisplayDate(dStr, true)} (Day ${calculateDayIndex(dStr)})</span>
            <span class="badge badge-mint">Effort: ${r.effortRating} • ${ratingText}</span>
          </div>
          <div class="log-entry-section">
            <h5>Accomplished</h5>
            <p>${escapeHtml(r.accomplished)}</p>
          </div>
          ${r.learned ? `
            <div class="log-entry-section">
              <h5>Learned</h5>
              <p>${escapeHtml(r.learned)}</p>
            </div>
          ` : ''}
          ${r.distracted ? `
            <div class="log-entry-section">
              <h5>Distractions</h5>
              <p>${escapeHtml(r.distracted)}</p>
            </div>
          ` : ''}
          <div class="log-entry-section">
            <h5>Tomorrow's Priority</h5>
            <p style="color: var(--accent-violet); font-weight: 500;">${escapeHtml(r.tomorrowPriority)}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  function handleDailyReviewFormSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('dailyReviewDate').value;
    const accomplished = document.getElementById('reviewAccomplished').value.trim();
    const learned = document.getElementById('reviewLearned').value.trim();
    const distracted = document.getElementById('reviewDistracted').value.trim();
    const tomorrowPriority = document.getElementById('reviewTomorrowPriority').value.trim();
    const effortRating = parseInt(document.getElementById('reviewEffortVal').value, 10) || 3;

    state.dailyReviews[date] = {
      accomplished: accomplished,
      learned: learned,
      distracted: distracted,
      tomorrowPriority: tomorrowPriority,
      effortRating: effortRating,
      completedAt: new Date().toISOString()
    };

    // Mark habit done
    if (!state.habits[date]) state.habits[date] = {};
    state.habits[date]['habit_review'] = true;

    // Award 2 points for daily review
    awardPoints(`daily_review_${date}`, date, 2, 'Completed end-of-day review');

    saveState();
    renderReviewsView();
    renderDailyPlan();
    renderDashboard();
    showToast('Daily review saved (+2 pts).', 'success');
  }

  // Weekly Review Section
  function populateWeeklyDropdown() {
    const dropdown = document.getElementById('weeklySelectDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = WEEKS_DEF.map(w => `
      <option value="${w.num}">${w.label}</option>
    `).join('');

    const activeWeek = getWeekForDate(state.activeDate);
    dropdown.value = String(activeWeek);

    dropdown.onchange = () => {
      renderWeeklyReviewSummary(parseInt(dropdown.value, 10));
    };
  }

  function renderWeeklyReviewSection() {
    populateWeeklyDropdown();
    const dropdown = document.getElementById('weeklySelectDropdown');
    const weekNum = dropdown ? parseInt(dropdown.value, 10) : 1;
    renderWeeklyReviewSummary(weekNum);
    renderAllWeeklyReflections();
  }

  function renderWeeklyReviewSummary(weekNum) {
    const summaryEl = document.getElementById('weeklyAutoSummary');
    const reflectionTextarea = document.getElementById('weeklyReflectionText');
    if (!summaryEl) return;

    const weekDef = WEEKS_DEF.find(w => w.num === weekNum) || WEEKS_DEF[0];

    // Compute actual stored data for this week
    const weekTasks = state.tasks.filter(t => t.date >= weekDef.start && t.date <= weekDef.end);
    const completedTasks = weekTasks.filter(t => t.completed).length;

    const weekStudy = state.studySessions.filter(s => s.date >= weekDef.start && s.date <= weekDef.end).length;
    const weekProject = state.projectLogs.filter(p => p.date >= weekDef.start && p.date <= weekDef.end).length;
    const weekGithub = state.projectLogs.filter(p => p.date >= weekDef.start && p.date <= weekDef.end && p.commitUrl).length;
    const weekScreen = state.screenTime.filter(s => s.date >= weekDef.start && s.date <= weekDef.end);
    const avgScreenMin = weekScreen.length > 0 ? Math.round(weekScreen.reduce((s, x) => s + x.totalMinutes, 0) / weekScreen.length) : null;
    const screenDisplay = avgScreenMin !== null ? `${Math.floor(avgScreenMin / 60)}h ${avgScreenMin % 60}m avg` : 'No logs';

    const weekPoints = state.pointsLedger
      .filter(p => p.date >= weekDef.start && p.date <= weekDef.end)
      .reduce((s, p) => s + p.points, 0);

    summaryEl.innerHTML = `
      <div class="weekly-metric-box">
        <div class="weekly-metric-num">${completedTasks}</div>
        <div class="weekly-metric-lbl">Tasks Done</div>
      </div>
      <div class="weekly-metric-box">
        <div class="weekly-metric-num">${weekStudy}</div>
        <div class="weekly-metric-lbl">Study Sessions</div>
      </div>
      <div class="weekly-metric-box">
        <div class="weekly-metric-num">${weekProject}</div>
        <div class="weekly-metric-lbl">Project Logs</div>
      </div>
      <div class="weekly-metric-box">
        <div class="weekly-metric-num">${weekGithub}</div>
        <div class="weekly-metric-lbl">GitHub Logs</div>
      </div>
      <div class="weekly-metric-box">
        <div class="weekly-metric-num" style="font-size: 1.15rem;">${screenDisplay}</div>
        <div class="weekly-metric-lbl">Screen Time</div>
      </div>
      <div class="weekly-metric-box">
        <div class="weekly-metric-num text-amber">+${weekPoints}</div>
        <div class="weekly-metric-lbl">Points Earned</div>
      </div>
    `;

    // Populate saved reflection
    if (reflectionTextarea) {
      const saved = state.weeklyReflections[weekNum];
      reflectionTextarea.value = saved ? saved.reflection : '';
    }
  }

  function handleWeeklyReflectionSubmit(e) {
    e.preventDefault();
    const dropdown = document.getElementById('weeklySelectDropdown');
    const weekNum = parseInt(dropdown.value, 10);
    const text = document.getElementById('weeklyReflectionText').value.trim();

    state.weeklyReflections[weekNum] = {
      reflection: text,
      savedAt: new Date().toISOString()
    };

    saveState();
    renderAllWeeklyReflections();
    showToast(`Weekly reflection for Week ${weekNum} saved.`, 'success');
  }

  function renderAllWeeklyReflections() {
    const listEl = document.getElementById('weeklyReflectionsList');
    if (!listEl) return;

    const weeksWithReflections = Object.keys(state.weeklyReflections).map(n => parseInt(n, 10)).sort((a, b) => a - b);
    if (weeksWithReflections.length === 0) {
      listEl.innerHTML = `<p class="text-xs text-secondary">No weekly reflections saved yet.</p>`;
      return;
    }

    listEl.innerHTML = weeksWithReflections.map(wNum => {
      const item = state.weeklyReflections[wNum];
      const wDef = WEEKS_DEF.find(w => w.num === wNum);
      return `
        <div class="log-entry-card" style="margin-bottom: 0.75rem;">
          <div class="log-entry-head">
            <span class="log-entry-date">${wDef ? wDef.label : `Week ${wNum}`}</span>
            <span class="text-xs text-secondary">Saved ${formatDisplayDate(item.savedAt.slice(0, 10))}</span>
          </div>
          <p class="text-main text-xs" style="line-height: 1.5;">${escapeHtml(item.reflection)}</p>
        </div>
      `;
    }).join('');
  }

  // -------------------------------------------------------------
  // Data Safety & Settings View
  // -------------------------------------------------------------

  function renderSettingsView() {
    renderPointsLedgerTable();
  }

  function renderPointsLedgerTable() {
    const tbody = document.getElementById('pointsLedgerBody');
    if (!tbody) return;

    if (state.pointsLedger.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-secondary" style="text-align: center; padding: 1.5rem;">No points earned yet.</td></tr>`;
      return;
    }

    // Sort descending by timestamp
    const sorted = [...state.pointsLedger].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    tbody.innerHTML = sorted.map(item => `
      <tr>
        <td><code>${item.date}</code></td>
        <td>${escapeHtml(item.label)}</td>
        <td style="color: var(--accent-amber); font-weight: 700; font-family: var(--font-mono);">+${item.points}</td>
        <td class="text-secondary text-xs">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      </tr>
    `).join('');
  }

  function exportAppData() {
    try {
      const exportPayload = {
        exportDate: new Date().toISOString(),
        version: state.version,
        appName: 'Becoming',
        data: state
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `becoming-backup-${formatLocalDate(new Date())}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      const lastMeta = document.getElementById('lastBackupMeta');
      if (lastMeta) lastMeta.textContent = `Last export: Today at ${new Date().toLocaleTimeString()}`;

      showToast('Backup JSON exported successfully.', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed.', 'error');
    }
  }

  function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const json = JSON.parse(event.target.result);

        // Validation
        let importedState = null;
        if (json.appName === 'Becoming' && json.data) {
          importedState = json.data;
        } else if (Array.isArray(json.tasks) || Array.isArray(json.pointsLedger)) {
          importedState = json;
        }

        if (!importedState) {
          showToast('Invalid backup file structure.', 'error');
          return;
        }

        const taskCount = Array.isArray(importedState.tasks) ? importedState.tasks.length : 0;
        const ptsCount = Array.isArray(importedState.pointsLedger) ? importedState.pointsLedger.length : 0;
        const projCount = Array.isArray(importedState.projectLogs) ? importedState.projectLogs.length : 0;

        openConfirmModal(
          'Confirm Data Import',
          `Valid backup detected with ${taskCount} tasks, ${projCount} project logs, and ${ptsCount} point records. Restoring will replace current browser data. Proceed?`,
          () => {
            state = Object.assign({}, state, importedState);
            saveState();
            renderAll();
            showToast('Backup restored successfully.', 'success');
          }
        );
      } catch (parseErr) {
        console.error('Import parse error:', parseErr);
        showToast('Failed to parse JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  }

  function resetAllData() {
    openConfirmModal(
      'Permanent Reset',
      'This will erase all tasks, habits, progress logs, screen time, reviews, and points permanently. Are you absolutely certain?',
      () => {
        localStorage.removeItem(STORAGE_KEY);
        state = {
          version: 1,
          activeDate: START_DATE_STR,
          tasks: [],
          habits: {},
          projectLogs: [],
          studySessions: [],
          exams: [
            {
              id: 'exam_placeholder_nov4',
              date: '2026-11-04',
              title: 'University Midterm Exam',
              type: 'Exam',
              status: 'Awaiting confirmation (editable)'
            }
          ],
          internshipTasks: [],
          screenTime: [],
          dailyReviews: {},
          weeklyReflections: {},
          pointsLedger: []
        };
        setupInitialWelcomeData();
        renderAll();
        showToast('All app data has been reset.', 'info');
      }
    );
  }

  // -------------------------------------------------------------
  // Confirmation Modal & UI Helpers
  // -------------------------------------------------------------

  let confirmCallback = null;

  function openConfirmModal(title, message, onProceed) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    const proceedBtn = document.getElementById('confirmProceedBtn');

    titleEl.textContent = title;
    msgEl.textContent = message;
    confirmCallback = onProceed;

    modal.classList.remove('hidden');
  }

  function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('hidden');
    confirmCallback = null;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // -------------------------------------------------------------
  // Navigation & View Switching
  // -------------------------------------------------------------

  function switchView(viewName) {
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    document.querySelectorAll('.content-view').forEach(view => {
      if (view.id === `view-${viewName}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Specific renders on view switch
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'daily') renderDailyPlan();
    if (viewName === 'journey') renderJourneyView();
    if (viewName === 'project') renderProjectView();
    if (viewName === 'academic') renderAcademicView();
    if (viewName === 'screentime') renderScreenTimeView();
    if (viewName === 'reviews') renderReviewsView();
    if (viewName === 'settings') renderSettingsView();
  }

  function renderAll() {
    updatePointsUI();
    renderDashboard();
    renderDailyPlan();
    renderJourneyView();
    renderProjectView();
    renderAcademicView();
    renderScreenTimeView();
    renderReviewsView();
    renderSettingsView();
  }

  // -------------------------------------------------------------
  // Initialization & Event Listeners
  // -------------------------------------------------------------

  function initApp() {
    loadState();

    // Navigation bar click listeners
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        switchView(view);
      });
    });

    // Date navigation buttons
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const todayBtn = document.getElementById('todayBtn');

    if (prevDayBtn) prevDayBtn.addEventListener('click', () => setActiveDate(getPreviousDate(state.activeDate)));
    if (nextDayBtn) nextDayBtn.addEventListener('click', () => setActiveDate(getNextDate(state.activeDate)));
    if (todayBtn) todayBtn.addEventListener('click', () => setActiveDate(START_DATE_STR));

    // Dashboard Action Buttons
    const dashGoToDailyBtn = document.getElementById('dashGoToDailyBtn');
    const dashQuickAddTaskBtn = document.getElementById('dashQuickAddTaskBtn');
    const dashSetPriorityBtn = document.getElementById('dashSetPriorityBtn');
    const dashLogStudyLink = document.getElementById('dashLogStudyLink');
    const dashLogProjectLink = document.getElementById('dashLogProjectLink');
    const dashDailyReviewLink = document.getElementById('dashDailyReviewLink');

    if (dashGoToDailyBtn) dashGoToDailyBtn.addEventListener('click', () => switchView('daily'));
    if (dashQuickAddTaskBtn) dashQuickAddTaskBtn.addEventListener('click', () => openTaskModal());
    if (dashSetPriorityBtn) dashSetPriorityBtn.addEventListener('click', () => switchView('daily'));
    if (dashLogStudyLink) dashLogStudyLink.addEventListener('click', () => { switchView('academic'); openStudyModal(); });
    if (dashLogProjectLink) dashLogProjectLink.addEventListener('click', () => switchView('project'));
    if (dashDailyReviewLink) dashDailyReviewLink.addEventListener('click', () => switchView('reviews'));

    // Daily View Action Buttons
    const openNewTaskModalBtn = document.getElementById('openNewTaskModalBtn');
    if (openNewTaskModalBtn) openNewTaskModalBtn.addEventListener('click', () => openTaskModal());

    // Category filter pills
    document.querySelectorAll('#categoryFilterRow .filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#categoryFilterRow .filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentCategoryFilter = pill.getAttribute('data-cat');
        renderDailyTaskList();
      });
    });

    // Task Modal bindings
    const taskForm = document.getElementById('taskForm');
    const closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
    const cancelTaskModalBtn = document.getElementById('cancelTaskModalBtn');
    if (taskForm) taskForm.addEventListener('submit', handleTaskFormSubmit);
    if (closeTaskModalBtn) closeTaskModalBtn.addEventListener('click', closeTaskModal);
    if (cancelTaskModalBtn) cancelTaskModalBtn.addEventListener('click', closeTaskModal);

    // Project View bindings
    const projectLogForm = document.getElementById('projectLogForm');
    const resetProjectFormBtn = document.getElementById('resetProjectFormBtn');
    const openNewProjectLogBtn = document.getElementById('openNewProjectLogBtn');
    if (projectLogForm) projectLogForm.addEventListener('submit', handleProjectFormSubmit);
    if (resetProjectFormBtn) resetProjectFormBtn.addEventListener('click', () => projectLogForm.reset());
    if (openNewProjectLogBtn) openNewProjectLogBtn.addEventListener('click', () => {
      document.getElementById('projectWorkedOn').focus();
    });

    // Academic View bindings
    const openAddStudyModalBtn = document.getElementById('openAddStudyModalBtn');
    const closeStudyModalBtn = document.getElementById('closeStudyModalBtn');
    const cancelStudyModalBtn = document.getElementById('cancelStudyModalBtn');
    const studyForm = document.getElementById('studyForm');
    if (openAddStudyModalBtn) openAddStudyModalBtn.addEventListener('click', openStudyModal);
    if (closeStudyModalBtn) closeStudyModalBtn.addEventListener('click', () => document.getElementById('studyModal').classList.add('hidden'));
    if (cancelStudyModalBtn) cancelStudyModalBtn.addEventListener('click', () => document.getElementById('studyModal').classList.add('hidden'));
    if (studyForm) studyForm.addEventListener('submit', handleStudyFormSubmit);

    const addNewExamBtn = document.getElementById('addNewExamBtn');
    const closeExamModalBtn = document.getElementById('closeExamModalBtn');
    const cancelExamModalBtn = document.getElementById('cancelExamModalBtn');
    const examForm = document.getElementById('examForm');
    if (addNewExamBtn) addNewExamBtn.addEventListener('click', () => openExamModal());
    if (closeExamModalBtn) closeExamModalBtn.addEventListener('click', () => document.getElementById('examModal').classList.add('hidden'));
    if (cancelExamModalBtn) cancelExamModalBtn.addEventListener('click', () => document.getElementById('examModal').classList.add('hidden'));
    if (examForm) examForm.addEventListener('submit', handleExamFormSubmit);

    const openAddInternshipModalBtn = document.getElementById('openAddInternshipModalBtn');
    const closeInternshipModalBtn = document.getElementById('closeInternshipModalBtn');
    const cancelInternshipModalBtn = document.getElementById('cancelInternshipModalBtn');
    const internshipForm = document.getElementById('internshipForm');
    if (openAddInternshipModalBtn) openAddInternshipModalBtn.addEventListener('click', openInternshipModal);
    if (closeInternshipModalBtn) closeInternshipModalBtn.addEventListener('click', () => document.getElementById('internshipModal').classList.add('hidden'));
    if (cancelInternshipModalBtn) cancelInternshipModalBtn.addEventListener('click', () => document.getElementById('internshipModal').classList.add('hidden'));
    if (internshipForm) internshipForm.addEventListener('submit', handleInternshipFormSubmit);

    // Screen Time bindings
    const screenTimeForm = document.getElementById('screenTimeForm');
    if (screenTimeForm) screenTimeForm.addEventListener('submit', handleScreenTimeFormSubmit);

    // Reviews View Subtabs & bindings
    const subtabDailyBtn = document.getElementById('subtabDailyReviewBtn');
    const subtabWeeklyBtn = document.getElementById('subtabWeeklyReviewBtn');
    const dailyContainer = document.getElementById('subtabDailyReviewContainer');
    const weeklyContainer = document.getElementById('subtabWeeklyReviewContainer');

    if (subtabDailyBtn && subtabWeeklyBtn && dailyContainer && weeklyContainer) {
      subtabDailyBtn.addEventListener('click', () => {
        subtabDailyBtn.classList.add('active');
        subtabWeeklyBtn.classList.remove('active');
        dailyContainer.classList.remove('hidden');
        weeklyContainer.classList.add('hidden');
      });
      subtabWeeklyBtn.addEventListener('click', () => {
        subtabWeeklyBtn.classList.add('active');
        subtabDailyBtn.classList.remove('active');
        dailyContainer.classList.add('hidden');
        weeklyContainer.classList.remove('hidden');
        renderWeeklyReviewSection();
      });
    }

    // Daily Review effort rating selector buttons
    document.querySelectorAll('#effortRatingSelector .rating-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        document.getElementById('reviewEffortVal').value = val;
        setEffortRatingUI(val);
      });
    });

    const dailyReviewForm = document.getElementById('dailyReviewForm');
    const dailyReviewDateInput = document.getElementById('dailyReviewDate');
    if (dailyReviewForm) dailyReviewForm.addEventListener('submit', handleDailyReviewFormSubmit);
    if (dailyReviewDateInput) {
      dailyReviewDateInput.addEventListener('change', () => {
        setActiveDate(dailyReviewDateInput.value);
        renderDailyReviewSection();
      });
    }

    const weeklyReflectionForm = document.getElementById('weeklyReflectionForm');
    if (weeklyReflectionForm) weeklyReflectionForm.addEventListener('submit', handleWeeklyReflectionSubmit);

    // Settings bindings
    const exportBtn = document.getElementById('exportDataBtn');
    const triggerImportBtn = document.getElementById('triggerImportBtn');
    const importFileInput = document.getElementById('importFileInput');
    const resetAllDataBtn = document.getElementById('resetAllDataBtn');

    if (exportBtn) exportBtn.addEventListener('click', exportAppData);
    if (triggerImportBtn && importFileInput) {
      triggerImportBtn.addEventListener('click', () => importFileInput.click());
      importFileInput.addEventListener('change', handleFileImport);
    }
    if (resetAllDataBtn) resetAllDataBtn.addEventListener('click', resetAllData);

    // Confirm modal bindings
    const closeConfirmModalBtn = document.getElementById('closeConfirmModalBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmProceedBtn = document.getElementById('confirmProceedBtn');

    if (closeConfirmModalBtn) closeConfirmModalBtn.addEventListener('click', closeConfirmModal);
    if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', closeConfirmModal);
    if (confirmProceedBtn) {
      confirmProceedBtn.addEventListener('click', () => {
        if (typeof confirmCallback === 'function') {
          confirmCallback();
        }
        closeConfirmModal();
      });
    }

    // Day inspector modal close
    const closeInspectorModalBtn = document.getElementById('closeInspectorModalBtn');
    const inspectorCloseBtn = document.getElementById('inspectorCloseBtn');
    if (closeInspectorModalBtn) {
      closeInspectorModalBtn.addEventListener('click', () => {
        document.getElementById('dayInspectorModal').classList.add('hidden');
      });
    }
    if (inspectorCloseBtn) {
      inspectorCloseBtn.addEventListener('click', () => {
        document.getElementById('dayInspectorModal').classList.add('hidden');
      });
    }

    // Render complete interface
    renderAll();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
