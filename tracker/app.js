// Replace these strings with your actual Supabase Project URL and Anon Key
const SUPABASE_URL = 'https://kqojvzmbvzfxenjpukbb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HUW4Rm3ttFUJ_U68xKBYyQ_KgMTO0qn';

const supabaseClient = window.supabase.createClient('https://kqojvzmbvzfxenjpukbb.supabase.co', 'sb_publishable_HUW4Rm3ttFUJ_U68xKBYyQ_KgMTO0qn');

//DOM Elements Selection
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');
const authMessage = document.getElementById('auth-message');

const addHabitForm = document.getElementById('add-habit-form');
const habitTitleInput = document.getElementById('habit-title');
const habitCategorySelect = document.getElementById('habit-category');
const habitsList = document.getElementById('habits-list');

let currentUser = null;

function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

function showMessage(element, text, type = 'error') {
  element.textContent = text;
  element.className = `message ${type}`;
}

function clearMessage(element) {
  element.textContent = '';
  element.className = 'message';
}

// ==========================================================================
// 3. Auth Handlers
// ==========================================================================

// Handle User Login
loginBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  clearMessage(authMessage);

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage(authMessage, 'Please fill in both email and password fields.');
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    showMessage(authMessage, error.message, 'error');
  } else {
    currentUser = data.user;
    updateUIForAuthenticatedUser();
  }
});

// Handle User Signup
signupBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  clearMessage(authMessage);

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage(authMessage, 'Please fill in both email and password fields.');
    return;
  }

  showMessage(authMessage, 'Signing up...', 'success');

  const { data, error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    showMessage(authMessage, error.message, 'error');
  } else if (data.user && data.session) {
    currentUser = data.user;
    updateUIForAuthenticatedUser();
  } else {
    showMessage(
      authMessage, 
      'Registration successful! Check your email to confirm registration or sign in.', 
      'success'
    );
  }
});

// Handle Logout
logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateUIForGuestUser();
});

function updateUIForAuthenticatedUser() {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  userEmailSpan.textContent = currentUser.email;
  authForm.reset();
  clearMessage(authMessage);

  loadHabits();
}

function updateUIForGuestUser() {
  authSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  logoutBtn.classList.add('hidden');
  userEmailSpan.textContent = '';
  habitsList.innerHTML = '';
}

// ==========================================================================
// 4. Habit Operations (CRUD)
// ==========================================================================


// Function to update daily progress bar
function updateProgress(totalHabits, completedCount) {
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressPercent = document.getElementById('progress-percent');
  const progressSubtitle = document.getElementById('progress-subtitle');

  if (!progressBarFill || !progressPercent || !progressSubtitle) return;

  if (totalHabits === 0) {
    progressBarFill.style.width = '0%';
    progressPercent.textContent = '0%';
    progressSubtitle.textContent = 'No habits created yet.';
    return;
  }

  const percentage = Math.round((completedCount / totalHabits) * 100);
  
  progressBarFill.style.width = `${percentage}%`;
  progressPercent.textContent = `${percentage}%`;
  progressSubtitle.textContent = `${completedCount} of ${totalHabits} habits completed today`;
}

// Helper: Get array of last 7 date strings [YYYY-MM-DD] starting from 6 days ago up to today
function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

// Format date string to short day name (e.g., "Mon", "Tue")
function getShortDayName(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W, T, F, S, S
}

// Load Habits & Last 7 Days Completion Status from Supabase
async function loadHabits() {
  habitsList.innerHTML = '<p>Loading habits...</p>';

  // 1. Fetch habits
  const { data: habits, error: habitsError } = await supabaseClient
    .from('habits')
    .select('*')
    .order('created_at', { ascending: false });

  if (habitsError) {
    habitsList.innerHTML = `<p class="message error">Failed to load habits: ${habitsError.message}</p>`;
    return;
  }

  if (!habits || habits.length === 0) {
    habitsList.innerHTML = '<p style="color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">No habits found. Add your first habit above!</p>';
    updateProgress(0, 0);
    return;
  }

  // 2. Fetch completion logs for the LAST 7 DAYS
  const last7Days = getLast7Days();
  const startDate = last7Days[0]; // 6 days ago

  const { data: logs, error: logsError } = await supabaseClient
    .from('habit_logs')
    .select('habit_id, completed_at')
    .gte('completed_at', startDate);

  if (logsError) {
    console.error('Error loading habit logs:', logsError.message);
  }

  // Map logs into a Set of "habitId_date" strings for quick checking
  const completedLogSet = new Set((logs || []).map(log => `${log.habit_id}_${log.completed_at}`));

  // 3. Render Habits
  renderHabits(habits, completedLogSet, last7Days);
}

