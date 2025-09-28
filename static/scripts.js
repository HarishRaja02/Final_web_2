const app = document.getElementById('app');
const modalContainer = document.getElementById('modal-container');
let currentTheme = 'light-theme';
const loadingIcons = {
    upload: ['fa-file-alt', 'fa-database', 'fa-robot', 'fa-check-circle'],
    gmail: ['fa-envelope', 'fa-file-alt', 'fa-robot', 'fa-check-circle']
};

// +++++ ANIMATION FUNCTION FROM YOUR CODEPEN +++++
function startUploadPageAnimation() {
    // Check if an old timeline exists and kill it to prevent duplicates
    if (window.uploadPageTimeline) {
        window.uploadPageTimeline.kill();
    }
    
    // GSAP Timeline for sequencing animations
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 3 });
    
    // --- SCENE 1: UPLOAD (0s - 3.5s) ---
    tl.to("#scene1-text", { opacity: 1, duration: 0.5 })
    .to("#browser", { opacity: 1, scale: 1, duration: 0.5 }, "<")
    .to("#upload-box", { scale: 1.05, repeat: 1, yoyo: true, duration: 0.5, ease: "power1.inOut" })
    .to("#resume-icon", {
        opacity: 1,
        left: '45%',
        top: '50%',
        scale: 0.5,
        duration: 1,
        ease: "power2.inOut"
    }, "-=0.5")
    .to("#resume-icon", { scale: 0, opacity: 0, duration: 0.3 })
    .to("#upload-box", { borderColor: "var(--primary-orange)" }, "<")
    .to("#upload-box .upload-icon-wrapper", { scale: 0, opacity: 0, duration: 0.3, ease: "power2.in" }, "<")
    .to("#upload-box .fa-check", { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }, "-=0.1")
    .to(["#browser", "#scene1-text"], { opacity: 0, duration: 0.5, delay: 0.7 });
    
    // --- SCENE 2: DATABASE (3.5s - 5.5s) ---
    tl.to("#scene2-text", { opacity: 1, duration: 0.5 })
    .to("#database-icon", { opacity: 1, duration: 0.5 }, "<")
    .fromTo("#database-icon .fa-lock",
    { scale: 1 },
    { scale: 1.5, repeat: 1, yoyo: true, duration: 0.4, ease: "bounce.out", delay: 0.5 })
    .to(["#database-icon", "#scene2-text"], { opacity: 0, duration: 0.5, delay: 0.8 });
    
    // --- SCENE 3: AI ANALYSIS (5.5s - 8.5s) ---
    tl.to("#scene3-text", { opacity: 1, duration: 0.5 })
    .to("#ai-icon", { opacity: 1, duration: 0.5 }, "<")
    .to("#ai-icon .gear1", { rotation: 360, duration: 1.5, ease: "none", repeat: 2 }, "<")
    .to("#ai-icon .gear2", { rotation: -360, duration: 1.5, ease: "none", repeat: 2 }, "<")
    .to("#ai-icon", { scale: 1.05, repeat: 3, yoyo: true, duration: 0.5, ease: "power1.inOut" }, "<")
    .to(["#ai-icon", "#scene3-text"], { opacity: 0, duration: 0.5, delay: 2 });
    
    // --- SCENE 4: RESULTS (8.5s - 11.5s) ---
    tl.to("#scene4-text", { opacity: 1, duration: 0.5 })
    .to("#results-card", { opacity: 1, duration: 0.5 }, "<");
    
    // Score counter animation
    const score = { value: 0 };
    tl.to(score, {
        value: 92,
        duration: 1,
        ease: "power2.out",
        onUpdate: () => {
            const scoreText = document.getElementById('score-text');
            if (scoreText) {
                scoreText.textContent = `${Math.round(score.value)}%`;
            }
        }
    }, "<");
    
    // Bar chart animation
    tl.to("#bar1", { scaleX: 1, duration: 0.7, ease: "power2.out" }, "<+0.2")
    .to("#bar2", { scaleX: 0.7, duration: 0.7, ease: "power2.out" }, "<")
    .to("#bar3", { scaleX: 0.9, duration: 0.7, ease: "power2.out" }, "<");
    
    tl.to(["#results-card", "#scene4-text"], { opacity: 0, duration: 0.5, delay: 1.5 });
    
    // --- OUTRO (11.5s - 13s) ---
    tl.to("#logo", { opacity: 1, duration: 0.7 })
    .to("#logo", { opacity: 0, duration: 0.5, delay: 1 });
    
    // Store timeline in a global variable to manage it
    window.uploadPageTimeline = tl;
}


function navigateTo(pageId) {
    if (window.uploadPageTimeline && window.uploadPageTimeline.isActive()) {
        window.uploadPageTimeline.kill();
    }
    window.location.hash = pageId;
    renderPage(pageId);
}

function renderPage(pageId) {
    app.innerHTML = '';
    let content;
    switch (pageId) {
        case 'landing':
        content = renderLandingPage();
        if (document.getElementById('chat-widget')) document.getElementById('chat-widget').style.display = 'block';
        break;
        case 'upload':
        content = renderUploadPage();
        if (document.getElementById('chat-widget')) document.getElementById('chat-widget').style.display = 'none';
        break;
        case 'gmail':
        content = renderGmailPage();
        if (document.getElementById('chat-widget')) document.getElementById('chat-widget').style.display = 'none';
        break;
        case 'loading':
        content = renderLoadingPage();
        if (document.getElementById('chat-widget')) document.getElementById('chat-widget').style.display = 'none';
        break;
        case 'new_project':
        content = renderNewProjectPage();
        if (document.getElementById('chat-widget')) document.getElementById('chat-widget').style.display = 'none';
        break;
        case 'open_project':
        content = renderOpenProjectPage();
        if (document.getElementById('chat-widget')) document.getElementById('chat-widget').style.display = 'none';
        break;
        case 'project_view':
        content = renderProjectViewPage();
        if (document.getElementById('chat-widget')) document.getElementById('chat-widget').style.display = 'none';
        break;
        case 'results':
        content = renderResultsPage();
        if (document.getElementById('chat-widget')) document.getElementById('chat-widget').style.display = 'none';
        break;
        default:
        navigateTo('landing');
        return;
    }
    app.appendChild(content);
    
    // Start animation AFTER the page content is added to the DOM
    if (pageId === 'upload') {
        startUploadPageAnimation();
    }
}

function renderNewProjectPage() {
    const page = document.createElement('div');
    page.className = 'container mx-auto fade-in-up';
    page.appendChild(renderHeader(true));
    page.innerHTML += `
    <main class="py-16">
    <div class="flex items-center mb-6">
    <button class="text-muted hover:text-primary-orange transition-colors" onclick="navigateTo('landing')">
    <i class="fas fa-arrow-left mr-2"></i> Back
    </button>
    </div>
    <div class="bg-card p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
    <h2 class="text-2xl font-bold mb-4">Create New Recruitment Project</h2>
    <input id="newProjectTitle" class="input-field w-full p-3 rounded mb-4" placeholder="Project title">
    <textarea id="newProjectDesc" class="input-field w-full p-3 rounded mb-4" rows="4" placeholder="Project description / Job description (optional)"></textarea>
    <div class="flex justify-end space-x-4">
    <button id="cancelNewProject" class="btn-secondary">Cancel</button>
    <button id="createProjectBtn" class="btn-primary">Create Project</button>
    </div>
    </div>
    </main>
    `;
    page.appendChild(renderFooter());
    
    page.querySelector('#cancelNewProject').addEventListener('click', () => navigateTo('landing'));
    page.querySelector('#createProjectBtn').addEventListener('click', async () => {
        const title = page.querySelector('#newProjectTitle').value.trim() || 'New Recruitment';
        const desc = page.querySelector('#newProjectDesc').value.trim();
        try {
            const res = await fetch('/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description: desc })
            });
            const data = await res.json();
            if (res.ok) {
                showModal('Project Created', `Project "${data.project.title}" created.`, 'success');
                navigateTo('open_project');
            } else {
                showModal('Error', data.error || 'Could not create project', 'error');
            }
        } catch (e) {
            showModal('Network Error', 'Failed to create project: ' + e.message, 'error');
        }
    });
    
    return page;
}

