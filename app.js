// ====================
// GlassFocus App v2.0
// Complete JavaScript
// ====================


injectSpeedInsights();
// ===== STATE MANAGEMENT =====
const STATE = {
    todos: [],
    archive: [],
    books: [],
    analytics: {
        daily: {},
        streaks: { current: 0, best: 0, lastActive: null }
    },
    settings: {
        notifications: false,
        autoArchive: true,
        notificationPermission: 'default'
    }
};

// ===== UTILITY FUNCTIONS =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getToday() {
    return new Date().toDateString();
}

function getDateString(date = new Date()) {
    return date.toISOString().split('T')[0];
}

function getYearStart() {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1);
}

function showToast(message, duration = 2000) {
    const toast = document.getElementById('successToast');
    const messageEl = document.getElementById('toastMessage');
    messageEl.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Could not play sound:', e);
    }
}

// ===== STORAGE FUNCTIONS =====
function saveState() {
    try {
        localStorage.setItem('glass-todos', JSON.stringify(STATE.todos));
        localStorage.setItem('glass-archive', JSON.stringify(STATE.archive));
        localStorage.setItem('glass-books', JSON.stringify(STATE.books));
        localStorage.setItem('glass-analytics', JSON.stringify(STATE.analytics));
        localStorage.setItem('glass-settings', JSON.stringify(STATE.settings));
        localStorage.setItem('glass-last-opened', getToday());
    } catch (e) {
        console.error('Failed to save state:', e);
    }
}

function loadState() {
    try {
        STATE.todos = JSON.parse(localStorage.getItem('glass-todos')) || [];
        STATE.archive = JSON.parse(localStorage.getItem('glass-archive')) || [];
        STATE.books = JSON.parse(localStorage.getItem('glass-books')) || [];
        STATE.analytics = JSON.parse(localStorage.getItem('glass-analytics')) || {
            daily: {},
            streaks: { current: 0, best: 0, lastActive: null }
        };
        STATE.settings = JSON.parse(localStorage.getItem('glass-settings')) || {
            notifications: false,
            autoArchive: true,
            notificationPermission: 'default'
        };
    } catch (e) {
        console.error('Failed to load state:', e);
    }
}

// ===== STREAK CALCULATION =====
function calculateStreak() {
    const today = getDateString();
    const yesterday = getDateString(new Date(Date.now() - 86400000));
    
    const todayData = STATE.analytics.daily[today];
    const wasActiveToday = todayData && todayData.completed > 0;
    
    const yesterdayData = STATE.analytics.daily[yesterday];
    const wasActiveYesterday = yesterdayData && yesterdayData.completed > 0;
    
    if (wasActiveToday) {
        if (STATE.analytics.streaks.lastActive === yesterday) {
            STATE.analytics.streaks.current++;
        } else if (STATE.analytics.streaks.lastActive === today) {
            // Already counted
        } else {
            STATE.analytics.streaks.current = 1;
        }
        STATE.analytics.streaks.lastActive = today;
    } else if (!wasActiveYesterday && STATE.analytics.streaks.lastActive !== today) {
        STATE.analytics.streaks.current = 0;
    }
    
    if (STATE.analytics.streaks.current > STATE.analytics.streaks.best) {
        STATE.analytics.streaks.best = STATE.analytics.streaks.current;
    }
    
    saveState();
}

// ===== DAILY RESET =====
function checkDailyReset() {
    const today = getToday();
    const lastOpened = localStorage.getItem('glass-last-opened');
    
    if (lastOpened && lastOpened !== today) {
        if (STATE.settings.autoArchive && STATE.todos.length > 0) {
            const archiveEntry = { date: lastOpened, items: [...STATE.todos] };
            STATE.archive.unshift(archiveEntry);
            STATE.todos = [];
        } else if (!STATE.settings.autoArchive) {
            const completed = STATE.todos.filter(t => t.completed);
            if (completed.length > 0) {
                STATE.archive.unshift({ date: lastOpened, items: completed });
            }
            STATE.todos = STATE.todos.filter(t => !t.completed);
        }
        
        calculateStreak();
        saveState();
    }
    
    localStorage.setItem('glass-last-opened', today);
}

// ===== ANALYTICS =====
function updateDailyAnalytics() {
    const today = getDateString();
    const completed = STATE.todos.filter(t => t.completed).length;
    const total = STATE.todos.length;
    STATE.analytics.daily[today] = { completed, total };
    calculateStreak();
    saveState();
}

