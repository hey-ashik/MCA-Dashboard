// Supabase Configuration
const supabaseUrl = 'https://sdsimcbqpfhhorvqqqdr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkc2ltY2JxcGZoaG9ydnFxcWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTM2NzUsImV4cCI6MjA4NzY2OTY3NX0.OmLS2t5qSrCK7HxcGsB-o_N_Zw8g3BW4pMVT0tT1neM';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Course Data (Will be loaded from Supabase)
let courseData = [];

// Formatting functions
const formatCurrency = (amount) => `৳${parseFloat(amount || 0).toLocaleString()}`;
const getStatusBadge = (enrolled) => {
    return parseInt(enrolled) > 0
        ? `<span class="status-badge status-active">Active</span>`
        : `<span class="status-badge status-inactive">No Enrollments</span>`;
};

const showToast = (message, type = 'success') => {
    const toast = document.getElementById('appToast');
    if (!toast) return;

    // Set icon and style based on type
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>';

    toast.className = `app-toast ${type}`;
    toast.innerHTML = `${icon}<span class="app-toast-text">${message}</span>`;

    // Show toast
    toast.classList.add('show');

    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};

// State
let groqApiKey = localStorage.getItem('groq_api_key') || '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';
let chartInstances = {};

// Fetch Data from Supabase
async function fetchCourses() {
    const { data, error } = await supabaseClient.from('courses').select('*').order('id', { ascending: true });
    if (error) {
        console.error('Error fetching courses:', error);
        return false;
    }
    courseData = data || [];
    return true;
}

// Subscribe to Realtime Changes
function setupRealtime() {
    supabaseClient.channel('public:courses')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, (payload) => {
            fetchCourses().then(() => updateDashboardState());
        })
        .subscribe();

    supabaseClient.channel('public:course_students')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'course_students' }, (payload) => {
            if (window.currentCourseId) loadCourseStudents(window.currentCourseId);
        })
        .subscribe();
}

// DOM Elements
document.addEventListener('DOMContentLoaded', async () => {
    initAuth();
    initUI();
    const success = await fetchCourses();
    if (!success) {
        console.warn("Could not fetch from Supabase. Ensure 'courses' table exists.");
        // Fallback placeholder data if table doesn't exist yet
        courseData = [
            { id: 1, name: "Techno Commercial Attributes in Food Industry", fee: 2000, enrolled: 49, received: 94000, pending: 4000 },
            { id: 2, name: "Operation & Maint...", fee: 2000, enrolled: 4, received: 4000, pending: 4000 }
        ];
    }
    setupRealtime();
    renderDashboard();
    initCharts();
    initAIPredictor();
    initCourseStudentsLogic();
});

// Authentication Logic
function initAuth() {
    const loginForm = document.getElementById('loginForm');
    const authOverlay = document.getElementById('authOverlay');
    const appContainer = document.getElementById('appContainer');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;

            if (user === 'admin@entry' && pass === '2103') {
                authOverlay.classList.remove('active');
                appContainer.style.opacity = '1';
                appContainer.style.pointerEvents = 'all';
                showToast("Welcome back Admin!", 'success');
            } else {
                showToast("Invalid Credentials! Please check your username and password.", 'error');
            }
        });
    }

    const logout = (e) => {
        e.preventDefault();
        appContainer.style.opacity = '0';
        appContainer.style.pointerEvents = 'none';
        authOverlay.classList.add('active');
    };

    const logoutBtnSidebar = document.getElementById('logoutBtnSidebar');
    const settingsLogoutBtn = document.getElementById('settingsLogoutBtn');
    if (logoutBtnSidebar) logoutBtnSidebar.addEventListener('click', logout);
    if (settingsLogoutBtn) settingsLogoutBtn.addEventListener('click', logout);
}