function renderOpenProjectPage() {
    const page = document.createElement('div');
    page.className = 'container mx-auto fade-in-up';
    page.appendChild(renderHeader(true));
    page.innerHTML += `
    <main class="py-16">
    <div class="flex items-center mb-6">
    <button class="text-muted hover:text-primary-orange transition-colors" onclick="navigateTo('landing')">
    <i class="fas fa-arrow-left mr-2"></i> Back
    </button>
    </div>
    <div class="bg-card p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-4">Open Recruitment Projects</h2>
    <div id="projectsList" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    </div>
    </main>
    `;
    page.appendChild(renderFooter());
    
    async function loadProjects() {
        const list = page.querySelector('#projectsList');
        list.innerHTML = '<div class="text-muted p-4">Loading...</div>';
        try {
            const res = await fetch('/projects');
            const data = await res.json();
            const projects = data.projects || [];
            if (projects.length === 0) {
                list.innerHTML = '<div class="text-center p-8 text-muted">No projects found. Create one from the landing page.</div>';
                return;
            }
            list.innerHTML = '';
            projects.forEach(p => {
                const card = document.createElement('div');
                card.className = 'recruitment-project-card p-4 rounded-lg border';
                card.innerHTML = `
                <h3 class="font-bold">${p.title}</h3>
                <p class="text-sm text-muted">${p.description || ''}</p>
                <p class="text-sm mt-2">Resumes: ${p.resumes ? p.resumes.length : 0} | Top kept: ${p.top_resumes ? p.top_resumes.length : 0}</p>
                <div class="mt-4 flex justify-end space-x-2">
                <button class="btn-secondary openProjectBtn" data-id="${p.id}">Open</button>
                <button class="btn-primary viewProjectBtn" data-id="${p.id}">View</button>
                </div>
                `;
                list.appendChild(card);
            });
            page.querySelectorAll('.openProjectBtn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.dataset.id;
                    try {
                        const r = await fetch(`/projects/${id}`);
                        const d = await r.json();
                        if (r.ok) {
                            localStorage.setItem('currentProject', JSON.stringify(d.project));
                            localStorage.setItem('candidates', JSON.stringify(d.project.resumes || d.project.top_resumes || []));
                            showModal('Project Opened', `Project "${d.project.title}" is now active.`, 'success');
                            navigateTo('upload');
                        } else {
                            showModal('Error', d.error || 'Could not open project', 'error');
                        }
                    } catch (err) {
                        showModal('Network Error', 'Failed to open project: ' + err.message, 'error');
                    }
                });
            });
            page.querySelectorAll('.viewProjectBtn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.dataset.id;
                    try {
                        const r = await fetch(`/projects/${id}`);
                        const d = await r.json();
                        if (r.ok) {
                            localStorage.setItem('currentProject', JSON.stringify(d.project));
                            localStorage.setItem('candidates', JSON.stringify(d.project.resumes || d.project.top_resumes || []));
                            navigateTo('project_view');
                        } else {
                            showModal('Error', d.error || 'Could not open project', 'error');
                        }
                    } catch (err) {
                        showModal('Network Error', 'Failed to open project: ' + err.message, 'error');
                    }
                });
            });
        } catch (e) {
            list.innerHTML = '<div class="text-center p-8 text-muted">Failed to load projects.</div>';
        }
    }
    
    loadProjects();
    return page;
}

function showModal(title, message, type = 'info') {
    const iconClass = {
        info: 'fas fa-info-circle text-blue-500 dark:text-blue-400',
        success: 'fas fa-check-circle text-green-500 dark:text-green-400',
        error: 'fas fa-exclamation-circle text-red-500 dark:text-red-400',
        warning: 'fas fa-exclamation-triangle text-yellow-500 dark:text-yellow-400'
    };
    modalContainer.innerHTML = `
    <div class="modal-overlay modal-overlay-animated">
    <div class="modal-content modal-content-animated">
    <div class="w-full p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
    <div class="flex flex-col items-center text-center space-y-2">
    <i class="${iconClass[type]} text-4xl"></i>
    <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">${title}</h3>
    <p class="text-base text-gray-700 dark:text-gray-300">${message}</p>
    </div>
    </div>
    <button class="btn-primary mt-4" onclick="closeModal()">OK</button>
    </div>
    </div>
    `;
    const modal = modalContainer.querySelector('.modal-content');
    modal.style.backgroundColor = getComputedStyle(document.body).getPropertyValue('--lt-card-bg');
}

function showConfirmModal(title, message, onConfirm) {
    modalContainer.innerHTML = `
    <div class="modal-overlay modal-overlay-animated">
    <div class="modal-content modal-content-animated">
    <div class="w-full p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
    <div class="flex flex-col items-center text-center space-y-2">
    <i class="fas fa-question-circle text-blue-500 dark:text-blue-400 text-4xl"></i>
    <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">${title}</h3>
    <p class="text-base text-gray-700 dark:text-gray-300">${message}</p>
    </div>
    </div>
    <div class="mt-6 flex justify-center space-x-4">
    <button id="confirmBtn" class="btn-primary">${getConfirmMessage()}</button>
    <button id="cancelBtn" class="btn-secondary">Cancel</button>
    </div>
    </div>
    </div>
    `;
    const modal = modalContainer.querySelector('.modal-content');
    modal.style.backgroundColor = getComputedStyle(document.body).getPropertyValue('--lt-card-bg');
    
    document.getElementById('confirmBtn').onclick = () => {
        closeModal();
        onConfirm(true);
    };
    document.getElementById('cancelBtn').onclick = () => {
        closeModal();
        onConfirm(false);
    };
}


function getConfirmMessage() {
    return 'Confirm';
}

function closeModal() {
    modalContainer.innerHTML = '';
}

function toggleTheme() {
    const body = document.body;
    const chatPopup = document.getElementById('chat-popup');
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        chatPopup.classList.add('dark-theme');
        currentTheme = 'dark-theme';
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        chatPopup.classList.remove('dark-theme');
        currentTheme = 'light-theme';
    }
    localStorage.setItem('theme', currentTheme);
}

function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light-theme';
    document.body.classList.add(savedTheme);
    currentTheme = savedTheme;
    const toggle = document.querySelector('.theme-toggle input');
    if (toggle) {
        toggle.checked = savedTheme === 'dark-theme';
    }
    const chatPopup = document.getElementById('chat-popup');
    if (savedTheme === 'dark-theme') {
        chatPopup.classList.add('dark-theme');
    }
}

// --- Page Rendering Functions ---

function renderHeader(showBack = false) {
    const header = document.createElement('header');
    header.className = `flex justify-between items-center py-4 md:py-8 px-4`;
    header.innerHTML = `
    <a href="#" onclick="navigateTo('landing')"
    class="flex items-center space-x-2 text-xl font-bold text-white bg-black p-3 rounded-lg hover:opacity-90 transition">
    <img src="https://i.postimg.cc/Dwrs20rL/introlligent-logo.png" alt="Introlligent Logo" class="h-12">
    </a>
    
    <div class="flex items-center space-x-4">
    <div class="theme-toggle flex items-center">
    <label class="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" value="" class="sr-only peer" onchange="toggleTheme()">
    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
    <span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
    <i class="fas fa-moon"></i>
    </span>
    </label>
    </div>
    </div>
    `;
    return header;
}

