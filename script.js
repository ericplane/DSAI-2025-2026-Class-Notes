
document.addEventListener('DOMContentLoaded', () => {
    const navigation = document.getElementById('navigation');
    const content = document.getElementById('content');
    const dashboard = document.getElementById('dashboard');
    const searchInput = document.getElementById('search-input');
    const themeToggle = document.getElementById('theme-toggle');
    const viewToggle = document.getElementById('view-toggle');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const breadcrumb = document.getElementById('breadcrumb');
    const coursesGrid = document.getElementById('courses-grid');
    const converter = new showdown.Converter();

    let files = [];
    let searchIndex;
    let currentView = 'dashboard'; // 'dashboard' or 'content'
    let courseStats = { courses: 0, notes: 0 };

    // --- Theming ---
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    };

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        applyTheme(currentTheme);
    });

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // --- View Toggle ---
    viewToggle.addEventListener('click', () => {
        if (currentView === 'dashboard') {
            viewToggle.innerHTML = '<i class="fas fa-th-large"></i>';
        } else {
            showDashboard();
            viewToggle.innerHTML = '<i class="fas fa-file-alt"></i>';
        }
    });

    // --- Sidebar Toggle ---
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
        }
    });

    // Detect if we're running on GitHub Pages and adjust paths accordingly
    const isGitHubPages = window.location.hostname === 'juliusbrussee.github.io';
    const basePath = isGitHubPages ? '/DSAI-2025-2026-Class-Notes/' : './';
    
    // --- File Loading & Navigation ---
    // Embedded file list for CORS-free operation (using relative paths)
    const embeddedFiles = [
        "README.md",
        "Year1/Semester1/Calculus 1/ExamPrep.md",
        "Year1/Semester1/Calculus 1/Lectures/Lecture_1&2_Calculus",
        "Year1/Semester1/Foundations of Computer Science/ExamPrep.md",
        "Year1/Semester1/Introduction to Digital Skills and Programming/ExamPrep.md",
        "Year1/Semester1/Introduction to Digital Skills and Programming/Lectures/Lecture_1_DSIP",
        "Year1/Semester1/Introduction to Digital Skills and Programming/Lectures/Lecture_2_DSIP",
        "Year1/Semester1/Introduction to Digital Skills and Programming/Lectures/Lecture_3_DSIP",
        "Year1/Semester1/Orientation AI/ExamPrep.md",
        "Year1/Semester1/Studying and Presenting/Notes.md",
        "Year1/Semester1/Studying and Presenting/Lectures/Lecture_1_Studying_and_Presenting.md",
        "Year1/Semester1/Studying and Presenting/Lectures/Lecture_2_Studying_and_Presenting"
    ];

    // Try to load from file-list.json first, fallback to embedded list
    fetch(basePath + 'file-list.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('file-list.json not found');
            }
            return response.json();
        })
        .then(filePaths => {
            files = filePaths;
            console.log('Loaded files from JSON:', files);
            initializeApp();
        })
        .catch(error => {
            // Fallback: use embedded file list
            console.log('Using embedded file list due to:', error.message);
            files = embeddedFiles;
            initializeApp();
        });

    function initializeApp() {
        buildNavigation(files);
        buildDashboard(files);
        buildSearchIndex(files);
        updateStats(files);
    }

    async function discoverAdditionalFiles() {
        const additionalFiles = await findMarkdownFiles();
        // Merge with existing files, avoiding duplicates
        const allFiles = [...new Set([...files, ...additionalFiles])];
        files = allFiles.sort();
        return files;
    }

    async function findMarkdownFiles() {
        const foundFiles = [];
        const basePath = '/Users/julb/Desktop/GitHub/DSAI-2025-2026-Class-Notes/';
        
        // Define the directory structure to search
        const searchPaths = [
            'Year1/Semester1/Calculus 1/Lectures/',
            'Year1/Semester1/Foundations of Computer Science/Lectures/',
            'Year1/Semester1/Introduction to Digital Skills and Programming/Lectures/',
            'Year1/Semester1/Orientation AI/Lectures/',
            'Year1/Semester1/Studying and Presenting/Lectures/',
            'Year1/Semester2/',
            'Year2/',
            'Year3/'
        ];

        // Known lecture files that might not have .md extension
        const knownFiles = [
            'Year1/Semester1/Calculus 1/Lectures/Lecture_1&2_Calculus',
            'Year1/Semester1/Introduction to Digital Skills and Programming/Lectures/Lecture_1_DSIP',
            'Year1/Semester1/Introduction to Digital Skills and Programming/Lectures/Lecture_2_DSIP',
            'Year1/Semester1/Introduction to Digital Skills and Programming/Lectures/Lecture_3_DSIP',
            'Year1/Semester1/Studying and Presenting/Lectures/Lecture_1_Studying_and_Presenting.md',
            'Year1/Semester1/Studying and Presenting/Lectures/Lecture_2_Studying_and_Presenting',
            'Year1/Semester1/Studying and Presenting/Notes.md',
            'Year1/Semester1/Calculus 1/ExamPrep.md',
            'Year1/Semester1/Foundations of Computer Science/ExamPrep.md',
            'Year1/Semester1/Introduction to Digital Skills and Programming/ExamPrep.md',
            'Year1/Semester1/Orientation AI/ExamPrep.md',
            'README.md'
        ];

        // Test each known file
        for (const file of knownFiles) {
            const fullPath = basePath + file;
            try {
                const response = await fetch(fullPath);
                if (response.ok) {
                    foundFiles.push(fullPath);
                }
            } catch (error) {
                // File doesn't exist, skip it
            }
        }

        return foundFiles;
    }

    function buildFileListDynamically() {
        findMarkdownFiles().then(foundFiles => {
            files = foundFiles;
            buildNavigation(files);
            buildDashboard(files);
            buildSearchIndex(files);
            updateStats(files);
        });
    }

    function buildNavigation(files) {
        const tree = {};

        files.forEach(file => {
            // Use the file path directly since it's already relative
            const parts = file.split('/');
            let currentLevel = tree;

            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    currentLevel[part] = file;
                } else {
                    if (!currentLevel[part]) {
                        currentLevel[part] = {};
                    }
                    currentLevel = currentLevel[part];
                }
            });
        });

        const navUl = document.createElement('ul');
        buildNavMenu(tree, navUl);
        navigation.innerHTML = '';
        navigation.appendChild(navUl);
    }

    function buildNavMenu(tree, parentElement) {
        for (const key in tree) {
            const value = tree[key];
            const li = document.createElement('li');

            if (typeof value === 'string') {
                const a = document.createElement('a');
                a.href = '#';
                // Handle both .md files and files without extensions
                let displayName = key;
                if (key.endsWith('.md')) {
                    displayName = key.replace('.md', '');
                }
                // Format display name for better readability
                displayName = displayName.replace(/_/g, ' ');
                a.textContent = displayName;
                a.dataset.path = value;
                li.appendChild(a);
            } else {
                const div = document.createElement('div');
                div.className = 'folder-header';
                div.innerHTML = `
                    <i class="fas fa-chevron-right folder-toggle"></i>
                    <i class="fas fa-folder"></i> 
                    ${key}
                `;
                div.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFolder(div, li);
                });
                li.appendChild(div);
                
                const ul = document.createElement('ul');
                ul.className = 'folder-content collapsed';
                buildNavMenu(value, ul);
                li.appendChild(ul);
            }
            parentElement.appendChild(li);
        }
    }

    function toggleFolder(folderHeader, folderLi) {
        const folderContent = folderLi.querySelector('.folder-content');
        const toggleIcon = folderHeader.querySelector('.folder-toggle');
        
        if (folderContent.classList.contains('collapsed')) {
            folderContent.classList.remove('collapsed');
            folderContent.classList.add('expanded');
            toggleIcon.classList.remove('fa-chevron-right');
            toggleIcon.classList.add('fa-chevron-down');
        } else {
            folderContent.classList.add('collapsed');
            folderContent.classList.remove('expanded');
            toggleIcon.classList.remove('fa-chevron-down');
            toggleIcon.classList.add('fa-chevron-right');
        }
    }

    function buildDashboard(files) {
        const courses = extractCourses(files);
        courseStats.courses = courses.length;
        courseStats.notes = files.length;

        coursesGrid.innerHTML = '';
        courses.forEach(course => {
            const courseCard = createCourseCard(course);
            coursesGrid.appendChild(courseCard);
        });
    }

    function extractCourses(files) {
        const courses = new Set();
        
        files.forEach(file => {
            // File is already relative path
            const parts = file.split('/');
            if (parts.length >= 3 && parts[0].startsWith('Year')) {
                const courseName = parts[2];
                if (courseName && !courseName.endsWith('.md')) {
                    courses.add(courseName);
                }
            }
        });

        return Array.from(courses).map(courseName => {
            const courseFiles = files.filter(file => file.includes(courseName));
            return {
                name: courseName,
                files: courseFiles,
                progress: Math.min(courseFiles.length * 10, 100)
            };
        });
    }

    function createCourseCard(course) {
        const card = document.createElement('div');
        card.className = 'course-card';
        card.innerHTML = `
            <div class="course-header">
                <h3 class="course-title">${course.name}</h3>
                <i class="fas fa-book course-icon"></i>
            </div>
            <div class="course-meta">
                <span><i class="fas fa-file-alt"></i> ${course.files.length} files</span>
                <span><i class="fas fa-clock"></i> Updated recently</span>
            </div>
            <div class="course-progress">
                <div class="course-progress-bar" style="width: ${course.progress}%"></div>
            </div>
        `;

        card.addEventListener('click', () => {
            showCourseFiles(course);
        });

        return card;
    }

    function showCourseFiles(course) {
        // Filter navigation to show only this course's files
        const courseFiles = files.filter(file => 
            course.files.some(courseFile => courseFile === file)
        );
        
        // Update breadcrumb
        updateBreadcrumb([
            { name: 'Home', action: showDashboard },
            { name: course.name, action: null }
        ]);

        // Filter navigation
        navigation.innerHTML = '';
        const ul = document.createElement('ul');
        courseFiles.forEach(file => {
            let fileName = file.split('/').pop();
            if (fileName.endsWith('.md')) {
                fileName = fileName.replace('.md', '');
            }
            // Format file name for better readability
            fileName = fileName.replace(/_/g, ' ');
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = fileName;
            a.dataset.path = file;
            li.appendChild(a);
            ul.appendChild(li);
        });
        navigation.appendChild(ul);

        // Switch to content view but keep dashboard visible initially
        currentView = 'content';
        viewToggle.innerHTML = '<i class="fas fa-th-large"></i>';
    }

    function updateBreadcrumb(items) {
        const breadcrumbContent = breadcrumb.querySelector('.breadcrumb-content');
        breadcrumbContent.innerHTML = '';

        items.forEach((item, index) => {
            if (index > 0) {
                const separator = document.createElement('span');
                separator.innerHTML = ' / ';
                separator.style.color = 'var(--muted-foreground)';
                breadcrumbContent.appendChild(separator);
            }

            const element = document.createElement(item.action ? 'button' : 'span');
            if (item.action) {
                element.style.background = 'none';
                element.style.border = 'none';
                element.style.color = 'var(--primary)';
                element.style.cursor = 'pointer';
                element.style.textDecoration = 'underline';
                element.addEventListener('click', item.action);
            }
            element.textContent = item.name;
            breadcrumbContent.appendChild(element);
        });
    }

    function showDashboard() {
        dashboard.style.display = 'block';
        content.classList.remove('active');
        currentView = 'dashboard';
        viewToggle.innerHTML = '<i class="fas fa-file-alt"></i>';
        
        // Reset navigation
        navigation.innerHTML = '';
        buildNavigation(files);
        
        // Reset breadcrumb
        updateBreadcrumb([{ name: 'Home', action: null }]);
    }

    // Make showDashboard globally accessible
    window.showDashboard = showDashboard;

    function updateStats(files) {
        document.getElementById('total-courses').textContent = courseStats.courses;
        document.getElementById('total-notes').textContent = courseStats.notes;
    }

    function buildDefaultStructure() {
        // Fallback structure using relative paths
        const defaultFiles = [
            'README.md',
            'Year1/Semester1/Calculus 1/ExamPrep.md',
            'Year1/Semester1/Calculus 1/Lectures/Lecture_1&2_Calculus',
            'Year1/Semester1/Foundations of Computer Science/ExamPrep.md',
            'Year1/Semester1/Introduction to Digital Skills and Programming/ExamPrep.md',
            'Year1/Semester1/Introduction to Digital Skills and Programming/Lectures/Lecture_1_DSIP',
            'Year1/Semester1/Introduction to Digital Skills and Programming/Lectures/Lecture_2_DSIP',
            'Year1/Semester1/Introduction to Digital Skills and Programming/Lectures/Lecture_3_DSIP',
            'Year1/Semester1/Orientation AI/ExamPrep.md',
            'Year1/Semester1/Studying and Presenting/Notes.md',
            'Year1/Semester1/Studying and Presenting/Lectures/Lecture_1_Studying_and_Presenting.md',
            'Year1/Semester1/Studying and Presenting/Lectures/Lecture_2_Studying_and_Presenting'
        ];
        
        files = defaultFiles;
        buildNavigation(files);
        buildDashboard(files);
        updateStats(files);
    }

    navigation.addEventListener('click', (event) => {
        if (event.target.tagName === 'A') {
            event.preventDefault();
            const path = event.target.dataset.path;
            loadFileContent(path);
        }
    });

    function loadFileContent(path) {
        fetch(basePath + path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                const html = converter.makeHtml(text);
                content.innerHTML = html;
                
                // Render mathematical equations with MathJax
                if (window.MathJax) {
                    MathJax.typesetPromise([content]).catch((err) => console.log(err.message));
                }
                
                dashboard.style.display = 'none';
                content.classList.add('active');
                currentView = 'content';
                viewToggle.innerHTML = '<i class="fas fa-th-large"></i>';
                
                // Update breadcrumb with file name
                let fileName = path.split('/').pop();
                if (fileName.endsWith('.md')) {
                    fileName = fileName.replace('.md', '');
                }
                // Format file name for better readability
                fileName = fileName.replace(/_/g, ' ');
                updateBreadcrumb([
                    { name: 'Home', action: showDashboard },
                    { name: fileName, action: null }
                ]);
            })
            .catch(error => {
                console.error('Error loading file:', error);
                content.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <h1><i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i> File Loading Error</h1>
                        <p>Sorry, the file could not be loaded.</p>
                        <p><strong>File:</strong> ${path.split('/').pop()}</p>
                        <p><strong>Issue:</strong> ${error.message}</p>
                        <div style="background: var(--muted); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                            <p><strong>Tip:</strong> If you're seeing CORS errors, make sure to run the website through a local server:</p>
                            <code style="background: var(--card); padding: 0.5rem; border-radius: 0.25rem; display: block; margin: 0.5rem 0;">
                                python3 -m http.server 8000
                            </code>
                            <p>Then open: <a href="http://localhost:8000" target="_blank">http://localhost:8000</a></p>
                        </div>
                        <button onclick="showDashboard()" style="background: var(--primary); color: var(--primary-foreground); border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer;">
                            <i class="fas fa-home"></i> Back to Dashboard
                        </button>
                    </div>
                `;
                dashboard.style.display = 'none';
                content.classList.add('active');
            });
    }

    // --- Search ---
    function buildSearchIndex(files) {
        Promise.all(files.map(file => fetch(basePath + file).then(res => res.text())))
            .then(contents => {
                searchIndex = lunr(function () {
                    this.ref('path');
                    this.field('content');

                    files.forEach((file, i) => {
                        this.add({
                            path: file,
                            content: contents[i]
                        });
                    });
                });
            })
            .catch(error => {
                console.log('Search index could not be built:', error);
            });
    }

    searchInput.addEventListener('input', (event) => {
        const query = event.target.value;
        if (query.length > 2 && searchIndex) {
            const results = searchIndex.search(query);
            displaySearchResults(results);
        } else if (query.length === 0) {
            if (currentView === 'dashboard') {
                buildNavigation(files);
            }
        }
    });

    function displaySearchResults(results) {
        if (currentView === 'content') {
            navigation.innerHTML = ''; // Clear current navigation
            const ul = document.createElement('ul');
            results.forEach(result => {
                const path = result.ref;
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#';
                let fileName = path.split('/').pop();
                if (fileName.endsWith('.md')) {
                    fileName = fileName.replace('.md', '');
                }
                // Format file name for better readability
                fileName = fileName.replace(/_/g, ' ');
                a.textContent = fileName;
                a.dataset.path = path;
                li.appendChild(a);
                ul.appendChild(li);
            });
            navigation.appendChild(ul);
        } else {
            // In dashboard view, filter course cards
            const matchingFiles = results.map(r => r.ref);
            const matchingCourses = extractCourses(matchingFiles);
            coursesGrid.innerHTML = '';
            matchingCourses.forEach(course => {
                const courseCard = createCourseCard(course);
                coursesGrid.appendChild(courseCard);
            });
        }
    }

    // Mobile responsiveness
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed', 'open');
        }
    });
});
