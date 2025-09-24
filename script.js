// User Authentication and Application Management System

// Initialize local storage for user data
// Backend base URL
const API_BASE = 'http://localhost:4000';

// Fallback local storage init (kept for offline/demo)
if (!localStorage.getItem('users')) localStorage.setItem('users', JSON.stringify([]));
if (!localStorage.getItem('applications')) localStorage.setItem('applications', JSON.stringify([]));
if (!localStorage.getItem('currentUser')) localStorage.setItem('currentUser', JSON.stringify(null));
if (!localStorage.getItem('notifications')) localStorage.setItem('notifications', JSON.stringify([]));

// Get current user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

// Set current user
function setCurrentUser(user) { localStorage.setItem('currentUser', JSON.stringify(user)); }
function setAuthToken(token) { localStorage.setItem('authToken', token || ''); }
function getAuthToken() { return localStorage.getItem('authToken') || ''; }

// Get all users
function getUsers() {
    return JSON.parse(localStorage.getItem('users'));
}

// Add new user (local fallback)
function addUser(user) { const users = getUsers(); users.push(user); localStorage.setItem('users', JSON.stringify(users)); }

// Get all applications
function getApplications() {
    return JSON.parse(localStorage.getItem('applications'));
}

// Add new application (local fallback)
function addApplication(application) { const applications = getApplications(); applications.push(application); localStorage.setItem('applications', JSON.stringify(applications)); }

// Get notifications
function getNotifications() {
    return JSON.parse(localStorage.getItem('notifications'));
}

// Add notification
function addNotification(notification) {
    const notifications = getNotifications();
    notifications.push(notification);
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

// Application Form Functions
function openApplicationForm(company, position) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please sign up or log in to apply for positions.');
        return;
    }
    
    document.getElementById('modalTitle').textContent = `Apply for ${position} at ${company}`;
    document.getElementById('applicationModal').style.display = 'block';
    
    // Pre-fill form with user data if available
    if (currentUser) {
        document.getElementById('fullName').value = currentUser.fullName || '';
        document.getElementById('email').value = currentUser.email || '';
        document.getElementById('phone').value = currentUser.phone || '';
        document.getElementById('degree').value = currentUser.degree || '';
        document.getElementById('college').value = currentUser.college || '';
        document.getElementById('graduationYear').value = currentUser.graduationYear || '';
        document.getElementById('gpa').value = currentUser.gpa || '';
    }
}

function closeApplicationForm() {
    document.getElementById('applicationModal').style.display = 'none';
    document.getElementById('applicationForm').reset();
}