function renderFooter() {
    const footer = document.createElement('footer');
    footer.className = 'py-8 border-t border-gray-200 dark:border-gray-700 mt-16';
    footer.innerHTML = `
    <div class="container mx-auto px-4">
    <div class="flex flex-col md:flex-row justify-between items-center">
    <div class="text-center md:text-left mb-4 md:mb-0">
    <a href="https://www.introlligent.com" target="_blank" class="text-lg font-bold text-heading hover:text-primary-orange transition-colors">
    Introlligent
    </a>
    <p class="text-sm text-muted">AI-powered resume analysis for smarter hiring.</p>
    </div>
    <div class="flex space-x-4 text-muted">
    <a href="https://www.linkedin.com/company/introlligent-inc/" target="_blank" class="hover:text-primary-orange transition-colors"><i class="fab fa-linkedin"></i></a>
    <a href="https://www.facebook.com/IntrolligentInc/" target="_blank" class="hover:text-primary-orange transition-colors"><i class="fab fa-facebook"></i></a>
    <a href="https://www.instagram.com/introlligentinc/" target="_blank" class="hover:text-primary-orange transition-colors"><i class="fab fa-instagram"></i></a>
    </div>
    </div>
    <div class="text-center text-sm text-muted mt-4">
    &copy; 2025 Introlligent. All rights reserved.
    </div>
    </div>
    `;
    return footer;
}

function renderLandingPage() {
    const page = document.createElement('div');
    page.className = 'container mx-auto fade-in-up';
    page.appendChild(renderHeader());
    page.innerHTML += `
    <main class="text-center py-16">
    <div class="hero-section">
    <div class="hero-content">
    <h1 class="hero-title text-gray-800 dark:text-gray-100">
    AI-Powered Resume Evaluation for <span class="text-primary-orange">Smarter Hiring</span>
    </h1>
    <p class="hero-subtitle text-gray-600 dark:text-gray-300">
    Upload a resume or connect your Gmail to get an instant AI-powered analysis of your qualifications, skills, and job fit.
    </p>
    <div class="hero-buttons">
    <button class="btn-primary" onclick="navigateTo('upload')">
    <i class="fas fa-cloud-upload-alt mr-2"></i> Upload Resume
    </button>
    <button class="btn-secondary" onclick="navigateTo('gmail')">
    <i class="fas fa-envelope-open-text mr-2"></i> Fetch from Gmail
    </button>
    </div>
    <div class="mt-6 flex justify-center space-x-4">
    <button class="btn-primary" onclick="navigateTo('new_project')"><i class="fas fa-plus mr-2"></i> New Recruitment</button>
    <button class="btn-secondary" onclick="navigateTo('open_project')"><i class="fas fa-folder-open mr-2"></i> Open Recruitment</button>
    </div>
    </div>
    <div class="hero-image-container">
    <img src="https://i.postimg.cc/jq349Dcj/feature.png" alt="Recruiter and candidate" class="recruiter-image">
    </div>
    </div>
    </main>
    `;
    page.appendChild(renderFooter());
    return page;
}

function renderUploadPage() {
    const page = document.createElement('div');
    page.className = 'container mx-auto fade-in-up';
    page.appendChild(renderHeader(true));
    page.innerHTML += `
    <main class="py-16">
    <div class="flex items-center mb-6">
    <button class="text-muted hover:text-primary-orange transition-colors" onclick="navigateTo('landing')">
    <i class="fas fa-arrow-left mr-2"></i> Back
    </button>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
    <div class="bg-card p-8 rounded-xl shadow-lg">
    <h2 class="text-3xl font-bold text-heading mb-6">Upload Your Resume</h2>
    <textarea id="jobDescription" rows="5" class="w-full p-4 rounded-lg input-field focus:outline-none focus:ring-2 focus:ring-primary-orange transition-all duration-200 resize-none mb-6" placeholder="Paste the job description here..."></textarea>
    <div id="drop-area" class="border-4 border-dashed border-primary-orange rounded-xl p-8 text-center flex flex-col items-center">
    <i class="fas fa-file-upload text-5xl icon-color mb-4"></i>
    <p class="text-lg text-muted">Drag & Drop your file here</p>
    <p class="text-sm text-muted mt-2">Supported formats: PDF (Max 5MB)</p>
    <input type="file" id="fileInput" class="hidden" accept=".pdf">
    <button id="browseBtn" class="btn-primary mt-6">
    <i class="fas fa-folder-open mr-2"></i> Browse Files
    </button>
    </div>
    <div id="uploadStatus" class="mt-4 text-center text-body"></div>
    </div>
    <div class="bg-card rounded-xl shadow-lg flex items-center justify-center p-0"> <div id="animation-container">
    <div class="text-container">
    <div id="scene1-text" class="scene-text">
    <div class="text-header">1. Upload</div>
    <div class="text-subheader">Select and upload your resume file.</div>
    </div>
    <div id="scene2-text" class="scene-text">
    <div class="text-header">2. Database</div>
    <div class="text-subheader">The resume is securely stored for analysis.</div>
    </div>
    <div id="scene3-text" class="scene-text">
    <div class="text-header">3. AI Analysis</div>
    <div class="text-subheader">Our AI evaluates skills and experience.</div>
    </div>
    <div id="scene4-text" class="scene-text">
    <div class="text-header">4. Results</div>
    <div class="text-subheader">View detailed scores and recommendations.</div>
    </div>
    </div>
    <div class="icon-container">
    <div id="browser" class="anim-element">
    <div class="computer-screen">
    <div class="computer-header">AI Based Recruiter</div>
    <div id="upload-box">
    <div class="upload-icon-wrapper">
    <span class="fa-stack fa-2x">
    <i class="fa-solid fa-cloud fa-stack-2x"></i>
    <i class="fa-solid fa-arrow-up fa-stack-1x fa-inverse"></i>
    </span>
    </div>
    <i class="fa-solid fa-check"></i>
    </div>
    </div>
    <div class="computer-stand"></div>
    <div class="computer-base"></div>
    </div>
    <div id="resume-icon" class="anim-element icon">
    <i class="fa-solid fa-file-invoice"></i>
    </div>
    <div id="database-icon" class="anim-element icon">
    <i class="fa-solid fa-database"></i>
    <i class="fa-solid fa-lock"></i>
    </div>
    <div id="ai-icon" class="anim-element icon">
    <i class="fa-solid fa-robot"></i>
    <i class="fa-solid fa-gear gear1"></i>
    <i class="fa-solid fa-gear gear2"></i>
    </div>
    <div id="results-card" class="anim-element">
    <h3>Match Score</h3>
    <div class="score-display">
    <span id="score-text">0%</span>
    <div class="bar-chart">
    <div id="bar1" class="bar"></div>
    <div id="bar2" class="bar short"></div>
    <div id="bar3" class="bar"></div>
    </div>
    </div>
    </div>
    <div id="logo" class="anim-element">Introlligent</div>
    </div>
    </div>
    </div>
    </div>
    <div class="text-center mt-12">
    <button id="analyzeResumeBtn" class="btn-primary hidden">
    <div class="flex items-center space-x-2">
    <span>Analyze My Resume</span>
    <i class="fas fa-arrow-right"></i>
    </div>
    </button>
    </div>
    </main>
    `;
    // ... rest of the function remains the same
    // Project selection area
    const projectSelectContainer = document.createElement('div');
    projectSelectContainer.className = 'w-full mt-6';
    projectSelectContainer.innerHTML = `
    <label class="block text-sm font-medium text-body mb-2">Select Recruitment Project (optional)</label>
    <div class="flex items-center space-x-4">
    <select id="projectSelect" class="input-field p-3 rounded w-full"></select>
    <button id="refreshProjectsBtn" class="btn-secondary">Refresh</button>
    </div>
    `;
    page.querySelector('.bg-card.p-8.rounded-xl.shadow-lg').appendChild(projectSelectContainer);
    
    page.appendChild(renderFooter());
    
    const jobDescription = page.querySelector('#jobDescription');
    const browseBtn = page.querySelector('#browseBtn');
    const fileInput = page.querySelector('#fileInput');
    const analyzeBtn = page.querySelector('#analyzeResumeBtn');
    const uploadStatus = page.querySelector('#uploadStatus');
    let uploadedFile = null;
    let selectedProjectId = null;
    
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (event) => {
        uploadedFile = event.target.files[0];
        if (uploadedFile) {
            uploadStatus.innerHTML = `File selected: <strong>${uploadedFile.name}</strong>`;
            analyzeBtn.classList.remove('hidden');
        } else {
            uploadStatus.innerHTML = '';
            analyzeBtn.classList.add('hidden');
        }
    });
    
    analyzeBtn.addEventListener('click', () => {
        const jdValue = jobDescription.value.trim();
        if (!jdValue) {
            showModal('Validation Error', 'Please enter a job description to continue.', 'error');
            return;
        }
        if (uploadedFile) {
            localStorage.setItem('jobDescription', jdValue);
            const projectSelect = page.querySelector('#projectSelect');
            selectedProjectId = projectSelect ? projectSelect.value : null;
            if (selectedProjectId) {
                // Upload to project-specific endpoint
                const formData = new FormData();
                formData.append('resume', uploadedFile);
                formData.append('job_description', jdValue);
                startLoading('upload', { file: uploadedFile, projectId: selectedProjectId, formData });
            } else {
                startLoading('upload', { file: uploadedFile });
            }
        }
    });
    
    // Fetch projects into select
    const projectSelect = page.querySelector('#projectSelect');
    const refreshBtn = page.querySelector('#refreshProjectsBtn');
    async function loadProjectsIntoSelect() {
        projectSelect.innerHTML = '<option value="">(None) - upload without project</option>';
        try {
            const res = await fetch('/projects');
            const data = await res.json();
            (data.projects || []).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.text = `${p.title} (${p.resumes ? p.resumes.length : 0} resumes)`;
                projectSelect.appendChild(opt);
            });
            // preselect currentProject if set
            const currentProject = localStorage.getItem('currentProject');
            if (currentProject) {
                try {
                    const cp = JSON.parse(currentProject);
                    if (cp && cp.id) {
                        projectSelect.value = cp.id;
                    }
                } catch (e) {
                    console.warn('Invalid currentProject in localStorage', e);
                }
            }
        } catch (e) {
            console.warn('Could not load projects', e);
        }
    }
    loadProjectsIntoSelect();
    refreshBtn.addEventListener('click', loadProjectsIntoSelect);
    
    return page;
}