// Render Habit Cards with 7-day calendar into the DOM
function renderHabits(habits, completedLogSet, last7Days) {
  habitsList.innerHTML = '';
  const today = getTodayDateString();
  let completedTodayCount = 0;

  habits.forEach(habit => {
    const isCompletedToday = completedLogSet.has(`${habit.id}_${today}`);
    if (isCompletedToday) completedTodayCount++;

    // Generate HTML for 7 days
    const calendarHTML = last7Days.map(dateStr => {
      const isDone = completedLogSet.has(`${habit.id}_${dateStr}`);
      const isToday = dateStr === today;
      const dayLabel = getShortDayName(dateStr);

      let statusClass = '';
      if (isDone) {
        statusClass = 'completed';
      } else if (isToday) {
        statusClass = 'today-uncompleted';
      }

      return `
        <div class="day-box">
          <span class="day-name">${dayLabel}</span>
          <div class="day-status ${statusClass}">${isDone ? '✓' : ''}</div>
        </div>
      `;
    }).join('');

    const habitCard = document.createElement('div');
    habitCard.className = `habit-card ${isCompletedToday ? 'completed' : ''}`;
    habitCard.dataset.id = habit.id;

    habitCard.innerHTML = `
      <div class="habit-header">
        <span class="habit-title">${escapeHTML(habit.title)}</span>
        <span class="habit-category">${escapeHTML(habit.category)}</span>
      </div>

      <!-- Weekly Calendar Strip -->
      <div class="weekly-calendar">
        ${calendarHTML}
      </div>

      <div class="habit-actions">
        <button class="toggle-btn ${isCompletedToday ? 'done' : ''}" onclick="toggleHabit('${habit.id}', ${isCompletedToday})">
          ${isCompletedToday ? '✓ Completed' : 'Mark Done'}
        </button>
        <button class="btn btn-danger" onclick="deleteHabit('${habit.id}')">Delete</button>
      </div>
    `;

    habitsList.appendChild(habitCard);
  });

  updateProgress(habits.length, completedTodayCount);
}