function getTotalTasksCompleted() {
    let total = 0;
    for (const date in STATE.analytics.daily) {
        total += STATE.analytics.daily[date].completed || 0;
    }
    return total;
}

function getProductiveDays() {
    let count = 0;
    for (const date in STATE.analytics.daily) {
        if (STATE.analytics.daily[date].completed > 0) count++;
    }
    return count;
}

function getBooksCompletedThisYear() {
    const yearStart = getYearStart();
    return STATE.books.filter(b => 
        b.status === 'completed' && new Date(b.completedDate) >= yearStart
    ).length;
}

// ===== PROGRESS BAR =====
function updateProgressBar() {
    const total = STATE.todos.length;
    const completed = STATE.todos.filter(t => t.completed).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    document.getElementById('progressBar').style.width = `${percentage}%`;
}

// ===== TODO FUNCTIONS =====
function renderTodos() {
    const todoListEl = document.getElementById('todoList');
    todoListEl.innerHTML = '';
    let completeCount = 0;
    
    STATE.todos.forEach(todo => {
        if (todo.completed) completeCount++;
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <div class="checkbox-wrapper">
                <input type="checkbox" class="custom-checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
            </div>
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <button class="delete-btn" onclick="deleteTodo(${todo.id})">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
        `;
        todoListEl.appendChild(li);
    });
    
    document.getElementById('statRemaining').textContent = STATE.todos.length - completeCount;
    document.getElementById('statCompleted').textContent = completeCount;
    document.getElementById('statStreak').textContent = STATE.analytics.streaks.current;
    document.getElementById('emptyState').style.display = STATE.todos.length === 0 ? 'block' : 'none';
    
    updateProgressBar();
    updateDailyAnalytics();
}

function toggleTodo(id) {
    const todo = STATE.todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveState();
        renderTodos();
        if (todo.completed) showToast('Task completed! 🎉');
    }
}

function deleteTodo(id) {
    STATE.todos = STATE.todos.filter(t => t.id !== id);
    saveState();
    renderTodos();
}

function addTodo(text) {
    if (!text.trim()) return;
    STATE.todos.unshift({
        id: Date.now(),
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString()
    });
    saveState();
    renderTodos();
}

// ===== BOOKS =====
function renderBooks() {
    const booksListEl = document.getElementById('booksList');
    booksListEl.innerHTML = '';
    let reading = 0, completed = 0;
    
    STATE.books.forEach(book => {
        if (book.status === 'reading') reading++;
        if (book.status === 'completed') completed++;
        
        const div = document.createElement('div');
        div.className = 'book-item';
        div.innerHTML = `
            <div class="book-info">
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="book-date">Added ${new Date(book.createdAt).toLocaleDateString()}</div>
            </div>
            <span class="book-status ${book.status}">${book.status === 'reading' ? '📖 Reading' : '✓ Done'}</span>
            <button class="delete-btn" onclick="toggleBookStatus(${book.id})">${book.status === 'reading' ? '✓' : '↺'}</button>
            <button class="delete-btn" onclick="deleteBook(${book.id})">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
        `;
        booksListEl.appendChild(div);
    });
    
    document.getElementById('booksReading').textContent = reading;
    document.getElementById('booksCompleted').textContent = completed;
    document.getElementById('booksThisYear').textContent = getBooksCompletedThisYear();
    document.getElementById('emptyBooksState').style.display = STATE.books.length === 0 ? 'block' : 'none';
}

function addBook() {
    const input = document.getElementById('bookInput');
    const title = input.value.trim();
    if (!title) return;
    
    STATE.books.unshift({
        id: Date.now(),
        title,
        status: 'reading',
        createdAt: new Date().toISOString(),
        completedDate: null
    });
    
    input.value = '';
    saveState();
    renderBooks();
    showToast('Book added! 📚');
}

function toggleBookStatus(id) {
    const book = STATE.books.find(b => b.id === id);
    if (book) {
        if (book.status === 'reading') {
            book.status = 'completed';
            book.completedDate = new Date().toISOString();
            showToast('Book completed! 🎉');
        } else {
            book.status = 'reading';
            book.completedDate = null;
        }
        saveState();
        renderBooks();
    }
}

function deleteBook(id) {
    STATE.books = STATE.books.filter(b => b.id !== id);
    saveState();
    renderBooks();
}

// ===== ARCHIVE =====
function renderArchive() {
    const archiveContent = document.getElementById('archiveContent');
    archiveContent.innerHTML = '';
    
    if (STATE.archive.length === 0) {
        archiveContent.innerHTML = '<div class="empty-state">No history yet.</div>';
        return;
    }
    
    STATE.archive.forEach(entry => {
        const dayBlock = document.createElement('div');
        dayBlock.className = 'archive-day';
        let itemsHtml = '';
        
        entry.items.forEach(item => {
            itemsHtml += `
                <div class="archive-item">
                    <span style="color:${item.completed ? 'var(--c-action)' : 'inherit'}; flex-shrink: 0;">${item.completed ? '✓' : '○'}</span>
                    <span class="archive-item-text" style="${item.completed ? 'text-decoration:line-through' : ''}">${escapeHtml(item.text)}</span>
                </div>
            `;
        });
        
        dayBlock.innerHTML = `
            <div class="archive-date">${entry.date}</div>
            <div class="glass-surface" style="border-radius:12px; overflow:hidden;">${itemsHtml}</div>
        `;
        archiveContent.appendChild(dayBlock);
    });
}

// ===== ANALYTICS =====
function renderAnalytics() {
    document.getElementById('totalTasksCompleted').textContent = getTotalTasksCompleted();
    document.getElementById('currentStreak').textContent = STATE.analytics.streaks.current;
    document.getElementById('totalBooks').textContent = STATE.books.filter(b => b.status === 'completed').length;
    document.getElementById('bestStreak').textContent = STATE.analytics.streaks.best;
    document.getElementById('productiveDays').textContent = getProductiveDays();
    renderWeeklyChart();
    renderMonthlyChart();
}

function renderWeeklyChart() {
    const weeklyChart = document.getElementById('weeklyChart');
    weeklyChart.innerHTML = '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getDateString(date);
        const dayData = STATE.analytics.daily[dateStr] || { completed: 0 };
        const dayName = days[date.getDay()];
        const maxHeight = 140;
        const height = Math.max(10, (dayData.completed / 10) * maxHeight);
        
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${height}px`;
        bar.innerHTML = `
            <div class="chart-bar-value">${dayData.completed}</div>
            <div class="chart-bar-label">${dayName}</div>
        `;
        weeklyChart.appendChild(bar);
    }
}

function renderMonthlyChart() {
    const monthlyChart = document.getElementById('monthlyChart');
    monthlyChart.innerHTML = '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    for (let month = 0; month < 12; month++) {
        let monthTotal = 0;
        for (const dateStr in STATE.analytics.daily) {
            const date = new Date(dateStr);
            if (date.getFullYear() === currentYear && date.getMonth() === month) {
                monthTotal += STATE.analytics.daily[dateStr].completed || 0;
            }
        }
        
        const maxHeight = 140;
        const height = Math.max(10, (monthTotal / 50) * maxHeight);
        
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${height}px`;
        bar.innerHTML = `
            <div class="chart-bar-value">${monthTotal}</div>
            <div class="chart-bar-label">${months[month]}</div>
        `;
        monthlyChart.appendChild(bar);
    }
}

// ===== NOTIFICATIONS =====
let notificationTimeout = null;

async function requestNotificationPermission() {
    if ('Notification' in window) {
        try {
            const permission = await Notification.requestPermission();
            STATE.settings.notificationPermission = permission;
            saveState();
            return permission === 'granted';
        } catch (e) {
            console.error('Notification permission error:', e);
            return false;
        }
    }
    return false;
}

function scheduleEndOfDayNotification() {
    if (notificationTimeout) clearTimeout(notificationTimeout);
    
    if (!STATE.settings.notifications || STATE.settings.notificationPermission !== 'granted') return;
    
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(24, 0, 0, 0);
    const fourHoursBefore = endOfDay.getTime() - (4 * 60 * 60 * 1000);
    const timeUntilNotification = fourHoursBefore - now.getTime();
    
    if (timeUntilNotification > 0) {
        notificationTimeout = setTimeout(() => {
            checkAndNotify();
        }, timeUntilNotification);
    }
}

function checkAndNotify() {
    const incompleteTasks = STATE.todos.filter(t => !t.completed).length;
    
    if (incompleteTasks > 0 && STATE.settings.notificationPermission === 'granted') {
        playNotificationSound();
        new Notification('GlassFocus Reminder', {
            body: `You have ${incompleteTasks} incomplete task${incompleteTasks > 1 ? 's' : ''}. Let's finish strong! 💪`,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%23152433"/><path d="M58 96 L86 124 L134 68" stroke="%2303d5ff" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            tag: 'daily-reminder'
        });
        document.getElementById('notificationBadge').style.display = 'block';
    }
}