function renderGmailPage() {
    const page = document.createElement('div');
    page.className = 'container mx-auto fade-in-up';
    page.appendChild(renderHeader(true));
    page.innerHTML += `
    <main class="py-16">
    <div class="flex items-center mb-6">
    <button class="text-muted hover:text-primary-orange transition-colors" onclick="navigateTo('landing')">
    <i class="fas fa-arrow-left mr-2"></i> Back
    </button>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
    <div class="bg-card p-8 rounded-xl shadow-lg">
    <h2 class="text-3xl font-bold text-heading mb-6">Fetch Resumes from Gmail</h2>
    <input type="text" id="jobRole" class="w-full p-4 rounded-lg input-field focus:outline-none focus:ring-2 focus:ring-primary-orange transition-all duration-200 mb-6" placeholder="Enter Job Role (e.g., 'Data Engineer')">
    <textarea id="jobDescription" rows="5" class="w-full p-4 rounded-lg input-field focus:outline-none focus:ring-2 focus:ring-primary-orange transition-all duration-200 resize-none" placeholder="Paste the job description here..."></textarea>
    <div class="mt-6 flex flex-col space-y-4">
    <button id="fetchGmailBtn" class="btn-primary">
    <div class="flex items-center justify-center space-x-2">
    <i class="fab fa-google mr-2"></i> Fetch from Gmail
    </div>
    </button>
    <a href="/authenticate" target="_blank" id="authButton" class="btn-secondary text-center">
    <i class="fas fa-lock mr-2"></i> Re-authenticate
    </a>
    </div>
    </div>
    <div class="bg-card p-8 rounded-xl shadow-lg">
    <h3 class="text-xl font-bold text-heading mb-4">How it works</h3>
    <div class="flex flex-col space-y-4">
    <div class="flex items-center space-x-4">
    <div class="icon-bg w-12 h-12 flex items-center justify-center rounded-full">
    <i class="fab fa-google text-xl icon-color"></i>
    </div>
    <div>
    <h4 class="font-semibold text-heading">Connect</h4>
    <p class="text-sm text-muted">Securely connect your Gmail account.</p>
    </div>
    </div>
    <div class="flex items-center space-x-4">
    <div class="icon-bg w-12 h-12 flex items-center justify-center rounded-full">
    <i class="fas fa-file-alt text-xl icon-color"></i>
    </div>
    <div>
    <h4 class="font-semibold text-heading">Extract</h4>
    <p class="text-sm text-muted">We find resumes in your email attachments.</p>
    </div>
    </div>
    <div class="flex items-center space-x-4">
    <div class="icon-bg w-12 h-12 flex items-center justify-center rounded-full">
    <i class="fas fa-robot text-xl icon-color"></i>
    </div>
    <div>
    <h4 class="font-semibold text-heading">AI Analysis</h4>
    <p class="text-sm text-muted">AI analyzes each resume against the job description.</p>
    </div>
    </div>
    <div class="flex items-center space-x-4">
    <div class="icon-bg w-12 h-12 flex items-center justify-center rounded-full">
    <i class="fas fa-chart-line text-xl icon-color"></i>
    </div>
    <div>
    <h4 class="font-semibold text-heading">Results</h4>
    <p class="text-sm text-muted">Get a list of evaluated candidates with scores.</p>
    </div>
    </div>
    </div>
    </div>
    </div>
    </main>
    `;
    page.appendChild(renderFooter());
    
    const fetchBtn = page.querySelector('#fetchGmailBtn');
    const jobRoleInput = page.querySelector('#jobRole');
    const jobDescription = page.querySelector('#jobDescription');
    const projectSelectorWrapper = document.createElement('div');
    projectSelectorWrapper.className = 'w-full mt-6';
    projectSelectorWrapper.innerHTML = `
    <label class="block text-sm font-medium text-body mb-2">Select Recruitment Project (optional)</label>
    <div class="flex items-center space-x-4">
    <select id="gmailProjectSelect" class="input-field p-3 rounded w-full"></select>
    <button id="refreshGmailProjectsBtn" class="btn-secondary">Refresh</button>
    </div>
    `;
    page.querySelector('.bg-card.p-8.rounded-xl.shadow-lg').appendChild(projectSelectorWrapper);
    
    const gmailProjectSelect = page.querySelector('#gmailProjectSelect');
    const refreshGmailBtn = page.querySelector('#refreshGmailProjectsBtn');
    async function loadGmailProjects() {
        gmailProjectSelect.innerHTML = '<option value="">(None) - do not save to project</option>';
        try {
            const res = await fetch('/projects');
            const data = await res.json();
            (data.projects || []).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.text = `${p.title} (${p.resumes ? p.resumes.length : 0} resumes)`;
                gmailProjectSelect.appendChild(opt);
            });
        } catch (e) {
            console.warn('Could not load projects for Gmail', e);
        }
    }
    loadGmailProjects();
    refreshGmailBtn.addEventListener('click', loadGmailProjects);
    
    fetchBtn.onclick = () => {
        const jobRole = jobRoleInput.value.trim();
        if (!jobRole) {
            showModal('Validation Error', 'Please enter a Job Role to continue.', 'error');
            return;
        }
        if (jobDescription.value.trim() === '') {
            showModal('Validation Error', 'Please enter a job description to continue.', 'error');
            return;
        }
        localStorage.setItem('jobDescription', jobDescription.value);
        const selectedProjectId = gmailProjectSelect ? gmailProjectSelect.value : null;
        startLoading('gmail', { projectId: selectedProjectId, jobRole: jobRole });
    };
    
    const cachedJobDesc = localStorage.getItem('jobDescription');
    if (cachedJobDesc) {
        jobDescription.value = cachedJobDesc;
    }
    
    return page;
}