// Handle application form submission
document.getElementById('applicationForm') && document.getElementById('applicationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please sign up or log in to submit applications.');
        return;
    }
    
    const formData = new FormData(this);
    const application = {
        id: Date.now(),
        userId: currentUser.id,
        company: document.getElementById('modalTitle').textContent.split(' at ')[1],
        position: document.getElementById('modalTitle').textContent.split(' for ')[1].split(' at ')[0],
        fullName: formData.get('fullName'),
        age: formData.get('age'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        degree: formData.get('degree'),
        college: formData.get('college'),
        graduationYear: formData.get('graduationYear'),
        gpa: formData.get('gpa'),
        languages: Array.from(document.querySelectorAll('input[name="languages"]:checked')).map(cb => cb.value),
        skills: formData.get('skills'),
        experience: formData.get('experience'),
        projects: formData.get('projects'),
        status: 'Applied',
        appliedDate: new Date().toISOString(),
        interviewDate: null
    };
    
    // Include internship details
    const hasInternship = (document.getElementById('hasInternship')?.value || 'no') === 'yes';
    if (hasInternship) {
        application.internships = [{
            company: document.getElementById('internCompany').value,
            role: document.getElementById('internRole').value,
            duration: document.getElementById('internDuration').value,
            description: document.getElementById('internDesc').value
        }];
    }

    // Try backend first
    try {
        const res = await fetch(`${API_BASE}/api/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
            body: JSON.stringify(application)
        });
        if (!res.ok) throw new Error('API error');
        // Alternate accept/reject and schedule interview on accepted
        const apps = getApplications();
        const isAccepted = (apps.length % 2) === 1; // first rejected, second accepted, alternating
        if (isAccepted) {
            application.status = 'Interview Scheduled';
            const date = new Date();
            date.setDate(date.getDate() + 7);
            application.interviewDate = date.toISOString();
        } else {
            application.status = 'Rejected';
        }
    } catch (err) {
        // local fallback + alternate decision
        const apps = getApplications();
        const isAccepted = (apps.length % 2) === 1;
        if (isAccepted) {
            application.status = 'Interview Scheduled';
            const date = new Date();
            date.setDate(date.getDate() + 7);
            application.interviewDate = date.toISOString();
        } else {
            application.status = 'Rejected';
        }
        addApplication(application);
    }
    
    // Update user profile with new information
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...application };
        localStorage.setItem('users', JSON.stringify(users));
        setCurrentUser(users[userIndex]);
    }
    
    // Add notification (applied)
    addNotification({
        id: Date.now(),
        userId: currentUser.id,
        type: 'application_submitted',
        title: 'Application Submitted',
        message: `Your application for ${application.position} at ${application.company} has been submitted successfully.`,
        date: new Date().toISOString(),
        read: false
    });

    // If accepted, add interview notification
    if (application.status === 'Interview Scheduled') {
        addNotification({
            id: Date.now() + 1,
            userId: currentUser.id,
            type: 'interview_scheduled',
            title: 'Interview Scheduled',
            message: `Your interview for ${application.position} at ${application.company} is scheduled on ${new Date(application.interviewDate).toLocaleString()}.`,
            date: new Date().toISOString(),
            read: false
        });
    }
    
    // Update dashboard immediately
    updateDashboardApplications();
    updateDashboardNotifications();
    alert(`Application submitted. Status: ${application.status}`);
    closeApplicationForm();
});

// Sign Up Functions
function openSignUpModal() {
    document.getElementById('signUpModal').style.display = 'block';
}

function closeSignUpModal() {
    document.getElementById('signUpModal').style.display = 'none';
    document.getElementById('signUpForm').reset();
}

// Handle sign up form submission
document.getElementById('signUpForm') && document.getElementById('signUpForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    const users = getUsers();
    const email = formData.get('email');
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
        alert('User with this email already exists!');
        return;
    }
    
    const newUser = {
        id: Date.now(),
        fullName: formData.get('fullName'),
        email: email,
        password: password, // In real app, this should be hashed
        phone: formData.get('phone'),
        degree: formData.get('degree'),
        college: formData.get('college'),
        graduationYear: formData.get('graduationYear'),
        gpa: formData.get('gpa'),
        languages: [],
        skills: '',
        experience: '',
        projects: '',
        signUpDate: new Date().toISOString()
    };
    
    // Backend sign up
    try {
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: newUser.fullName,
                email: newUser.email,
                password: password,
                phone: newUser.phone,
                degree: newUser.degree,
                college: newUser.college,
                graduationYear: newUser.graduationYear,
                gpa: newUser.gpa
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Signup failed');
        setAuthToken(data.token);
        setCurrentUser(data.user);
    } catch (err) {
        addUser(newUser);
        setCurrentUser(newUser);
    }
    
    // Add welcome notification
    addNotification({
        id: Date.now(),
        userId: newUser.id,
        type: 'welcome',
        title: 'Welcome to CampusConnect!',
        message: 'Your account has been created successfully. Start exploring opportunities!',
        date: new Date().toISOString(),
        read: false
    });
    
    alert('Account created successfully!');
    closeSignUpModal();
    updateNavigation();
});

// Login Functions
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('loginForm').reset();
}

// Handle login form submission
document.getElementById('loginForm') && document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        setAuthToken(data.token);
        setCurrentUser(data.user);
        alert('Login successful!');
        closeLoginModal();
        updateNavigation();
    } catch (err) {
        const users = getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            setCurrentUser(user);
            alert('Login successful!');
            closeLoginModal();
            updateNavigation();
        } else {
            alert('Invalid email or password!');
        }
    }
});

// Logout function
function logout() {
    setCurrentUser(null);
    setAuthToken('');
    updateNavigation();
    alert('Logged out successfully!');
}

// Update navigation based on login status
function updateNavigation() {
    const currentUser = getCurrentUser();
    const userAvatar = document.querySelector('.user-avatar');
    const navUser = document.querySelector('.nav-user');
    
    if (currentUser) {
        // User is logged in
        if (userAvatar) {
            userAvatar.src = currentUser.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face';
            userAvatar.alt = currentUser.fullName;
        }
        
        // Update sign up buttons to show user menu
        const signUpButtons = document.querySelectorAll('.signup-btn');
        signUpButtons.forEach(btn => {
            btn.innerHTML = `${currentUser.fullName} ▼`;
            btn.onclick = showUserMenu;
        });
        // Show logout in profile header if present
        const profileHeader = document.querySelector('.profile-card');
        if (profileHeader && !document.getElementById('logoutBtn')) {
            const btn = document.createElement('button');
            btn.id = 'logoutBtn';
            btn.className = 'btn-secondary';
            btn.textContent = 'Logout';
            btn.onclick = logout;
            profileHeader.appendChild(btn);
        }
        // Also update profile content
        populateProfileFromUser();
    } else {
        // User is not logged in
        if (userAvatar) {
            userAvatar.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face';
            userAvatar.alt = 'User';
        }
        
        // Update sign up buttons
        const signUpButtons = document.querySelectorAll('.signup-btn');
        signUpButtons.forEach(btn => {
            btn.innerHTML = 'Sign Up';
            btn.onclick = openSignUpModal;
        });

        // On profile page, prompt login
        const profileCard = document.querySelector('.profile-card');
        if (profileCard) {
            profileCard.innerHTML = '<div style="flex:1"><h2>Please log in to view your profile.</h2></div>' +
                '<div class="nav-actions"><button class="login-btn" onclick="openLoginModal()">Login</button><button class="signup-btn" onclick="openSignUpModal()">Sign Up</button></div>';
        }
    }
}

// Populate profile page fields from current user
function populateProfileFromUser() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const nameEl = document.querySelector('.profile-name');
    if (nameEl) nameEl.textContent = currentUser.fullName || nameEl.textContent;

    const titleEl = document.querySelector('.profile-title');
    if (titleEl) {
        const degree = currentUser.degree || '';
        const college = currentUser.college || '';
        if (degree || college) titleEl.textContent = `${degree}${degree && college ? ' at ' : ''}${college}`;
    }

    const joinedEl = document.querySelector('.profile-joined');
    if (joinedEl && currentUser.signUpDate) {
        const d = new Date(currentUser.signUpDate);
        const month = d.toLocaleString(undefined, { month: 'long' });
        joinedEl.textContent = `Joined ${month} ${d.getFullYear()}`;
    }

    const contactSpan = document.querySelector('#about .info-row:nth-child(2) .info-item:nth-child(1) span');
    if (contactSpan) contactSpan.textContent = currentUser.phone || contactSpan.textContent;
    const emailSpan = document.querySelector('#about .info-row:nth-child(2) .info-item:nth-child(2) span');
    if (emailSpan) emailSpan.textContent = currentUser.email || emailSpan.textContent;

    const degreeSpan = document.querySelector('.section .education-item:nth-child(1) .education-info span');
    if (degreeSpan && currentUser.degree) degreeSpan.textContent = currentUser.degree;
    const gpaSpan = document.querySelector('.section .education-item:nth-child(2) .education-info span');
    if (gpaSpan && currentUser.gpa) gpaSpan.textContent = currentUser.gpa;
    const gradSpan = document.querySelector('.section .education-item:nth-child(2) .education-details span');
    if (gradSpan && currentUser.graduationYear) gradSpan.textContent = currentUser.graduationYear;

    const skillsContainer = document.querySelector('.skills-container');
    if (skillsContainer && (currentUser.languages?.length || currentUser.skills)) {
        skillsContainer.innerHTML = '';
        (currentUser.languages || []).forEach(lang => {
            const div = document.createElement('div');
            div.className = 'skill-tag';
            div.textContent = lang;
            skillsContainer.appendChild(div);
        });
        if (currentUser.skills) {
            currentUser.skills.split(',').map(s=>s.trim()).filter(Boolean).forEach(s => {
                const div = document.createElement('div');
                div.className = 'skill-tag';
                div.textContent = s;
                skillsContainer.appendChild(div);
            });
        }
    }

    const expContainer = document.querySelector('#experience .experience-placeholder');
    if (expContainer && (currentUser.experience || (currentUser.internships && currentUser.internships.length))) {
        expContainer.innerHTML = '';
        if (currentUser.experience) {
            const p = document.createElement('p');
            p.textContent = currentUser.experience;
            expContainer.appendChild(p);
        }
        (currentUser.internships || []).forEach(intern => {
            const wrap = document.createElement('div');
            wrap.style.marginBottom = '12px';
            wrap.innerHTML = `<strong>${intern.company || ''}</strong> — ${intern.role || ''} (${intern.duration || ''})<br>${intern.description || ''}`;
            expContainer.appendChild(wrap);
        });
    }
}

// Show user menu
function showUserMenu() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.innerHTML = `
        <div class="user-menu-item" onclick="window.location.href='profile.html'">Profile</div>
        <div class="user-menu-item" onclick="window.location.href='dashboard.html'">Dashboard</div>
        <div class="user-menu-item" onclick="logout()">Logout</div>
    `;
    
    // Remove existing menu
    const existingMenu = document.querySelector('.user-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    document.body.appendChild(menu);
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && !e.target.classList.contains('signup-btn')) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

// Edit Profile Functions
function openEditProfileModal() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please log in to edit your profile.');
        return;
    }
    
    // Pre-fill form with current user data
    document.getElementById('editFullName').value = currentUser.fullName || '';
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('editPhone').value = currentUser.phone || '';
    document.getElementById('editDegree').value = currentUser.degree || '';
    document.getElementById('editCollege').value = currentUser.college || '';
    document.getElementById('editGraduationYear').value = currentUser.graduationYear || '';
    document.getElementById('editGpa').value = currentUser.gpa || '';
    document.getElementById('editSkills').value = currentUser.skills || '';
    document.getElementById('editExperience').value = currentUser.experience || '';
    document.getElementById('editProjects').value = currentUser.projects || '';
    
    // Check language checkboxes
    const languageCheckboxes = document.querySelectorAll('input[name="editLanguages"]');
    languageCheckboxes.forEach(cb => {
        cb.checked = currentUser.languages && currentUser.languages.includes(cb.value);
    });
    
    document.getElementById('editProfileModal').style.display = 'block';
}

function closeEditProfileModal() {
    document.getElementById('editProfileModal').style.display = 'none';
    document.getElementById('editProfileForm').reset();
}

// Handle edit profile form submission
document.getElementById('editProfileForm') && document.getElementById('editProfileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please log in to edit your profile.');
        return;
    }
    
    const formData = new FormData(this);
    const updatePayload = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        degree: formData.get('degree'),
        college: formData.get('college'),
        graduationYear: formData.get('graduationYear'),
        gpa: formData.get('gpa'),
        languages: Array.from(document.querySelectorAll('input[name="editLanguages"]:checked')).map(cb => cb.value),
        skills: formData.get('skills'),
        experience: formData.get('experience'),
        projects: formData.get('projects')
    };

    // Try backend
    try {
        const res = await fetch(`${API_BASE}/api/users/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
            body: JSON.stringify(updatePayload)
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.message || 'Update failed');
        setCurrentUser(updated);
    } catch (err) {
        // local fallback
        const users = getUsers();
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updatePayload };
            localStorage.setItem('users', JSON.stringify(users));
            setCurrentUser(users[userIndex]);
        }
    }

    alert('Profile updated successfully!');
    closeEditProfileModal();
    updateNavigation();
    populateProfileFromUser();
});

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', function() {
    updateNavigation();
    updateDashboardApplications();
    updateDashboardNotifications();
    updateDashboardWelcome();
    updateUpcomingInterviews();
    populateProfileFromUser();
});