// ===== SETTINGS =====
function loadSettings() {
    document.getElementById('notificationsToggle').checked = STATE.settings.notifications;
    document.getElementById('autoArchiveToggle').checked = STATE.settings.autoArchive;
}

function setupSettings() {
    document.getElementById('notificationsToggle').addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        if (enabled) {
            const granted = await requestNotificationPermission();
            if (granted) {
                STATE.settings.notifications = true;
                scheduleEndOfDayNotification();
                showToast('Notifications enabled! 🔔');
            } else {
                e.target.checked = false;
                showToast('Notification permission denied');
            }
        } else {
            STATE.settings.notifications = false;
            if (notificationTimeout) clearTimeout(notificationTimeout);
        }
        saveState();
    });
    
    document.getElementById('autoArchiveToggle').addEventListener('change', (e) => {
        STATE.settings.autoArchive = e.target.checked;
        saveState();
        showToast(e.target.checked ? 'Auto-archive enabled' : 'Auto-archive disabled');
    });
}

// ===== THEME =====
function setupTheme() {
    const savedTheme = localStorage.getItem('glass-theme');
    let initialTheme = 'light';
    
    if (savedTheme) {
        initialTheme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        initialTheme = 'dark';
    }
    
    const input = document.querySelector(`input[value="${initialTheme}"]`);
    if (input) {
        input.checked = true;
        const switcher = document.getElementById('themeSwitcher');
        const option = input.getAttribute('c-option');
        switcher.setAttribute('c-previous', option);
        updateThemeColor(initialTheme);
    }
    
    document.querySelectorAll('input[name="theme"]').forEach(inp => {
        inp.addEventListener('change', (e) => {
            const val = e.target.value;
            const option = e.target.getAttribute('c-option');
            const switcher = document.getElementById('themeSwitcher');
            const prev = switcher.getAttribute('c-previous') || "1";
            
            switcher.setAttribute('c-previous', prev);
            localStorage.setItem('glass-theme', val);
            updateThemeColor(val);
            
            setTimeout(() => switcher.setAttribute('c-previous', option), 0);
        });
    });
}