function renderLoadingPage() {
    const page = document.createElement('div');
    page.className = 'loading-animation fade-in-up';
    page.innerHTML = `
    <div class="space-y-8 text-center relative w-full max-w-lg mx-auto p-4">
    <h1 class="loading-title text-heading">Analyzing Resumes...</h1>
    <div class="relative h-20 w-full flex justify-center items-center">
    <div class="icon-path absolute top-0 left-0 w-full h-full flex justify-between items-center px-4 z-10">
    <i id="icon-1" class="fas fa-file-alt text-4xl text-primary-orange"></i>
    <i id="icon-2" class="fas fa-database text-4xl text-primary-orange opacity-50"></i>
    <i id="icon-3" class="fas fa-robot text-4xl text-primary-orange opacity-50"></i>
    <i id="icon-4" class="fas fa-check-circle text-4xl text-primary-orange opacity-50"></i>
    </div>
    <div id="animated-path" class="absolute top-0 left-0 w-full h-full"></div>
    </div>
    <p class="text-lg text-muted">This may take a moment. Please do not close this page.</p>
    </div>
    `;
    return page;
}

async function startLoading(flowType, data = {}) {
    navigateTo('loading');
    
    let fetchUrl;
    let payload;
    let animationIcons = loadingIcons[flowType];
    
    const animatedIconContainer = document.querySelector('#animated-path');
    if (animatedIconContainer) {
        animatedIconContainer.innerHTML = '';
        const animatedIcon = document.createElement('i');
        animatedIcon.className = `fas ${animationIcons[0]} text-4xl text-primary-orange animate-pulse`;
        animatedIconContainer.appendChild(animatedIcon);
        document.getElementById('icon-1').classList.remove('opacity-50');
        
        let currentStep = 0;
        const updateAnimation = () => {
            if (currentStep < animationIcons.length - 1) {
                currentStep++;
                const nextIcon = document.getElementById(`icon-${currentStep + 1}`);
                if (nextIcon) {
                    nextIcon.classList.remove('opacity-50');
                    nextIcon.classList.add('opacity-100');
                }
                setTimeout(updateAnimation, 3000);
            }
        };
        setTimeout(updateAnimation, 3000);
    }
    
    if (flowType === 'gmail') {
        fetchUrl = '/fetch_resumes';
        const jobDescription = localStorage.getItem('jobDescription');
        payload = {
            job_description: jobDescription,
            job_role: data.jobRole,
            days_filter: 30
        };
        if (data && data.projectId) {
            payload.project_id = data.projectId;
        }
        try {
            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (response.ok) {
                if (result.candidates && result.candidates.length > 0) {
                    localStorage.setItem('candidates', JSON.stringify(result.candidates));
                    navigateTo('results');
                } else {
                    showModal('No Resumes Found', result.message || 'No suitable resumes were found in your Gmail account.', 'info');
                    navigateTo('gmail');
                }
            } else {
                showModal('API Error', result.error || 'A server error occurred while fetching resumes.', 'error');
                navigateTo('gmail');
            }
        } catch (error) {
            showModal('Network Error', 'Error fetching resumes: ' + error.message, 'error');
            navigateTo('gmail');
        }
    } else if (flowType === 'upload') {
        const jobDescription = localStorage.getItem('jobDescription');
        if (data.formData && data.projectId) {
            fetchUrl = `/projects/${data.projectId}/upload_resume`;
            try {
                const response = await fetch(fetchUrl, {
                    method: 'POST',
                    body: data.formData
                });
                const result = await response.json();
                if (response.ok) {
                    const candidate = result.candidate ? [result.candidate] : [];
                    localStorage.setItem('candidates', JSON.stringify(candidate));
                    navigateTo('results');
                } else {
                    showModal('API Error', result.error || 'A server error occurred while uploading the resume to project.', 'error');
                    navigateTo('upload');
                }
            } catch (error) {
                showModal('Network Error', 'Error uploading resume: ' + error.message, 'error');
            }
        } else {
            // Updated logic for standalone upload (no project selected)
            // FIX: Corrected API endpoint from '/api/upload_resume' to '/upload_resume'
            fetchUrl = '/upload_resume'; 
            const formData = new FormData();
            formData.append('resume', data.file);
            formData.append('job_description', jobDescription);
            try {
                const response = await fetch(fetchUrl, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (response.ok) {
                    if (result.candidates && result.candidates.length > 0) {
                        localStorage.setItem('candidates', JSON.stringify(result.candidates));
                        navigateTo('results');
                    } else {
                        showModal('No Candidates Found', result.message || 'The uploaded resume could not be analyzed.', 'info');
                        navigateTo('upload');
                    }
                } else {
                    // Handles JSON errors returned by the server
                    showModal('API Error', result.error || 'A server error occurred while analyzing the resume.', 'error');
                    navigateTo('upload');
                }
            } catch (error) {
                // Catches network connection failures
                showModal('Network Error', 'Error uploading resume: ' + error.message, 'error');
                navigateTo('upload');
            }
        }
    }
}

async function sendEmail(emailType, candidate, event) {
    const jobDescription = localStorage.getItem('jobDescription');
    if (!jobDescription || !candidate.email || !candidate.name) {
        showModal('Error', 'Missing required data for sending email.', 'error');
        return;
    }
    
    const button = event.target.closest('button');
    const originalButtonContent = button.innerHTML;
    
    showConfirmModal(`Confirm Action`, `Are you sure you want to send a ${emailType} email to ${candidate.name}?`, async (confirmed) => {
        if (confirmed) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Sending...';
            
            const fetchUrl = '/send_email';
            const payload = {
                email: candidate.email,
                name: candidate.name,
                job_description: jobDescription,
                type: emailType
            };
            
            try {
                const response = await fetch(fetchUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.success) {
                    showModal('Success', data.message, 'success');
                } else {
                    showModal('Failed', data.message, 'error');
                }
            } catch (error) {
                console.error('Error sending email:', error);
                showModal('Error', 'Failed to send email. Please check your network connection and try again.', 'error');
            } finally {
                button.disabled = false;
                button.innerHTML = originalButtonContent;
            }
        }
    });
}