function calculateStreak(habitId, allLogs) {
  //Filter logs for this specific habit and sort descending by date
  const habitLogs = allLogs
    .filter(log => log.habit_id === habitId)
    .map(log => log.completed_at)
    .sort((a, b) => new Date(b) - new Date(a));

  if (habitLogs.length === 0) return 0;

  const logSet = new Set(habitLogs);
  const today = getTodayDateString();
  
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterday = yesterdayObj.toISOString().split('T')[0];

  let streak = 0;
  let checkDate = new Date();

  //If not completed today, start checking from yesterday
  if (!logSet.has(today)) {
    if (!logSet.has(yesterday)) {
      return 0; // Streak broken if neither today nor yesterday is completed
    }
    checkDate = yesterdayObj;
  }

  //Count consecutive days backwards
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (logSet.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

//Updated loadHabits function fetching full log history for accurate streaks
async function loadHabits() {
  habitsList.innerHTML = '<p>Loading habits...</p>';

  //Fetch habits
  const { data: habits, error: habitsError } = await supabaseClient
    .from('habits')
    .select('*')
    .order('created_at', { ascending: false });

  if (habitsError) {
    habitsList.innerHTML = `<p class="message error">Failed to load habits: ${habitsError.message}</p>`;
    return;
  }

  if (!habits || habits.length === 0) {
    habitsList.innerHTML = '<p style="color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">No habits found. Add your first habit above!</p>';
    updateProgress(0, 0);
    return;
  }

  //Fetch ALL completion logs for this user's habits to calculate accurate streaks
  const { data: logs, error: logsError } = await supabaseClient
    .from('habit_logs')
    .select('habit_id, completed_at');

  if (logsError) {
    console.error('Error loading habit logs:', logsError.message);
  }

  const allLogs = logs || [];
  const completedLogSet = new Set(allLogs.map(log => `${log.habit_id}_${log.completed_at}`));
  const last7Days = getLast7Days();

  //Render Habits
  renderHabits(habits, completedLogSet, last7Days, allLogs);
}

//Updated renderHabits function with Streak Badges
function renderHabits(habits, completedLogSet, last7Days, allLogs) {
  habitsList.innerHTML = '';
  const today = getTodayDateString();
  let completedTodayCount = 0;

  habits.forEach(habit => {
    const isCompletedToday = completedLogSet.has(`${habit.id}_${today}`);
    if (isCompletedToday) completedTodayCount++;

    //Calculate streak
    const streak = calculateStreak(habit.id, allLogs);

    const calendarHTML = last7Days.map(dateStr => {
      const isDone = completedLogSet.has(`${habit.id}_${dateStr}`);
      const isToday = dateStr === today;
      const dayLabel = getShortDayName(dateStr);

      let statusClass = '';
      if (isDone) {
        statusClass = 'completed';
      } else if (isToday) {
        statusClass = 'today-uncompleted';
      }

      return `
        <div class="day-box">
          <span class="day-name">${dayLabel}</span>
          <div class="day-status ${statusClass}">${isDone ? '✓' : ''}</div>
        </div>
      `;
    }).join('');

    const habitCard = document.createElement('div');
    habitCard.className = `habit-card ${isCompletedToday ? 'completed' : ''}`;
    habitCard.dataset.id = habit.id;

    habitCard.innerHTML = `
      <div class="habit-header">
        <div>
          <span class="habit-title">${escapeHTML(habit.title)}</span>
          ${streak > 0 ? `<span class="streak-badge active">🔥 ${streak} ${streak === 1 ? 'day' : 'days'}</span>` : ''}
        </div>
        <span class="habit-category">${escapeHTML(habit.category)}</span>
      </div>

      <!-- Weekly Calendar Strip -->
      <div class="weekly-calendar">
        ${calendarHTML}
      </div>

      <div class="habit-actions">
        <button class="toggle-btn ${isCompletedToday ? 'done' : ''}" onclick="toggleHabit('${habit.id}', ${isCompletedToday})">
          ${isCompletedToday ? '✓ Completed' : 'Mark Done'}
        </button>
        <button class="btn btn-danger" onclick="deleteHabit('${habit.id}')">Delete</button>
      </div>
    `;

    habitsList.appendChild(habitCard);
  });

  updateProgress(habits.length, completedTodayCount);
}

addHabitForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = habitTitleInput.value.trim();
  const category = habitCategorySelect.value;

  if (!title) return;

  const { error } = await supabaseClient
    .from('habits')
    .insert([{ title, category, user_id: currentUser.id }]);

  if (error) {
    alert(`Failed to add habit: ${error.message}`);
  } else {
    addHabitForm.reset();
    loadHabits();
  }
});

async function toggleHabit(habitId, isCurrentlyCompleted) {
  const today = getTodayDateString();

  if (isCurrentlyCompleted) {
    const { error } = await supabaseClient
      .from('habit_logs')
      .delete()
      .eq('habit_id', habitId)
      .eq('completed_at', today);

    if (error) alert(`Error removing status: ${error.message}`);
  } else {
    const { error } = await supabaseClient
      .from('habit_logs')
      .insert([{ habit_id: habitId, completed_at: today }]);

    if (error) alert(`Error marking habit: ${error.message}`);
  }

  loadHabits();
}

async function deleteHabit(habitId) {
  if (!confirm('Are you sure you want to delete this habit?')) return;

  const { error } = await supabaseClient
    .from('habits')
    .delete()
    .eq('id', habitId);

  if (error) {
    alert(`Failed to delete habit: ${error.message}`);
  } else {
    loadHabits();
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;

async function checkInitialSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session && session.user) {
    currentUser = session.user;
    updateUIForAuthenticatedUser();
  } else {
    updateUIForGuestUser();
  }
}

checkInitialSession();