// Load user profile logic
function loadUserProfile() {
    try {
        const saved = localStorage.getItem('user_profile');
        if (saved) {
            const profile = JSON.parse(saved);

            // Update Header
            const nameEl = document.getElementById('headerProfileName');
            const roleEl = document.getElementById('headerProfileRole');
            const imgEl = document.getElementById('headerProfileImage');

            if (nameEl) nameEl.innerText = profile.name;
            if (roleEl) roleEl.innerText = profile.role;
            if (imgEl) {
                if (profile.image) {
                    imgEl.src = profile.image;
                } else {
                    imgEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=059669&color=fff`;
                }
            }

            // Sync with settings inputs
            const nameInput = document.getElementById('settingsProfileName');
            const roleInput = document.getElementById('settingsProfileRole');
            const imgInput = document.getElementById('settingsProfileImage');

            if (nameInput) nameInput.value = profile.name;
            if (roleInput) roleInput.value = profile.role;
        }
    } catch (e) { console.error("Could not load profile", e) }
}

// UI Initialization
function initUI() {
    // Load user profile 
    loadUserProfile();

    // Profile Settings Save
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const name = document.getElementById('settingsProfileName').value.trim();
            const role = document.getElementById('settingsProfileRole').value.trim();
            const imageInput = document.getElementById('settingsProfileImage');

            let imageUrl = '';

            // Re-load existing profile to keep old image if not updating
            const saved = localStorage.getItem('user_profile');
            if (saved) {
                const existing = JSON.parse(saved);
                imageUrl = existing.image || '';
            }

            if (imageInput.files && imageInput.files[0]) {
                const formData = new FormData();
                formData.append('profileImage', imageInput.files[0]);

                const btn = saveProfileBtn;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
                btn.disabled = true;

                try {
                    const response = await fetch('upload.php', {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    if (result.success) {
                        imageUrl = result.url;
                    } else {
                        showToast('Upload failed: ' + result.error, 'error');
                    }
                } catch (error) {
                    console.error('Upload Error:', error);
                    showToast('Could not connect to upload server to save image (PHP needed)', 'error');
                }
                btn.innerHTML = originalText;
                btn.disabled = false;
            }

            const profile = { name: name || 'Admin User', role: role || 'Manager', image: imageUrl };
            localStorage.setItem('user_profile', JSON.stringify(profile));

            loadUserProfile();
            showToast('Profile updated successfully!', 'success');
            imageInput.value = '';
        });
    }

    // Notification Dropdown Logic
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');

    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
                notificationDropdown.classList.remove('active');
            }
        });
    }

    // Removed global search functionality as per user request

    // Filtering Functionality (Courses Tab)
    const courseTabSearchInput = document.getElementById('courseTabSearchInput');
    const courseFilter = document.getElementById('courseFilter');

    window.executeCourseTabFilters = function () {
        const query = courseTabSearchInput ? courseTabSearchInput.value.toLowerCase() : '';
        const filterStatus = courseFilter ? courseFilter.value : 'all';

        let filteredData = courseData.filter(c => (c.name || '').toLowerCase().includes(query));

        if (filterStatus === 'pending') {
            filteredData = filteredData.filter(c => parseFloat(c.pending) > 0);
        } else if (filterStatus === 'active') {
            filteredData = filteredData.filter(c => parseInt(c.enrolled) > 0);
        } else if (filterStatus === 'no_enrolled') {
            filteredData = filteredData.filter(c => parseInt(c.enrolled) === 0);
        } else if (filterStatus === 'highest_enrolled') {
            filteredData = filteredData.sort((a, b) => parseInt(b.enrolled) - parseInt(a.enrolled));
        }

        renderCoursesGrid(filteredData);
    }

    if (courseTabSearchInput) {
        courseTabSearchInput.addEventListener('input', window.executeCourseTabFilters);
    }

    if (courseFilter) {
        courseFilter.addEventListener('change', window.executeCourseTabFilters);
    }

    // Filtering Functionality (Dashboard Table)
    const coursePerformanceFilter = document.getElementById('coursePerformanceFilter');
    const dashboardSearchInput = document.getElementById('dashboardSearchInput');

    window.executeDashboardTableFilter = function () {
        const filterStatus = coursePerformanceFilter ? coursePerformanceFilter.value : 'all';
        const query = dashboardSearchInput ? dashboardSearchInput.value.toLowerCase() : '';
        let filteredData = [...courseData];

        if (query) {
            filteredData = filteredData.filter(c => (c.name || '').toLowerCase().includes(query));
        }

        if (filterStatus === 'pending') {
            filteredData = filteredData.filter(c => parseFloat(c.pending) > 0);
        } else if (filterStatus === 'active') {
            filteredData = filteredData.filter(c => parseInt(c.enrolled) > 0);
        } else if (filterStatus === 'no_enrolled') {
            filteredData = filteredData.filter(c => parseInt(c.enrolled) === 0);
        } else if (filterStatus === 'highest_enrolled') {
            filteredData = filteredData.sort((a, b) => parseInt(b.enrolled) - parseInt(a.enrolled));
        }

        renderDashboardTable(filteredData);
    };

    if (coursePerformanceFilter) {
        coursePerformanceFilter.addEventListener('change', window.executeDashboardTableFilter);
    }

    if (dashboardSearchInput) {
        dashboardSearchInput.addEventListener('input', window.executeDashboardTableFilter);
    }

    // Pending Payments Card Redirect
    const pendingCard = document.getElementById('pendingPaymentsCard');
    if (pendingCard) {
        pendingCard.addEventListener('click', () => {
            const courseTabBtn = document.querySelector('.nav-links li[data-tab="courses"]');
            if (courseTabBtn) courseTabBtn.click();

            if (courseFilter) {
                courseFilter.value = 'pending';
                window.executeCourseTabFilters();
            }
        });
    }

    // Modal Handling for Courses
    const courseModal = document.getElementById('courseModal');
    const courseForm = document.getElementById('courseForm');

    document.getElementById('addCourseBtn').addEventListener('click', () => {
        document.getElementById('courseModalTitle').innerText = 'Add New Course';
        courseForm.reset();
        document.getElementById('courseId').value = '';
        courseModal.classList.add('active');
    });

    document.getElementById('cancelCourseBtn').addEventListener('click', (e) => {
        e.preventDefault();
        courseModal.classList.remove('active');
    });

    document.getElementById('saveCourseBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        if (!document.getElementById('courseName').value) return showToast('Course Name is required.', 'error');
        if (!document.getElementById('courseFee').value) return showToast('Course Fee is required.', 'error');

        const btn = document.getElementById('saveCourseBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        const id = document.getElementById('courseId').value;
        const newCourse = {
            name: document.getElementById('courseName').value,
            fee: parseFloat(document.getElementById('courseFee').value) || 0,
            enrolled: parseInt(document.getElementById('courseEnrolled').value) || 0,
            received: parseFloat(document.getElementById('courseReceived').value) || 0,
            pending: parseFloat(document.getElementById('coursePending').value) || 0
        };

        try {
            if (id) {
                const { error } = await supabaseClient.from('courses').update(newCourse).eq('id', parseInt(id));
                if (error) throw error;
            } else {
                const { error } = await supabaseClient.from('courses').insert([newCourse]);
                if (error) throw error;
            }

            courseModal.classList.remove('active');
            await fetchCourses();
            updateDashboardState();
        } catch (error) {
            console.error(error);
            showToast('Failed to save to Supabase: ' + (error.message || 'Check console errors.'), 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // Refresh Data
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', async () => {
            const originalText = refreshDataBtn.innerHTML;
            refreshDataBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';
            await fetchCourses();
            updateDashboardState();
            refreshDataBtn.innerHTML = originalText;
        });
    }

    // Sidebar Toggle
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
                setTimeout(() => resizeCharts(), 300); // Resize charts after transition
            }
        });

        // Close sidebar on mobile when a link is clicked
        const navLinksList = document.querySelectorAll('.nav-links li');
        navLinksList.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
            });
        });
    }

    // Tabs
    const navLinks = document.querySelectorAll('.nav-links li');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remove active classes
            navLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class
            link.classList.add('active');
            const tabId = link.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');

            // Re-render things if needed
            if (tabId === 'dashboard') resizeCharts();
        });
    });

    // Modal
    const apiKeyBtn = document.getElementById('openApiKeyModal');
    const modal = document.getElementById('apiKeyModal');
    const closeBtns = document.querySelectorAll('.close-modal');
    const saveKeyBtn = document.getElementById('saveModalApiKeyBtn');
    const apiKeyInput = document.getElementById('modalApiKeyInput');

    // Also update settings page input
    const settingsKeyInput = document.getElementById('settingsApiKey');
    if (groqApiKey) {
        settingsKeyInput.value = groqApiKey;
        apiKeyInput.value = groqApiKey;
    }

    if (!groqApiKey) {
        // Show modal on first load if no key
        setTimeout(() => modal.classList.add('active'), 500);
    }

    apiKeyBtn.addEventListener('click', () => modal.classList.add('active'));

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => modal.classList.remove('active'));
    });

    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            saveApiKey(key);
            modal.classList.remove('active');
        }
    });

    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        const key = settingsKeyInput.value.trim();
        saveApiKey(key);
        showToast('Settings saved successfully!', 'success');
    });

    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to clear all app cache? This will reset your avatar and API key. You will need to log in again.")) {
                localStorage.clear();
                window.location.reload();
            }
        });
    }
}

function updateDashboardState() {
    renderDashboard();

    // Update global stats
    const totalRev = courseData.reduce((acc, curr) => acc + parseFloat(curr.received || 0), 0);
    const totalEnrolled = courseData.reduce((acc, curr) => acc + parseInt(curr.enrolled || 0), 0);
    const totalPending = courseData.reduce((acc, curr) => acc + parseFloat(curr.pending || 0), 0);

    document.getElementById('total-revenue-stat').innerText = formatCurrency(totalRev);
    document.getElementById('total-enrolled-stat').innerText = totalEnrolled;
    document.getElementById('total-courses-stat').innerText = courseData.length;
    document.getElementById('total-pending-stat').innerText = formatCurrency(totalPending);

    // Update charts
    updateCharts();
}

function saveApiKey(key) {
    groqApiKey = key;
    localStorage.setItem('groq_api_key', key);
    document.getElementById('modalApiKeyInput').value = key;
    document.getElementById('settingsApiKey').value = key;
}

window.editCourse = function (id) {
    const course = courseData.find(c => c.id === id);
    if (course) {
        document.getElementById('courseModalTitle').innerText = 'Edit Course';
        document.getElementById('courseId').value = course.id;
        document.getElementById('courseName').value = course.name;
        document.getElementById('courseFee').value = course.fee;
        document.getElementById('courseEnrolled').value = course.enrolled;
        document.getElementById('courseReceived').value = course.received;
        document.getElementById('coursePending').value = course.pending;
        document.getElementById('courseModal').classList.add('active');
    }
}

window.deleteCourse = async function (id) {
    const course = courseData.find(c => c.id === id);
    if (!course) return;

    if (confirm(`Are you sure you want to delete course: ${course.name}?`)) {
        try {
            const { error } = await supabaseClient.from('courses').delete().eq('id', id);
            if (error) throw error;

            await fetchCourses();
            updateDashboardState();
            showToast('Course successfully deleted', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to delete course from Supabase: ' + (error.message || 'Check console'), 'error');
        }
    }
}

window.openCourseDetails = function (id) {
    const course = courseData.find(c => c.id === id);
    if (!course) return;

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));

    // Show details tab
    const detailsTab = document.getElementById('course-details-tab');
    if (detailsTab) detailsTab.classList.add('active');

    // Populate data
    document.getElementById('course-details-title').innerText = course.name;
    document.getElementById('cd-total-enrolled').innerText = course.enrolled;
    document.getElementById('cd-total-paid').innerText = formatCurrency(course.received);
    document.getElementById('cd-total-pending').innerText = formatCurrency(course.pending);

    const totalRev = Number(course.received || 0) + Number(course.pending || 0);
    document.getElementById('cd-total-revenue').innerText = formatCurrency(totalRev);

    window.currentCourseId = id;
    loadCourseStudents(id);
}

window.closeCourseDetails = function () {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const coursesTab = document.getElementById('courses-tab');
    if (coursesTab) coursesTab.classList.add('active');

    // reset nav link
    const coursesNav = document.querySelector('.nav-links li[data-tab="courses"]');
    if (coursesNav) coursesNav.classList.add('active');
}

// Student Logic
async function loadCourseStudents(courseId) {
    const tableBody = document.getElementById('course-students-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading students...</td></tr>`;

    const { data, error } = await supabaseClient.from('course_students').select('*').eq('course_id', courseId).order('date', { ascending: false });

    if (error) {
        if (error.code === '42P01') {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger); padding: 24px;">Supabase Table 'course_students' is missing! Please create it in your database with columns: id, course_id, student_name, date, phone, email, amount.</td></tr>`;
        } else {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger); padding: 24px;">${error.message}</td></tr>`;
        }
        document.getElementById('cd-student-count').textContent = '0';
        return;
    }

    if (!data || data.length === 0) {
        window.currentStudents = [];
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No students Information found.</td></tr>`;
        document.getElementById('cd-student-count').textContent = '0';
        return;
    }

    window.currentStudents = data;
    renderStudentsTable(data);
}

function renderStudentsTable(studentsData) {
    const tableBody = document.getElementById('course-students-table-body');
    if (!tableBody) return;

    document.getElementById('cd-student-count').textContent = studentsData.length;
    tableBody.innerHTML = '';

    if (studentsData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No matching students found.</td></tr>`;
        return;
    }

    studentsData.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${student.student_name}</strong></td>
            <td>${student.date}</td>
            <td>${student.phone}</td>
            <td>${student.email || '-'}</td>
            <td>${formatCurrency(student.amount)}</td>
            <td style="display: flex; gap: 8px;">
                <button class="btn btn-outline btn-sm" onclick="window.editStudent('${student.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="window.deleteStudent('${student.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function initCourseStudentsLogic() {
    const studentModal = document.getElementById('studentModal');
    if (!studentModal) return;

    // Bind CSV upload button
    document.getElementById('btnUploadCsv').addEventListener('click', () => {
        document.getElementById('courseCsvUpload').click();
    });

    // Search functionality
    const studentSearchInput = document.getElementById('studentSearchInput');
    if (studentSearchInput) {
        studentSearchInput.addEventListener('input', (e) => {
            if (!window.currentStudents) return;
            const term = e.target.value.toLowerCase();
            const filtered = window.currentStudents.filter(s =>
                (s.student_name && s.student_name.toLowerCase().includes(term)) ||
                (s.phone && s.phone.toLowerCase().includes(term)) ||
                (s.email && s.email.toLowerCase().includes(term))
            );
            renderStudentsTable(filtered);
        });
    }

    document.getElementById('btnAddStudent').addEventListener('click', () => {
        if (!window.currentCourseId) return;
        document.getElementById('studentId').value = '';
        document.getElementById('studentForm').reset();
        document.getElementById('studentDate').valueAsDate = new Date();
        document.getElementById('studentModalTitle').innerText = 'Add New Student';
        document.getElementById('saveStudentBtn').innerText = 'Save Student';
        studentModal.classList.add('active');
    });

    const closeStudentModals = () => studentModal.classList.remove('active');
    document.getElementById('closeStudentModal').addEventListener('click', closeStudentModals);
    document.getElementById('cancelStudentBtn').addEventListener('click', (e) => { e.preventDefault(); closeStudentModals(); });

    document.getElementById('saveStudentBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        const courseId = window.currentCourseId;
        if (!courseId) return;

        const name = document.getElementById('studentName').value;
        const date = document.getElementById('studentDate').value;
        const phone = document.getElementById('studentPhone').value;
        const email = document.getElementById('studentEmail').value;
        const amount = document.getElementById('studentAmount').value;

        if (!name || !date || !phone) return showToast('Name, Date, and Phone are required', 'error');

        const btn = document.getElementById('saveStudentBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        const newStudent = { course_id: courseId, student_name: name, date, phone, email, amount: parseFloat(amount || 0) };
        const studentId = document.getElementById('studentId').value;

        try {
            if (studentId) {
                const { error } = await supabaseClient.from('course_students').update(newStudent).eq('id', studentId);
                if (error) throw error;
                showToast('Student updated successfully!', 'success');
            } else {
                const { error } = await supabaseClient.from('course_students').insert([newStudent]);
                if (error) throw error;
                showToast('Student added successfully!', 'success');
            }

            closeStudentModals();
            loadCourseStudents(courseId);
        } catch (error) {
            console.error(error);
            showToast('Failed to save student. ' + error.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    document.getElementById('courseCsvUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !window.currentCourseId) return;

        const reader = new FileReader();
        reader.onload = async function (event) {
            const text = event.target.result;
            const rows = text.split(/\r?\n/).filter(r => r.trim() !== '');
            const students = [];
            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(',');
                if (cols.length >= 3) {
                    students.push({
                        course_id: window.currentCourseId,
                        student_name: cols[0]?.trim(),
                        date: cols[1]?.trim() || new Date().toISOString().split('T')[0],
                        phone: cols[2]?.trim(),
                        email: cols[3]?.trim() || null,
                        amount: parseFloat(cols[4] || 0)
                    });
                }
            }
            if (students.length === 0) return showToast('No valid data found in CSV', 'error');

            try {
                const { error } = await supabaseClient.from('course_students').insert(students);
                if (error) throw error;
                showToast(students.length + ' students imported successfully!', 'success');
                loadCourseStudents(window.currentCourseId);
            } catch (error) {
                console.error(error);
                showToast('Import failed: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });
}

window.editStudent = function (studentId) {
    if (!window.currentStudents) return;
    const student = window.currentStudents.find(s => s.id == studentId);
    if (!student) return;

    document.getElementById('studentId').value = student.id;
    document.getElementById('studentName').value = student.student_name;
    document.getElementById('studentDate').value = student.date;
    document.getElementById('studentPhone').value = student.phone;
    document.getElementById('studentEmail').value = student.email || '';
    document.getElementById('studentAmount').value = student.amount || 0;

    document.getElementById('studentModalTitle').innerText = 'Edit Student Info';
    document.getElementById('saveStudentBtn').innerText = 'Update Student';
    document.getElementById('studentModal').classList.add('active');
};

window.deleteStudent = async function (studentId) {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;

    try {
        const { error } = await supabaseClient.from('course_students').delete().eq('id', studentId);
        if (error) throw error;

        showToast('Student deleted successfully!', 'success');
        if (window.currentCourseId) loadCourseStudents(window.currentCourseId);
    } catch (error) {
        console.error(error);
        showToast('Error deleting student: ' + error.message, 'error');
    }
};

// Render Dashboard Data
function renderDashboard() {
    if (window.executeDashboardTableFilter) {
        window.executeDashboardTableFilter();
    } else {
        renderDashboardTable(courseData);
    }

    if (window.executeCourseTabFilters) {
        window.executeCourseTabFilters();
    } else {
        renderCoursesGrid(courseData);
    }
}

function renderDashboardTable(data) {
    const tableBody = document.getElementById('course-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    data.forEach(course => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${course.name}</strong></td>
            <td>${formatCurrency(course.fee)}</td>
            <td>${course.enrolled}</td>
            <td>${formatCurrency(course.received)}</td>
            <td>${formatCurrency(course.pending)}</td>
            <td>${getStatusBadge(course.enrolled)}</td>
        `;
        tableBody.appendChild(tr);
    });
}

function renderCoursesGrid(data) {
    const coursesGrid = document.getElementById('courses-extended-grid');
    if (!coursesGrid) return;
    coursesGrid.innerHTML = '';

    data.forEach(course => {
        const card = document.createElement('div');
        card.className = 'course-list-item';
        card.style.background = 'var(--card-bg)';
        card.style.border = '1px solid var(--border-color)';
        card.style.borderRadius = 'var(--radius-md)';
        card.style.padding = '16px';
        card.style.marginBottom = '12px';
        card.style.boxShadow = 'var(--shadow-sm)';
        card.style.transition = 'all 0.2s';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 16px; cursor: pointer;" onclick="window.openCourseDetails(${course.id})">
                    <div class="stat-icon courses-icon" style="width: 40px; height: 40px; font-size: 18px;"><i class="fa-solid fa-book"></i></div>
                    <h3 style="color: var(--text-main); font-weight: 600; font-size: 16px; margin: 0; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-main)'">${course.name || 'Unnamed Course'}</h3>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-outline btn-sm" onclick="window.openCourseDetails(${course.id})"><i class="fa-solid fa-eye"></i> View</button>
                    <button class="btn btn-primary btn-sm" onclick="editCourse(${course.id})"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="deleteCourse(${course.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        coursesGrid.appendChild(card);
    });
}

// Charts
function initCharts() {
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    const enrollmentCtx = document.getElementById('enrollmentChart').getContext('2d');

    // Process data for charts
    const labels = courseData.map(c => c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name);
    const revenues = courseData.map(c => c.received);
    const pendings = courseData.map(c => c.pending);
    const enrollments = courseData.map(c => c.enrolled);

    chartInstances.revenue = new Chart(revenueCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Received (৳)',
                    data: revenues,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                },
                {
                    label: 'Pending (৳)',
                    data: pendings,
                    backgroundColor: '#f59e0b',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });

    chartInstances.enrollment = new Chart(enrollmentCtx, {
        type: 'doughnut',
        data: {
            labels: labels.filter((_, i) => enrollments[i] > 0),
            datasets: [{
                data: enrollments.filter(e => e > 0),
                backgroundColor: [
                    '#059669',
                    '#3b82f6',
                    '#8b5cf6',
                    '#f59e0b'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function resizeCharts() {
    if (chartInstances.revenue) chartInstances.revenue.resize();
    if (chartInstances.enrollment) chartInstances.enrollment.resize();
}

function updateCharts() {
    if (!chartInstances.revenue || !chartInstances.enrollment) return;

    const labels = courseData.map(c => c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name);
    const revenues = courseData.map(c => c.received);
    const pendings = courseData.map(c => c.pending);
    const enrollments = courseData.map(c => c.enrolled);

    chartInstances.revenue.data.labels = labels;
    chartInstances.revenue.data.datasets[0].data = revenues;
    chartInstances.revenue.data.datasets[1].data = pendings;
    chartInstances.revenue.update();

    chartInstances.enrollment.data.labels = labels.filter((_, i) => enrollments[i] > 0);
    chartInstances.enrollment.data.datasets[0].data = enrollments.filter(e => e > 0);
    chartInstances.enrollment.update();
}

// AI Predictor Logic
function initAIPredictor() {
    const promptBtns = document.querySelectorAll('.prompt-btn');
    const customPromptBtn = document.getElementById('sendAiPromptBtn');
    const customPromptInput = document.getElementById('customAiPrompt');
    const aiStatus = document.getElementById('aiStatus');
    const aiLoading = document.getElementById('aiLoading');
    const aiResponseContent = document.getElementById('aiResponseContent');

    const handlePrompt = async (prompt) => {
        if (!groqApiKey) {
            showToast('Please enter your GroqCloud API Key first.', 'error');
            document.getElementById('apiKeyModal').classList.add('active');
            return;
        }

        // UI updates
        aiStatus.classList.add('hidden');
        aiResponseContent.classList.add('hidden');
        aiLoading.classList.remove('hidden');

        try {
            const contextData = JSON.stringify(courseData);
            const systemInstruction = `You are an expert AI business analyst for a course selling platform. 
            The user runs a professional dashboard with a Green and White theme.
            Format your response in neat markdown so it looks professional. Use bold headings, bullet points, and concise text.
            Here is the current operational data of the courses:\n${contextData}\n
            Analyze the data based on the user's prompt and provide actionable, intelligent insights.`;

            const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqApiKey}`
                },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: prompt }
                    ],
                    model: "openai/gpt-oss-120b",
                    temperature: 1,
                    max_completion_tokens: 8192,
                    top_p: 1,
                    stream: false,
                    reasoning_effort: "medium",
                    stop: null
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message || 'API Error');
            }

            const answer = data.choices[0].message.content;

            // Format markdown to HTML (using marked.js which is included in index.html)
            aiResponseContent.innerHTML = marked.parse(answer);

            aiLoading.classList.add('hidden');
            aiResponseContent.classList.remove('hidden');

        } catch (error) {
            console.error('AI Error:', error);
            aiLoading.classList.add('hidden');
            aiResponseContent.innerHTML = `<div style="color: var(--danger); padding: 20px; border: 1px solid var(--danger); border-radius: 8px; background: rgba(239, 68, 68, 0.1);">
                <i class="fa-solid fa-circle-exclamation"></i> <strong>Error generating AI response:</strong><br>${error.message}
                <br><br>Please double check your API key in Settings.
            </div>`;
            aiResponseContent.classList.remove('hidden');
        }
    };

    promptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.getAttribute('data-prompt');
            handlePrompt(prompt);
        });
    });

    customPromptBtn.addEventListener('click', () => {
        const prompt = customPromptInput.value.trim();
        if (prompt) {
            handlePrompt(prompt);
            customPromptInput.value = '';
        }
    });

    customPromptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            customPromptBtn.click();
        }
    });
}