function renderResultsPage() {
    const page = document.createElement('div');
    page.className = 'container mx-auto fade-in-up';
    page.appendChild(renderHeader(true));
    
    page.innerHTML += `
    <main class="py-8">
    <h2 class="text-3xl font-bold text-heading mb-8">Candidate Evaluations</h2>
    <div id="resultsContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"></div>
    </main>
    `;
    
    const resultsContainer = page.querySelector('#resultsContainer');
    let candidates = JSON.parse(localStorage.getItem('candidates'));
    
    if (resultsContainer && candidates && candidates.length > 0) {
        candidates.sort((a, b) => {
            const scoreA = parseInt((a.sections && a.sections.ats_score) || 0, 10) || 0;
            const scoreB = parseInt((b.sections && b.sections.ats_score) || 0, 10) || 0;
            return scoreB - scoreA;
        });
        
        candidates.forEach((candidate, index) => {
            const getScoreColorClass = (score) => {
                const numericScore = parseInt(score, 10);
                if (isNaN(numericScore)) return 'match-low';
                if (numericScore >= 80) return 'match-high';
                if (numericScore >= 50) return 'match-medium';
                return 'match-low';
            };
            const scoreColorClass = getScoreColorClass(candidate.sections.ats_score);
            
            const createSkillTags = (keywords) => {
                let tags = '';
                if (!candidate.sections.hr_summary) return '';
                const potentialSkills = candidate.sections.hr_summary.match(/([A-Z][a-z]+(\s[A-Z][a-z]+)*)/g) || [];
                const uniqueKeywords = [...new Set(potentialSkills)];
                uniqueKeywords.slice(0, 7).forEach(keyword => {
                    tags += `<span class="skill-tag">${keyword}</span>`;
                });
                return tags;
            };
            
            const cardWrapper = document.createElement('div');
            cardWrapper.className = `card-wrapper ${scoreColorClass}`;
            cardWrapper.dataset.candidateIndex = index;
            
            const card = document.createElement('div');
            card.className = "card bg-card card-hover p-6 md:p-8 animate-on-load";
            card.style.animation = `fadeInUp 0.5s ease-out forwards`;
            card.style.animationDelay = `${index * 100}ms`;
            
            card.innerHTML = `
            <div class="candidate-card-header">
            <div class="profile-picture">
            <i class="fas fa-user text-3xl text-gray-400"></i>
            </div>
            <div class="match-score">
            <div class="score-value">${candidate.sections.ats_score || 'N/A'}%</div>
            <div class="score-label">MATCH</div>
            </div>
            </div>
            <div class="text-center mt-4">
            <h3 class="text-2xl font-bold text-heading">${candidate.name || 'Unknown Candidate'}</h3>
            <p class="text-sm text-muted">${candidate.filename}</p>
            </div>
            <div class="candidate-details-list mt-6 space-y-3">
            <div class="detail-item">
            <i class="fas fa-envelope fa-fw icon-color"></i>
            <span>${candidate.email || 'No email provided'}</span>
            </div>
            <div class="detail-item">
            <i class="fas fa-phone fa-fw icon-color"></i>
            <span>${candidate.phone || 'No phone provided'}</span>
            </div>
            </div>
            <div class="skill-tags-container mt-6">
        ${createSkillTags(candidate.sections.matched_keywords)}
        </div>
        `;
        
        cardWrapper.appendChild(card);
        resultsContainer.appendChild(cardWrapper);
        
        const currentProject = JSON.parse(localStorage.getItem('currentProject') || 'null');
        if (currentProject && currentProject.id) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-resume-btn btn-secondary';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '8px';
            deleteBtn.style.right = '8px';
            deleteBtn.style.padding = '6px 10px';
            deleteBtn.style.borderRadius = '8px';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                const confirmDelete = confirm('Delete this resume from the project? This action cannot be undone.');
                if (!confirmDelete) return;
                try {
                    const resp = await fetch(`/projects/${currentProject.id}/resumes/${candidate.id}`, { method: 'DELETE' });
                    const result = await resp.json();
                    if (resp.ok && result.success) {
                        const r = await fetch(`/projects/${currentProject.id}`);
                        const d = await r.json();
                        if (r.ok) {
                            localStorage.setItem('currentProject', JSON.stringify(d.project));
                            localStorage.setItem('candidates', JSON.stringify(d.project.resumes || d.project.top_resumes || []));
                            navigateTo('results');
                        } else {
                            showModal('Error', d.error || 'Failed to refresh project', 'error');
                        }
                    } else {
                        showModal('Delete Failed', result.error || 'Could not delete resume', 'error');
                    }
                } catch (err) {
                    showModal('Network Error', 'Delete request failed: ' + err.message, 'error');
                }
            });
            const cardEl = card;
            cardEl.style.position = 'relative';
            cardEl.appendChild(deleteBtn);
        }
        
        cardWrapper.addEventListener('click', (e) => {
            if (e.target.closest('.delete-resume-btn')) return;
            showCandidateDetailModal(candidate);
        });
    });
} else {
    resultsContainer.innerHTML = `<div class="text-center text-muted p-16 col-span-full">No candidates to display.</div>`;
}

page.appendChild(renderFooter());
return page;
}

function renderProjectViewPage() {
const page = document.createElement('div');
page.className = 'container mx-auto fade-in-up';
page.appendChild(renderHeader(true));

const currentProject = JSON.parse(localStorage.getItem('currentProject') || 'null');
const title = currentProject ? currentProject.title : 'Project';

page.innerHTML += `
<main class="py-8">
<h2 class="text-3xl font-bold text-heading mb-4">Project: ${title}</h2>
<div class="mb-4 text-sm text-muted">You are viewing stored evaluations for this project. Use Open Recruitment to add more resumes.</div>
<div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
<div class="flex items-center space-x-3">
<button id="randomCompareBtn" class="btn-secondary">Random Comparison</button>
<button id="topCompareBtn" class="btn-secondary">Top Comparison</button>
</div>
<div class="flex items-center space-x-3">
<label class="text-sm text-muted">Select resumes to compare:</label>
<select id="compareSelectA" class="input-field p-2 rounded"></select>
<select id="compareSelectB" class="input-field p-2 rounded"></select>
<input id="uploadCompareInput" type="file" accept=".pdf" class="hidden">
<button id="uploadCompareBtn" class="btn-primary">Upload & Compare</button>
</div>
</div>

<div id="projectResultsContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"></div>
</main>
`;

const resultsContainer = page.querySelector('#projectResultsContainer');
const candidates = JSON.parse(localStorage.getItem('candidates') || '[]');

if (candidates && candidates.length > 0) {
    localStorage.setItem('candidates', JSON.stringify(candidates));
    const resultsPage = renderResultsPage();
    const generated = resultsPage.querySelector('#resultsContainer');
    if (generated) {
        const cloned = generated.cloneNode(true);
        resultsContainer.replaceWith(cloned);
        const clonedCandidates = candidates;
        cloned.querySelectorAll('.card-wrapper').forEach(el => {
            const idx = el.dataset.candidateIndex;
            if (typeof idx !== 'undefined' && clonedCandidates[idx]) {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-resume-btn')) return;
                    showCandidateDetailModal(clonedCandidates[idx]);
                });
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-resume-btn btn-secondary';
                deleteBtn.style.position = 'absolute';
                deleteBtn.style.top = '8px';
                deleteBtn.style.right = '8px';
                deleteBtn.style.padding = '6px 10px';
                deleteBtn.style.borderRadius = '8px';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', async (ev) => {
                    ev.stopPropagation();
                    const confirmDelete = confirm('Delete this resume from the project? This action cannot be undone.');
                    if (!confirmDelete) return;
                    const project = JSON.parse(localStorage.getItem('currentProject') || '{}');
                if (!project || !project.id) { showModal('Error', 'No active project selected.', 'error'); return; }
                try {
                    const resp = await fetch(`/projects/${project.id}/resumes/${clonedCandidates[idx].id}`, { method: 'DELETE' });
                    const result = await resp.json();
                    if (resp.ok && result.success) {
                        const r = await fetch(`/projects/${project.id}`);
                        const d = await r.json();
                        if (r.ok) {
                            localStorage.setItem('currentProject', JSON.stringify(d.project));
                            localStorage.setItem('candidates', JSON.stringify(d.project.resumes || d.project.top_resumes || []));
                            navigateTo('project_view');
                        } else {
                            showModal('Error', d.error || 'Failed to refresh project', 'error');
                        }
                    } else {
                        showModal('Delete Failed', result.error || 'Could not delete resume', 'error');
                    }
                } catch (err) {
                    showModal('Network Error', 'Delete request failed: ' + err.message, 'error');
                }
            });
            const card = el.querySelector('.card') || el;
            card.style.position = 'relative';
            card.appendChild(deleteBtn);
        }
    });
    // Wire up comparison controls
    const selectA = page.querySelector('#compareSelectA');
    const selectB = page.querySelector('#compareSelectB');
    const uploadInput = page.querySelector('#uploadCompareInput');
    const uploadBtn = page.querySelector('#uploadCompareBtn');
    const randomBtn = page.querySelector('#randomCompareBtn');
    const topBtn = page.querySelector('#topCompareBtn');
    
    function populateSelects(list) {
        [selectA, selectB].forEach(sel => {
            if (!sel) return;
            sel.innerHTML = '<option value="">(Select)</option>';
            list.forEach((c, i) => {
                const opt = document.createElement('option');
                opt.value = i;
                opt.text = `${c.name || c.filename} (${(c.sections && c.sections.ats_score) ? c.sections.ats_score + '%' : 'N/A'})`;
                sel.appendChild(opt);
            });
        });
    }
    
    populateSelects(clonedCandidates);
    
    randomBtn && randomBtn.addEventListener('click', () => {
    if (clonedCandidates.length < 2) { showModal('Not enough resumes', 'Need at least 2 resumes to compare.', 'info'); return; }
    const a = clonedCandidates[Math.floor(Math.random() * clonedCandidates.length)];
    let b = clonedCandidates[Math.floor(Math.random() * clonedCandidates.length)];
    let attempts = 0;
    while (b && a && b.id === a.id && attempts < 10) {
        b = clonedCandidates[Math.floor(Math.random() * clonedCandidates.length)];
        attempts++;
    }
    openComparisonModal(a, b || clonedCandidates[0]);
});