function updateThemeColor(theme) {
    const themeColorMap = { 'light': '#e8e8e9', 'dark': '#1b1b1d', 'dim': '#152433' };
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColorMap[theme] || '#152433');
    }
}

// ===== PWA =====
let deferredPrompt;

function setupPWA() {
    const installBtn = document.getElementById('installBtn');
    const offlineIndicator = document.getElementById('offlineIndicator');
    
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('SW registered:', reg))
                .catch(err => console.log('SW registration failed:', err));
        });
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.classList.add('show');
    });
    
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.classList.remove('show');
        if (outcome === 'accepted') showToast('App installed! 🎉');
    });
    
    window.addEventListener('appinstalled', () => {
        installBtn.classList.remove('show');
        deferredPrompt = null;
    });
    
    function updateOnlineStatus() {
        offlineIndicator.classList[!navigator.onLine ? 'add' : 'remove']('show');
    }
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
}

// ===== MODALS =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    if (modalId === 'archiveModal') renderArchive();
    else if (modalId === 'booksModal') renderBooks();
    else if (modalId === 'statsModal') renderAnalytics();
    else if (modalId === 'settingsModal') document.getElementById('notificationBadge').style.display = 'none';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
    document.body.style.overflow = '';
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    document.getElementById('todoForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('todoInput');
        addTodo(input.value);
        input.value = '';
    });
    
    document.getElementById('archiveBtn').addEventListener('click', () => openModal('archiveModal'));
    document.getElementById('settingsBtn').addEventListener('click', () => openModal('settingsModal'));
    document.getElementById('booksBtn').addEventListener('click', () => openModal('booksModal'));
    document.getElementById('statsBtn').addEventListener('click', () => openModal('statsModal'));
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
            document.body.style.overflow = '';
        }
    });
    
    document.getElementById('bookInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addBook();
        }
    });
}

// ===== INIT =====
function init() {
    console.log('🎯 GlassFocus v2.0 initializing...');
    loadState();
    checkDailyReset();
    setupTheme();
    setupPWA();
    setupSettings();
    setupEventListeners();
    renderTodos();
    loadSettings();
    
    if (STATE.settings.notifications) scheduleEndOfDayNotification();
    
    setInterval(() => {
        updateDailyAnalytics();
        calculateStreak();
    }, 60000);
    
    console.log('✅ GlassFocus ready!');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