// Update dashboard with user's notifications
function updateDashboardNotifications() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const notifications = getNotifications();
    const userNotifications = notifications.filter(notif => notif.userId === currentUser.id && !notif.read);
    
    // Update notifications section if it exists
    const notificationsSection = document.querySelector('.notifications-section');
    if (notificationsSection) {
        const notificationsList = notificationsSection.querySelector('.notifications-list') || notificationsSection;
        
        // Clear existing notifications
        const existingNotifications = notificationsList.querySelectorAll('.notification-card');
        existingNotifications.forEach(notif => notif.remove());
        
        // Add user's notifications
        userNotifications.slice(0, 3).forEach(notif => {
            const notificationCard = document.createElement('div');
            notificationCard.className = 'notification-card';
            notificationCard.innerHTML = `
                <div class="notification-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="notification-content">
                    <h4 class="notification-title">${notif.title}</h4>
                    <p class="notification-message">${notif.message}</p>
                    <p class="notification-date">${new Date(notif.date).toLocaleDateString()}</p>
                </div>
            `;
            notificationsList.appendChild(notificationCard);
        });
    }
}

// Update dashboard with user's applications
function updateDashboardApplications() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const applications = getApplications();
    const userApplications = applications.filter(app => app.userId === currentUser.id);
    const emptyMsg = document.getElementById('applicationsEmpty');
    const tbody = document.getElementById('applicationsBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (userApplications.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';
    userApplications.forEach(app => {
        const tr = document.createElement('tr');
        const statusClass = app.status ? app.status.toLowerCase().replace(/\s+/g, '-') : 'applied';
        tr.innerHTML = `
            <td style="padding:12px; border-bottom:1px solid #334455;">${app.company}</td>
            <td style="padding:12px; border-bottom:1px solid #334455;">${app.position}</td>
            <td style="padding:12px; border-bottom:1px solid #334455;"><span class="status-badge status-${statusClass}">${app.status}</span></td>
            <td style="padding:12px; border-bottom:1px solid #334455;">${new Date(app.appliedDate).toLocaleDateString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Welcome message with user name
function updateDashboardWelcome() {
    const currentUser = getCurrentUser();
    const welcome = document.querySelector('.welcome-message');
    if (welcome) {
        welcome.textContent = currentUser ? `Welcome back, ${currentUser.fullName}` : 'Welcome';
    }
}

// Populate Upcoming Interviews from accepted/scheduled applications
function updateUpcomingInterviews() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const apps = getApplications().filter(a => a.userId === currentUser.id && a.status === 'Interview Scheduled');
    const empty = document.getElementById('upcomingEmpty');
    const card = document.getElementById('interviewCard');
    if (!empty || !card) return;
    if (apps.length === 0) {
        empty.style.display = 'block';
        card.style.display = 'none';
        return;
    }
    const app = apps[0];
    empty.style.display = 'none';
    card.style.display = 'flex';
    const title = card.querySelector('.interview-title');
    const meta = card.querySelector('.interview-meta');
    if (title) title.textContent = `${app.position} Interview`;
    if (meta) meta.textContent = `${app.company} | ${new Date(app.interviewDate).toLocaleString()}`;
}

// View application details
function viewApplicationDetails(applicationId) {
    const applications = getApplications();
    const application = applications.find(app => app.id == applicationId);
    
    if (application) {
        alert(`Application Details:\n\nCompany: ${application.company}\nPosition: ${application.position}\nStatus: ${application.status}\nApplied Date: ${new Date(application.appliedDate).toLocaleDateString()}\n\nLanguages: ${application.languages.join(', ')}\nGPA: ${application.gpa}\nCollege: ${application.college}`);
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = ['applicationModal', 'signUpModal', 'loginModal', 'editProfileModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}