topBtn && topBtn.addEventListener('click', () => {
if (clonedCandidates.length < 2) { showModal('Not enough resumes', 'Need at least 2 resumes to compare.', 'info'); return; }
const sorted = clonedCandidates.slice().sort((x,y)=> (parseInt((y.sections && y.sections.ats_score) || 0,10)||0)-(parseInt((x.sections && x.sections.ats_score) || 0,10)||0));
openComparisonModal(sorted[0], sorted[1] || sorted[0]);
});

[selectA, selectB].forEach(sel => {
sel && sel.addEventListener('change', () => {
    const aIdx = selectA.value;
    const bIdx = selectB.value;
    if (aIdx !== '' && bIdx !== '' && aIdx !== bIdx) {
        openComparisonModal(clonedCandidates[aIdx], clonedCandidates[bIdx]);
    }
});
});

uploadBtn && uploadBtn.addEventListener('click', () => uploadInput && uploadInput.click());
uploadInput && uploadInput.addEventListener('change', async (ev) => {
const file = ev.target.files[0];
if (!file) return;
const jd = localStorage.getItem('jobDescription') || (JSON.parse(localStorage.getItem('currentProject') || '{}')).description || '';
if (!jd) { showModal('Missing JD', 'Please provide a job description in the Upload or Gmail page before comparing with an uploaded resume.', 'error'); return; }
const form = new FormData();
form.append('resume', file);
form.append('job_description', jd);
try {
// NOTE: This comparison logic assumes the standalone upload route is available
const res = await fetch('/upload_resume', { method: 'POST', body: form });
const data = await res.json();
if (res.ok && data.candidates && data.candidates.length > 0) {
    const uploaded = data.candidates[0];
    const selIdx = selectA.value || selectB.value;
    const base = (selIdx !== '' && typeof clonedCandidates[selIdx] !== 'undefined') ? clonedCandidates[selIdx] : clonedCandidates[0];
    openComparisonModal(base, uploaded);
} else {
    showModal('Analysis failed', data.error || 'Could not analyze uploaded file.', 'error');
}
} catch (err) {
showModal('Network Error', 'Failed to upload file: ' + err.message, 'error');
}
});
}
} else {
resultsContainer.innerHTML = `<div class="text-center text-muted p-16 col-span-full">No stored evaluations for this project.</div>`;
}

page.appendChild(renderFooter());
return page;
}

// --- Comparison Modal ---
function openComparisonModal(candidateA, candidateB) {
if (!candidateA || !candidateB) {
showModal('Comparison Error', 'Both candidates must be provided for comparison.', 'error');
return;
}

const htmlA = generateCandidateComparisonHtml(candidateA);
const htmlB = generateCandidateComparisonHtml(candidateB);

modalContainer.innerHTML = `
<div class="modal-overlay-full modal-overlay-animated">
<div class="modal-content-full modal-content-animated">
<button class="modal-close-btn" onclick="closeModal()"><i class="fas fa-times"></i></button>
<div class="comparison-header p-6 border-b">
<h2 class="text-2xl font-bold">Resume Comparison</h2>
<div class="text-sm text-muted">Side-by-side comparison of two candidates</div>
</div>
<div class="comparison-body grid grid-cols-1 md:grid-cols-2 gap-0">
<div class="comparison-panel p-4">${htmlA}</div>
<div class="comparison-panel p-4 border-l">${htmlB}</div>
</div>
<div class="mt-auto p-4 flex justify-end bg-gray-50 dark:bg-gray-800 border-t">
<button class="btn-secondary" onclick="closeModal()">Close</button>
</div>
</div>
</div>
`;
}

function generateCandidateComparisonHtml(candidate) {
const name = candidate.name || candidate.filename || 'Unknown';
const ats = candidate.sections && candidate.sections.ats_score ? candidate.sections.ats_score + '%' : 'N/A';
const hrSummary = candidate.sections && candidate.sections.hr_summary ? formatTextWithMarkdown(candidate.sections.hr_summary) : '';
const strengths = candidate.sections && candidate.sections.strengths_weaknesses ? renderStrengths(candidate.sections.strengths_weaknesses) : '';
const weaknesses = candidate.sections && candidate.sections.strengths_weaknesses ? renderWeaknesses(candidate.sections.strengths_weaknesses) : '';
const interviewQs = candidate.sections && candidate.sections.interview_questions ? parseInterviewQuestions(candidate.sections.interview_questions) : '';

return `
<div>
<div class="flex items-center justify-between mb-4">
<h3 class="text-xl font-bold">${name}</h3>
<div class="text-center">
<div class="text-sm text-muted">ATS Score</div>
<div class="text-2xl font-bold text-primary-orange">${ats}</div>
</div>
</div>
<div class="space-y-4">
<div>
<h4 class="font-semibold text-lg mb-2 border-b pb-1">HR Summary</h4>
<div class="prose prose-sm max-w-none">${hrSummary}</div>
</div>
<div>
<h4 class="font-semibold text-lg mb-2 border-b pb-1">Strengths</h4>
${strengths}
</div>
<div>
<h4 class="font-semibold text-lg mb-2 border-b pb-1">Weaknesses</h4>
${weaknesses}
</div>
<div>
<h4 class="font-semibold text-lg mb-2 border-b pb-1">Interview Questions</h4>
<div class="prose prose-sm max-w-none">${interviewQs}</div>
</div>
</div>
</div>
`;
}

function showCandidateDetailModal(candidate) {
modalContainer.innerHTML = `
<div class="modal-overlay-full modal-overlay-animated">
<div class="modal-content-full modal-content-animated">
<button class="modal-close-btn" onclick="closeModal()"><i class="fas fa-times"></i></button>
<div class="modal-header-full">
<div class="profile-picture-large">
<i class="fas fa-user text-4xl text-gray-500"></i>
</div>
<div class="candidate-info-header">
<h2 class="text-3xl font-bold text-heading">${candidate.name || 'Unknown Candidate'}</h2>
<p class="text-body">${candidate.email || 'No email'}</p>
</div>
<div class="header-actions">
<button class="btn-primary email-btn" data-email-type="accept"><i class="fas fa-check-circle mr-2"></i> Accept</button>
<button class="btn-secondary email-btn" data-email-type="reject"><i class="fas fa-times-circle mr-2"></i> Reject</button>
</div>
</div>
<div class="modal-body-full">
<div class="tabs-full">
<button class="tab-button active" data-tab="info"><i class="fas fa-user-circle mr-2"></i>Basic Info</button>
<button class="tab-button" data-tab="strengths"><i class="fas fa-bullseye mr-2"></i>Strengths & Weaknesses</button>
<button class="tab-button" data-tab="summary"><i class="fas fa-file-alt mr-2"></i>Summary & Justification</button>
<button class="tab-button" data-tab="recommendation"><i class="fas fa-star mr-2"></i>Recommendation</button>
<button class="tab-button" data-tab="interview"><i class="fas fa-question-circle mr-2"></i>Interview Qs</button>
</div>
<div class="tab-content-pane-full">
</div>
</div>
</div>
</div>
`;

const tabsContainer = modalContainer.querySelector('.tabs-full');
const contentContainer = modalContainer.querySelector('.tab-content-pane-full');

contentContainer.innerHTML = renderTabContent('info', candidate);

tabsContainer.addEventListener('click', (e) => {
const tabButton = e.target.closest('.tab-button');
if (!tabButton) return;

tabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
tabButton.classList.add('active');

const tabName = tabButton.dataset.tab;
contentContainer.innerHTML = renderTabContent(tabName, candidate);
});

modalContainer.querySelectorAll('.email-btn').forEach(button => {
button.addEventListener('click', (event) => {
const emailType = button.dataset.emailType;
sendEmail(emailType, candidate, event);
});
});
}


function renderTabContent(tabName, candidate) {
switch (tabName) {
case 'info':
return `
<div class="prose max-w-none">
<h4 class="text-heading">Candidate Details</h4>
<p><strong>Name:</strong> ${candidate.name || 'Not available'}</p>
<p><strong>Email:</strong> ${candidate.email || 'Not available'}</p>
<p><strong>Phone:</strong> ${candidate.phone || 'Not available'}</p>
<h4 class="text-heading mt-6">Email Metadata</h4>
<p><strong>Sender:</strong> ${candidate.sender || 'Unknown'}</p>
<p><strong>Subject:</strong> ${candidate.subject || 'N/A'}</p>
<p><strong>Filename:</strong> ${candidate.filename}</p>
${candidate.sections.basic_info ? `<h4 class="text-heading mt-6">Basic Info Summary</h4><div class="prose">${formatTextWithMarkdown(candidate.sections.basic_info)}</div>` : ''}
</div>
`;
case 'strengths':
return `
<div class="prose max-w-none">
<h4 class="text-heading">Strengths</h4>
${renderStrengths(candidate.sections.strengths_weaknesses)}
<h4 class="text-heading mt-6">Weaknesses</h4>
${renderWeaknesses(candidate.sections.strengths_weaknesses)}
</div>
`;
case 'summary':
return `
<div class="prose max-w-none">
<h4 class="text-heading">HR Summary</h4>
${formatTextWithMarkdown(candidate.sections.hr_summary)}
<h4 class="text-heading mt-6">Justification</h4>
${formatTextWithMarkdown(candidate.sections.justification)}
</div>
`;
case 'recommendation':
return `
<div class="prose max-w-none p-4 rounded-xl recommendation-section">
${formatTextWithMarkdown(candidate.sections.recommendation)}
</div>
`;
case 'interview':
return `
<div class="prose max-w-none">
${parseInterviewQuestions(candidate.sections.interview_questions)}
</div>
`;
default:
return '';
}
}

function formatTextWithMarkdown(text) {
if (!text) return '';
text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
text = text.replace(/^- (.*$)/gm, '<li>$1</li>');
const listRegex = /(<li>.*<\/li>)/s;
if (listRegex.test(text)) {
text = text.replace(listRegex, '<ul>$1</ul>');
}
text = text.replace(/\n/g, '<br>');
return text;
}

function renderStrengths(text) {
if (!text) return '<p class="text-muted">No strengths provided.</p>';
let html = '';
const strengths = text.split('- **Weakness:**')[0].split('- **Strength:**').slice(1);
if (strengths.length > 0) {
strengths.forEach(strength => {
html += `
<div class="strength-item">
<i class="fas fa-plus-circle mr-2 text-blue-500"></i>
<span>${strength.trim()}</span>
</div>
`;
});
} else {
return `<p class="text-muted">No strengths provided.</p>`;
}
return html;
}

function renderWeaknesses(text) {
if (!text) return '<p class="text-muted">No weaknesses provided.</p>';
let html = '';
const weaknesses = text.split('- **Weakness:**').slice(1);
if (weaknesses.length > 0) {
weaknesses.forEach(weakness => {
html += `
<div class="weakness-item">
<i class="fas fa-minus-circle mr-2 text-orange-500"></i>
<span>${weakness.trim()}</span>
</div>
`;
});
} else {
return `<p class="text-muted">No weaknesses provided.</p>`;
}
return html;
}

function parseInterviewQuestions(text) {
if (!text) return '<p class="text-muted">No interview questions provided.</p>';
const questions = text.split(/\d+\.\s/).filter(q => q.trim() !== '');
let html = '';
questions.forEach((question, index) => {
const parts = question.split(/\[Match level: |—/);
const questionText = parts[0].trim();
let matchLevel = '';
let explanation = '';
if (parts.length > 1) {
matchLevel = (parts[1] || '').replace(']', '').trim();
explanation = (parts[2] || '').trim();
}
html += `
<div class="question-item bg-card p-4 rounded-lg mb-3">
<p class="font-semibold text-heading">${index + 1}. ${questionText}</p>
${explanation ? `
<div class="mt-2 text-sm text-muted border-l-2 pl-2">
${explanation}
</div>
` : ''}
</div>
`;
});
return html;
}

function getMatchClass(level) {
if (!level) return '';
const lowerLevel = level.toLowerCase();
if (lowerLevel.includes('clear')) return 'bg-green-500';
if (lowerLevel.includes('partial')) return 'bg-yellow-500';
if (lowerLevel.includes('not evident')) return 'bg-red-500';
return 'bg-gray-400';
}

// Chatbot Functions
function toggleChat() {
const chatPopup = document.getElementById('chat-popup');
if(chatPopup) chatPopup.classList.toggle('show');
}

function addMessage(message, sender) {
const chatBody = document.getElementById('chat-body');
if (!chatBody) return;
const messageElement = document.createElement('div');
messageElement.classList.add('message');
if (sender === 'user') {
messageElement.classList.add('user-message');
} else {
messageElement.classList.add('assistant-message');
}
messageElement.innerHTML = formatTextWithMarkdown(message);
chatBody.appendChild(messageElement);
chatBody.scrollTop = chatBody.scrollHeight;
}

async function sendMessage() {
const chatInput = document.getElementById('chat-input-field');
const message = chatInput.value.trim();
if (!message) return;

addMessage(message, 'user');
chatInput.value = '';

addMessage('<i class="fas fa-spinner fa-spin"></i>', 'assistant');
const loadingMessage = document.getElementById('chat-body').lastChild;

try {
const response = await fetch('/chat', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ message: message })
});
const data = await response.json();
loadingMessage.remove();
addMessage(data.response, 'assistant');
} catch (error) {
console.error('Error sending chat message:', error);
loadingMessage.remove();
addMessage("I'm sorry, I'm unable to connect right now. Please try again later.", 'assistant');
}
}

document.addEventListener('DOMContentLoaded', () => {
const initialPage = window.location.hash.substring(1) || 'landing';
renderPage(initialPage);
applyInitialTheme();

const chatInput = document.getElementById('chat-input-field');
if (chatInput) {
chatInput.addEventListener('keypress', function(event) {
if (event.key === 'Enter') {
sendMessage();
}
});
}
});
