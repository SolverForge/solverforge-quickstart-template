/**
 * =============================================================================
 * SOLVERFORGE QUICKSTART TEMPLATE - APPLICATION JAVASCRIPT
 * =============================================================================
 *
 * This file contains all the client-side logic for the SolverForge quickstart
 * template. It implements a "code-link" educational UI that teaches users
 * how to build the very interface they're looking at.
 *
 * FILE STRUCTURE:
 * ---------------
 * 1. GLOBAL STATE - Variables tracking UI state, loaded data, solving jobs
 * 2. INITIALIZATION - Document ready handler and app setup
 * 3. AJAX CONFIGURATION - jQuery AJAX setup and HTTP method extensions
 * 4. DEMO DATA LOADING - Fetching and selecting sample datasets
 * 5. SCHEDULE/SOLUTION LOADING - Getting solution data from backend
 * 6. RENDERING - Card-based visualization of tasks and resources
 * 7. KPI UPDATES - Key Performance Indicator card updates
 * 8. SOLVING OPERATIONS - Start, stop, and poll the solver
 * 9. SCORE ANALYSIS - Constraint breakdown modal
 * 10. TAB NAVIGATION HELPERS - Programmatic tab switching
 * 11. BUILD TAB - Source code viewer with syntax highlighting
 * 12. INTERACTIVE CODE FEATURES - Click-to-code navigation
 * 13. NOTIFICATIONS - Toast messages for errors and info
 * 14. UTILITY FUNCTIONS - Helpers and formatters
 * 15. RESOURCE & TASK CRUD - Adding and removing entities dynamically
 * 16. CONSTRAINT WEIGHT CONTROLS - Adjusting optimization weights
 *
 * CUSTOMIZATION GUIDE:
 * --------------------
 * When adapting this template for your domain:
 *
 * 1. renderSolution() - Change task card layout for your entities
 * 2. renderResources() - Change resource card layout for your facts
 * 3. updateKPIs() - Update metrics shown in KPI cards
 * 4. countViolations() - Implement violation detection for your constraints
 *
 * API ENDPOINTS USED:
 * -------------------
 * - GET /demo-data           - List available demo datasets
 * - GET /demo-data/{id}      - Get a specific demo dataset
 * - POST /schedules          - Start solving (returns job ID)
 * - GET /schedules/{jobId}   - Get current solution
 * - DELETE /schedules/{jobId}- Stop solving
 * - PUT /schedules/analyze   - Analyze score breakdown
 */


// =============================================================================
// 1. GLOBAL STATE
// =============================================================================
// These variables track the application state throughout the session.
// They are modified by various functions and checked to determine UI behavior.

/**
 * Interval ID for auto-refreshing the solution while solving.
 * Set by setInterval() when solving starts, cleared when solving stops.
 * Used to poll the backend for updates every 2 seconds.
 *
 * @type {number|null}
 */
let autoRefreshIntervalId = null;

/**
 * Currently selected demo data ID (e.g., "SMALL", "MEDIUM", "LARGE").
 * Set when user selects from the Data dropdown.
 * Used to fetch the initial dataset before solving.
 *
 * @type {string|null}
 */
let demoDataId = null;

/**
 * Current solving job ID (UUID string from the backend).
 * Set when solve() successfully starts a job.
 * Used to poll for updates and stop solving.
 *
 * @type {string|null}
 */
let scheduleId = null;

/**
 * The currently loaded schedule/solution data.
 * Contains the full problem definition and current solution:
 * - resources: Array of resource objects (problem facts)
 * - tasks: Array of task objects (planning entities)
 * - score: HardSoftScore string (e.g., "0hard/-50soft")
 * - solverStatus: "NOT_SOLVING" or "SOLVING"
 *
 * @type {Object|null}
 */
let loadedSchedule = null;

/**
 * Currently displayed file in the Build tab code viewer.
 * Used to track which file is being shown and for copy functionality.
 *
 * @type {string}
 */
let currentFile = 'domain.py';

/**
 * Cached source code content for the current file.
 * Populated by loadSourceFile() when fetching from API.
 *
 * @type {string}
 */
let currentFileContent = '';


// =============================================================================
// 2. INITIALIZATION
// =============================================================================
// Application startup code. Sets up event handlers and loads initial data.

/**
 * Document ready handler with safe initialization.
 *
 * PATTERN: Double-initialization
 * We use both $(window).on('load') and setTimeout() to ensure initialization
 * happens even if some external resources load slowly or fail to fire the
 * load event.
 *
 * This pattern is common in SolverForge quickstarts to handle:
 * - Slow CDN responses
 * - Browser caching issues
 * - Race conditions with external scripts
 */
$(document).ready(function () {
    let initialized = false;

    /**
     * Safe initialization wrapper.
     * Ensures initializeApp() is only called once.
     */
    function safeInitialize() {
        if (!initialized) {
            initialized = true;
            initializeApp();
        }
    }

    // Primary: Initialize when all resources (images, scripts) are loaded
    $(window).on('load', safeInitialize);

    // Fallback: Initialize after short delay if load event doesn't fire
    setTimeout(safeInitialize, 100);
});

/**
 * Main initialization function.
 *
 * Called once when the page is ready. This function:
 * 1. Sets up button click handlers
 * 2. Configures AJAX defaults
 * 3. Loads the demo data list
 * 4. Initializes the Build tab code viewer
 * 5. Sets up code-link click handlers
 *
 * CUSTOMIZATION: Add your own initialization code here.
 */
function initializeApp() {
    console.log('SolverForge Quickstart Template initializing...');

    // =========================================================================
    // BUTTON CLICK HANDLERS
    // =========================================================================

    // Solve button - starts the optimization
    // Connected to solve() function which POSTs to /schedules
    $("#solveButton").click(function () {
        solve();
    });

    // Stop button - terminates solving early
    // Connected to stopSolving() which DELETEs /schedules/{id}
    $("#stopSolvingButton").click(function () {
        stopSolving();
    });

    // Analyze button - shows score breakdown modal
    // Connected to analyze() which PUTs to /schedules/analyze
    $("#analyzeButton").click(function () {
        analyze();
    });

    // =========================================================================
    // AJAX SETUP & DATA LOADING
    // =========================================================================

    // Configure jQuery AJAX defaults (headers, methods)
    setupAjax();

    // Load the list of available demo datasets
    fetchDemoData();

    // =========================================================================
    // BUILD TAB INITIALIZATION
    // =========================================================================

    // Set up file navigator click handlers
    setupBuildTab();

    // Load the default file (domain.py)
    loadSourceFile('domain.py');

    // =========================================================================
    // INTERACTIVE CODE FEATURE INITIALIZATION
    // =========================================================================

    // Set up click handlers for code-link elements
    setupCodeLinkHandlers();

    console.log('Initialization complete');
}


// =============================================================================
// 3. AJAX CONFIGURATION
// =============================================================================
// jQuery AJAX setup for communicating with the backend REST API.

/**
 * Configures jQuery AJAX with proper headers and HTTP method extensions.
 *
 * WHAT THIS DOES:
 * 1. Sets default Content-Type and Accept headers for JSON
 * 2. Adds $.put() and $.delete() methods to jQuery
 *    (jQuery only has $.get() and $.post() by default)
 *
 * WHY WE NEED THIS:
 * RESTful APIs use all HTTP methods (GET, POST, PUT, DELETE).
 * The Accept header includes text/plain because job IDs are returned as text.
 */
function setupAjax() {
    // Set default headers for all AJAX requests
    $.ajaxSetup({
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json,text/plain', // text/plain for job ID
        }
    });

    // Extend jQuery with PUT and DELETE methods
    // These mirror the signature of $.get() and $.post()
    jQuery.each(["put", "delete"], function (i, method) {
        jQuery[method] = function (url, data, callback, type) {
            // Handle optional parameters (data can be omitted)
            if (jQuery.isFunction(data)) {
                type = type || callback;
                callback = data;
                data = undefined;
            }
            return jQuery.ajax({
                url: url,
                type: method,
                dataType: type,
                data: data,
                success: callback
            });
        };
    });
}


// =============================================================================
// 4. DEMO DATA LOADING
// =============================================================================
// Functions for loading sample datasets from the backend.

/**
 * Fetches the list of available demo datasets and populates the dropdown.
 *
 * FLOW:
 * 1. GET /demo-data returns ["SMALL", "MEDIUM", "LARGE"] (or similar)
 * 2. For each dataset, create a dropdown menu item
 * 3. Auto-select and load the first dataset
 *
 * CUSTOMIZATION:
 * The backend demo_data.py defines what datasets are available.
 * Each dataset is a complete Schedule object with resources and tasks.
 */
function fetchDemoData() {
    $.get("/demo-data", function (data) {
        const dropdown = $("#dataDropdown");
        dropdown.empty();

        // Create a dropdown item for each available dataset
        data.forEach(item => {
            const menuItem = $(`
                <li>
                    <a class="dropdown-item" href="#" data-dataset="${item}">
                        ${item}
                    </a>
                </li>
            `);

            // Click handler for this dataset
            menuItem.find('a').click(function (e) {
                e.preventDefault();

                // Update visual selection
                dropdown.find('.dropdown-item').removeClass('active');
                $(this).addClass('active');

                // Reset solving state and load new data
                scheduleId = null;
                demoDataId = item;

                // Load and display the selected dataset
                refreshSchedule();
            });

            dropdown.append(menuItem);
        });

        // Auto-select the first dataset
        if (data.length > 0) {
            demoDataId = data[0];
            dropdown.find('.dropdown-item').first().addClass('active');
            refreshSchedule();
        }
    }).fail(function (xhr, ajaxOptions, thrownError) {
        // Handle case where backend is not running or has no data
        showNotification("Failed to load demo data. Is the server running?", "danger");
        console.error('Failed to fetch demo data:', thrownError);
    });
}


// =============================================================================
// 5. SCHEDULE/SOLUTION LOADING
// =============================================================================
// Functions for fetching and displaying solution data.

/**
 * Fetches and displays the current schedule/solution.
 *
 * LOGIC:
 * - If scheduleId is set: GET /schedules/{scheduleId} for solving progress
 * - If scheduleId is null: GET /demo-data/{demoDataId} for initial data
 *
 * WHEN CALLED:
 * - When a dataset is selected from the dropdown
 * - Every 2 seconds while solving (via setInterval)
 * - After stopping solving
 */
function refreshSchedule() {
    // Determine which endpoint to call
    let path = "/schedules/" + scheduleId;
    if (scheduleId === null) {
        // No active job - load demo data instead
        if (demoDataId === null) {
            showNotification("Please select a dataset from the Data dropdown.", "warning");
            return;
        }
        path = "/demo-data/" + demoDataId;
    }

    // Fetch the schedule data
    $.getJSON(path, function (schedule) {
        loadedSchedule = schedule;
        renderSchedule(schedule);
    }).fail(function (xhr, ajaxOptions, thrownError) {
        showNotification("Failed to load schedule data.", "danger");
        console.error('Failed to fetch schedule:', thrownError);
        refreshSolvingButtons(false);
    });
}

/**
 * Renders the complete schedule/solution to the UI.
 *
 * UPDATES:
 * - Solve/Stop button visibility
 * - Spinner animation
 * - KPI cards
 * - Task cards in the tasks panel
 * - Resource cards in the resources panel
 *
 * @param {Object} schedule - The schedule data from the backend
 */
function renderSchedule(schedule) {
    if (!schedule) {
        console.error('No schedule data provided to renderSchedule');
        return;
    }

    console.log('Rendering schedule:', schedule);

    // Update solving buttons based on solver status
    const isSolving = schedule.solverStatus != null &&
                      schedule.solverStatus !== "NOT_SOLVING";
    refreshSolvingButtons(isSolving);

    // Update KPI cards with current metrics
    updateKPIs(schedule);

    // Render the solution visualization (task cards)
    renderSolution(schedule);

    // Render the resources panel
    renderResources(schedule);
}


// =============================================================================
// 6. RENDERING - Card-Based Visualization
// =============================================================================
// Functions that create the visual representation of tasks and resources.

/**
 * Renders the tasks panel with card-based layout.
 *
 * CARD STATES:
 * - Default (green border): Task is assigned to a resource
 * - .unassigned (orange border): Task has no resource assigned
 * - .violation (red border): Task has a constraint violation
 *
 * CUSTOMIZATION:
 * Modify this function to match your domain model:
 * - Change what fields are displayed
 * - Add domain-specific badges or indicators
 * - Implement custom violation detection
 *
 * @param {Object} schedule - Schedule containing tasks array
 */
function renderSolution(schedule) {
    const panel = $("#tasksPanel");
    panel.empty();

    // Update task count badge
    const taskCount = schedule.tasks ? schedule.tasks.length : 0;
    $("#taskCount").text(taskCount);

    // Handle empty state
    if (!schedule.tasks || schedule.tasks.length === 0) {
        panel.html('<p class="text-muted text-center">No tasks in this dataset</p>');
        return;
    }

    // Create the task grid container
    const grid = $('<div class="task-grid"></div>');

    // Render each task as a card
    schedule.tasks.forEach(task => {
        const card = createTaskCard(task, schedule);
        grid.append(card);
    });

    panel.append(grid);
}

/**
 * Creates a single task card element.
 *
 * STRUCTURE:
 * <div class="task-card [unassigned|violation] code-link">
 *   <div class="task-name">Task Name <duration></div>
 *   <div class="task-detail">Skill: skill_name</div>
 *   <div class="task-detail">Assigned: resource_name</div>
 * </div>
 *
 * CUSTOMIZATION:
 * Modify this to show your domain-specific fields.
 *
 * @param {Object} task - The task object
 * @param {Object} schedule - The full schedule (for violation checking)
 * @returns {jQuery} The task card jQuery element
 */
function createTaskCard(task, schedule) {
    // Determine card state
    const isAssigned = task.resource != null;
    const hasViolation = checkTaskViolation(task, schedule);

    // Build CSS classes
    let cardClass = 'task-card code-link';
    if (hasViolation) {
        cardClass += ' violation';
    } else if (!isAssigned) {
        cardClass += ' unassigned';
    }

    // Create the card (escaping id for onclick)
    const escapedId = task.id.replace(/'/g, "\\'");
    const card = $(`<div class="${cardClass}" data-target="app.js:createTaskCard"></div>`);

    // Task name, duration, and remove button
    const nameRow = $('<div class="task-name"></div>');
    nameRow.append($('<span></span>').text(task.name));
    const rightSide = $('<div class="d-flex align-items-center gap-2"></div>');
    rightSide.append($('<span class="task-duration"></span>').text(`${task.duration}m`));
    rightSide.append($(`<button class="btn btn-sm btn-outline-danger" onclick="removeTask('${escapedId}', event)" title="Remove Task"><i class="fas fa-minus"></i></button>`));
    nameRow.append(rightSide);
    card.append(nameRow);

    // Required skill (if any)
    if (task.requiredSkill) {
        const skillRow = $('<div class="task-detail"></div>');
        skillRow.append($('<span class="skill-tag"></span>').text(task.requiredSkill));
        card.append(skillRow);
    }

    // Assignment status
    const assignmentRow = $('<div class="task-detail"></div>');
    if (isAssigned) {
        assignmentRow.html(`<span class="assigned-badge"><i class="fas fa-check me-1"></i>${task.resource}</span>`);
    } else {
        assignmentRow.html('<span class="unassigned-badge">Unassigned</span>');
    }
    card.append(assignmentRow);

    return card;
}

/**
 * Checks if a task has any constraint violations.
 *
 * CUSTOMIZATION:
 * Implement your domain-specific violation detection here.
 * This example checks:
 * - Required skill: Is the task assigned to a resource with the required skill?
 *
 * @param {Object} task - The task to check
 * @param {Object} schedule - The schedule containing resources
 * @returns {boolean} True if task has a violation
 */
function checkTaskViolation(task, schedule) {
    // If not assigned, it's not a violation (just unassigned)
    if (!task.resource) {
        return false;
    }

    // Check required skill constraint
    if (task.requiredSkill) {
        const resource = schedule.resources.find(r => r.name === task.resource);
        if (resource) {
            // Check if resource has the required skill
            const hasSkill = resource.skills &&
                           resource.skills.includes(task.requiredSkill);
            if (!hasSkill) {
                return true; // Skill violation!
            }
        }
    }

    return false;
}

/**
 * Renders the resources panel with card-based layout.
 *
 * CARD STRUCTURE:
 * - Resource name
 * - Capacity utilization bar (color-coded)
 * - Skills list
 *
 * CUSTOMIZATION:
 * Modify this function to match your problem facts.
 *
 * @param {Object} schedule - Schedule containing resources array
 */
function renderResources(schedule) {
    const panel = $("#resourcesPanel");
    panel.empty();

    // Update resource count badge
    const resourceCount = schedule.resources ? schedule.resources.length : 0;
    $("#resourceCount").text(resourceCount);

    // Handle empty state
    if (!schedule.resources || schedule.resources.length === 0) {
        panel.html('<p class="text-muted text-center">No resources in this dataset</p>');
        return;
    }

    // Render each resource as a card
    schedule.resources.forEach(resource => {
        const card = createResourceCard(resource, schedule);
        panel.append(card);
    });
}

/**
 * Creates a single resource card element.
 *
 * FEATURES:
 * - Capacity bar showing utilization
 * - Color-coded: green (<80%), orange (80-100%), red (>100%)
 * - Skills displayed as tags
 *
 * @param {Object} resource - The resource object
 * @param {Object} schedule - The schedule (for calculating utilization)
 * @returns {jQuery} The resource card jQuery element
 */
function createResourceCard(resource, schedule) {
    // Calculate utilization
    const totalDuration = schedule.tasks
        ? schedule.tasks
            .filter(t => t.resource === resource.name)
            .reduce((sum, t) => sum + t.duration, 0)
        : 0;
    const utilization = resource.capacity > 0
        ? (totalDuration / resource.capacity) * 100
        : 0;

    // Determine capacity bar color
    let fillClass = '';
    if (utilization > 100) {
        fillClass = 'danger';
    } else if (utilization > 80) {
        fillClass = 'warning';
    }

    // Create skills badges HTML
    const skillsHtml = resource.skills && resource.skills.length > 0
        ? resource.skills.map(s => `<span class="skill-tag me-1">${s}</span>`).join('')
        : '<span class="text-muted small">No skills</span>';

    // Build the card (escaping name for onclick)
    const escapedName = resource.name.replace(/'/g, "\\'");
    const card = $(`
        <div class="resource-card code-link" data-target="app.js:createResourceCard">
            <div class="resource-header">
                <span class="resource-name">${resource.name}</span>
                <div class="d-flex align-items-center gap-2">
                    <span class="resource-stats">${totalDuration}/${resource.capacity} min</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeResource('${escapedName}', event)" title="Remove Resource">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
            </div>
            <div class="capacity-bar">
                <div class="capacity-fill ${fillClass}" style="width: ${Math.min(utilization, 100)}%"></div>
            </div>
            <div class="skills-list mt-2">
                ${skillsHtml}
            </div>
        </div>
    `);

    return card;
}


// =============================================================================
// 7. KPI UPDATES
// =============================================================================
// Functions for updating the Key Performance Indicator cards.

/**
 * Updates all KPI cards with current metrics.
 *
 * KPIs DISPLAYED:
 * - Total Tasks: Number of planning entities
 * - Assigned: Tasks with non-null planning variable
 * - Violations: Hard constraint violations
 * - Score: Current HardSoftScore
 *
 * ANIMATION:
 * KPI values pulse when they change (using .kpi-pulse class).
 *
 * CUSTOMIZATION:
 * Modify this to show metrics relevant to your domain.
 *
 * @param {Object} schedule - The schedule data
 */
function updateKPIs(schedule) {
    // Calculate metrics
    const totalTasks = schedule.tasks ? schedule.tasks.length : 0;
    const assignedTasks = schedule.tasks
        ? schedule.tasks.filter(t => t.resource != null).length
        : 0;
    const violations = countViolations(schedule);
    const score = schedule.score || '?';

    // Update KPI values with pulse animation
    updateKPIValue('#kpiTotalTasks', totalTasks);
    updateKPIValue('#kpiAssigned', assignedTasks);
    updateKPIValue('#kpiViolations', violations);
    updateKPIValue('#kpiScore', formatScore(score));
}

/**
 * Updates a single KPI value with optional pulse animation.
 *
 * @param {string} selector - jQuery selector for the KPI value element
 * @param {string|number} newValue - The new value to display
 */
function updateKPIValue(selector, newValue) {
    const el = $(selector);
    const oldValue = el.text();

    // Only animate if value changed
    if (oldValue !== String(newValue)) {
        el.text(newValue);
        el.addClass('kpi-pulse');
        setTimeout(() => el.removeClass('kpi-pulse'), 500);
    }
}

/**
 * Counts the number of hard constraint violations.
 *
 * CUSTOMIZATION:
 * Implement your domain-specific violation counting here.
 * This example counts:
 * - Required skill violations
 * - Capacity violations
 *
 * @param {Object} schedule - The schedule data
 * @returns {number} Number of violations
 */
function countViolations(schedule) {
    if (!schedule.tasks || !schedule.resources) {
        return 0;
    }

    let violations = 0;

    // Count required skill violations
    schedule.tasks.forEach(task => {
        if (task.resource && task.requiredSkill) {
            const resource = schedule.resources.find(r => r.name === task.resource);
            if (resource && resource.skills) {
                if (!resource.skills.includes(task.requiredSkill)) {
                    violations++;
                }
            }
        }
    });

    // Count capacity violations
    schedule.resources.forEach(resource => {
        const totalDuration = schedule.tasks
            .filter(t => t.resource === resource.name)
            .reduce((sum, t) => sum + t.duration, 0);
        if (totalDuration > resource.capacity) {
            violations++;
        }
    });

    return violations;
}

/**
 * Formats a score string for display.
 *
 * EXAMPLES:
 * - "0hard/-50soft" -> "0/-50"
 * - "-2hard/-15soft" -> "-2/-15"
 * - null -> "?"
 *
 * @param {string|null} score - The score string
 * @returns {string} Formatted score
 */
function formatScore(score) {
    if (!score || score === '?') {
        return '?';
    }

    const components = getScoreComponents(score);

    // Format as hard/soft
    return `${components.hard}/${components.soft}`;
}


// =============================================================================
// 8. SOLVING OPERATIONS
// =============================================================================
// Functions for starting, stopping, and monitoring the solver.

/**
 * Starts the optimization solver.
 *
 * FLOW:
 * 1. Get current constraint weights from UI sliders
 * 2. POST schedule + weights to /schedules
 * 3. Backend returns a job ID (UUID)
 * 4. Store job ID and start polling for updates
 *
 * POLLING:
 * While solving, refreshSchedule() is called every 2 seconds
 * via setInterval(). This polls GET /schedules/{jobId}.
 */
function solve() {
    // Check that we have data to solve
    if (!loadedSchedule) {
        showNotification("No data loaded. Please select a dataset first.", "warning");
        return;
    }

    // Get constraint weights from UI sliders
    const constraintWeights = getConstraintWeights();
    console.log('Constraint weights:', constraintWeights);

    // Build the request payload with schedule and weights
    const payload = {
        ...loadedSchedule,
        constraintWeights: constraintWeights
    };

    console.log('Starting solver with payload:', payload);

    // Send the schedule to the solver
    $.post("/schedules", JSON.stringify(payload), function (data) {
        // Store the job ID for future requests
        scheduleId = data;
        console.log('Solving started, job ID:', scheduleId);

        // Update UI to show solving state
        refreshSolvingButtons(true);

        showNotification("Solver started!", "success");
    }).fail(function (xhr, ajaxOptions, thrownError) {
        showNotification("Failed to start solving: " + thrownError, "danger");
        console.error('Failed to start solving:', xhr.responseText);
        refreshSolvingButtons(false);
    }, "text");
}

/**
 * Stops the currently running solver.
 *
 * FLOW:
 * 1. DELETE /schedules/{jobId}
 * 2. Backend terminates the solver
 * 3. Update UI to idle state
 * 4. Refresh to show final solution
 */
function stopSolving() {
    if (!scheduleId) {
        console.warn('No active solving job to stop');
        return;
    }

    console.log('Stopping solver, job ID:', scheduleId);

    $.delete(`/schedules/${scheduleId}`, function () {
        // Update UI to show stopped state
        refreshSolvingButtons(false);

        // Refresh to get final solution
        refreshSchedule();

        showNotification("Solver stopped", "info");
    }).fail(function (xhr, ajaxOptions, thrownError) {
        showNotification("Failed to stop solving: " + thrownError, "danger");
        console.error('Failed to stop solving:', xhr.responseText);
    });
}

/**
 * Updates the UI to reflect solving/not-solving state.
 *
 * WHEN SOLVING:
 * - Hides Solve button, shows Stop button
 * - Shows spinner animation
 * - Starts polling for updates every 2 seconds
 *
 * WHEN NOT SOLVING:
 * - Shows Solve button, hides Stop button
 * - Hides spinner
 * - Stops polling
 *
 * @param {boolean} solving - Whether solving is currently in progress
 */
function refreshSolvingButtons(solving) {
    if (solving) {
        // Solving state
        $("#solveButton").hide();
        $("#stopSolvingButton").show();
        $("#solvingSpinner").addClass("active");

        // Start polling for updates if not already polling
        if (autoRefreshIntervalId == null) {
            autoRefreshIntervalId = setInterval(refreshSchedule, 2000);
        }
    } else {
        // Idle state
        $("#solveButton").show();
        $("#stopSolvingButton").hide();
        $("#solvingSpinner").removeClass("active");

        // Stop polling
        if (autoRefreshIntervalId != null) {
            clearInterval(autoRefreshIntervalId);
            autoRefreshIntervalId = null;
        }
    }
}


// =============================================================================
// 9. SCORE ANALYSIS
// =============================================================================
// Functions for displaying the score analysis modal.

/**
 * Shows the score analysis modal with constraint breakdown.
 *
 * FLOW:
 * 1. Show the modal
 * 2. PUT /schedules/analyze with current schedule
 * 3. Render constraint breakdown table
 *
 * DISPLAY:
 * - Warning icon for violated hard constraints
 * - Check icon for satisfied constraints
 * - Match count and score contribution
 */
function analyze() {
    // Show the modal
    const modal = new bootstrap.Modal("#scoreAnalysisModal");
    modal.show();

    const modalContent = $("#scoreAnalysisContent");
    modalContent.html('<p class="text-center"><i class="fas fa-spinner fa-spin me-2"></i>Analyzing...</p>');

    // Check if we have a score to analyze
    if (!loadedSchedule) {
        modalContent.html('<p class="text-muted text-center">No data loaded.</p>');
        return;
    }

    // Update the score label in the modal header
    $('#scoreAnalysisScore').text(loadedSchedule.score || '?');

    // Fetch the score analysis from the backend
    $.put("/schedules/analyze", JSON.stringify(loadedSchedule), function (scoreAnalysis) {
        renderScoreAnalysis(scoreAnalysis, modalContent);
    }).fail(function (xhr, ajaxOptions, thrownError) {
        modalContent.html('<p class="text-danger text-center">Failed to analyze score.</p>');
        console.error('Failed to analyze score:', xhr.responseText);
    }, "json");
}

/**
 * Renders the score analysis table in the modal.
 *
 * TABLE COLUMNS:
 * - Icon: Warning/check status
 * - Constraint: Name of the constraint
 * - Type: hard/soft
 * - Matches: Number of violations
 * - Weight: Constraint weight
 * - Score: Score contribution
 *
 * @param {Object} scoreAnalysis - The analysis data from the backend
 * @param {jQuery} container - The container element to render into
 */
function renderScoreAnalysis(scoreAnalysis, container) {
    container.empty();

    let constraints = scoreAnalysis.constraints || [];

    if (constraints.length === 0) {
        container.html('<p class="text-muted text-center">No constraint data available.</p>');
        return;
    }

    // Sort constraints: violated hard constraints first, then by impact
    constraints.sort((a, b) => {
        let aComponents = getScoreComponents(a.score);
        let bComponents = getScoreComponents(b.score);

        // Hard constraints with negative score first
        if (aComponents.hard < 0 && bComponents.hard >= 0) return -1;
        if (aComponents.hard >= 0 && bComponents.hard < 0) return 1;

        // Then by absolute hard score
        if (Math.abs(aComponents.hard) !== Math.abs(bComponents.hard)) {
            return Math.abs(bComponents.hard) - Math.abs(aComponents.hard);
        }

        // Then by soft score
        return Math.abs(bComponents.soft) - Math.abs(aComponents.soft);
    });

    // Build the analysis table
    let html = '<table class="table table-sm">';
    html += `
        <thead>
            <tr>
                <th></th>
                <th>Constraint</th>
                <th>Type</th>
                <th>Matches</th>
                <th>Score</th>
            </tr>
        </thead>
        <tbody>
    `;

    constraints.forEach(constraint => {
        const components = getScoreComponents(constraint.score || "0hard/0soft");
        const isHard = components.hard !== 0;
        const isViolated = components.hard < 0 || components.soft < 0;
        const matchCount = constraint.matches ? constraint.matches.length : 0;

        // Status icon
        let icon = '';
        if (isHard && components.hard < 0) {
            icon = '<i class="fas fa-exclamation-triangle text-danger"></i>';
        } else if (matchCount === 0) {
            icon = '<i class="fas fa-check-circle text-success"></i>';
        } else {
            icon = '<i class="fas fa-minus-circle text-warning"></i>';
        }

        // Type badge
        const typeBadge = isHard
            ? '<span class="badge bg-danger">hard</span>'
            : '<span class="badge bg-success">soft</span>';

        // Score display
        const scoreDisplay = isHard ? components.hard : components.soft;

        html += `
            <tr>
                <td>${icon}</td>
                <td>${constraint.name}</td>
                <td>${typeBadge}</td>
                <td><strong>${matchCount}</strong></td>
                <td>${scoreDisplay}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.html(html);
}

/**
 * Parses a score string into its component parts.
 *
 * EXAMPLES:
 * - "0hard/0soft" -> {hard: 0, soft: 0}
 * - "-2hard/-15soft" -> {hard: -2, soft: -15}
 *
 * @param {string} score - The score string to parse
 * @returns {Object} Object with hard, medium, soft properties
 */
function getScoreComponents(score) {
    let components = {hard: 0, medium: 0, soft: 0};

    if (!score || typeof score !== 'string') {
        return components;
    }

    // Match patterns like "-2hard", "0soft", "-5medium"
    const matches = [...score.matchAll(/(-?\d*\.?\d+)(hard|medium|soft)/g)];
    matches.forEach(match => {
        components[match[2]] = parseFloat(match[1]);
    });

    return components;
}


// =============================================================================
// 10. TAB NAVIGATION HELPERS
// =============================================================================
// Functions for switching between tabs programmatically.

/**
 * Navigates to Build tab and shows a specific file.
 *
 * Used by code-link elements to view source code.
 *
 * @param {string} filename - The file to show in the Build tab
 */
function showInBuild(filename) {
    // Switch to Build tab using Bootstrap 5 API
    const tabEl = document.querySelector('[data-bs-target="#build"]');
    if (tabEl) {
        const tab = new bootstrap.Tab(tabEl);
        tab.show();
    }

    // Load the requested file after a short delay to ensure tab is visible
    setTimeout(() => {
        loadSourceFile(filename);
    }, 100);
}

/**
 * Navigates from Build tab to Demo tab.
 *
 * Used by "See in Demo" button in the code viewer.
 */
function showInDemo() {
    // Switch to Demo tab using Bootstrap 5 API
    const tabEl = document.querySelector('[data-bs-target="#demo"]');
    if (tabEl) {
        const tab = new bootstrap.Tab(tabEl);
        tab.show();
    }
}


// =============================================================================
// 11. BUILD TAB - Source Code Viewer
// =============================================================================
// Functions for the source code viewer with syntax highlighting.

/**
 * Sets up click handlers for the file navigator.
 */
function setupBuildTab() {
    // File item click handlers
    $('.file-item').click(function() {
        const filename = $(this).data('file');
        if (filename) {
            // Update active state
            $('.file-item').removeClass('active');
            $(this).addClass('active');

            // Load the file
            loadSourceFile(filename);
        }
    });
}

/**
 * Loads and displays a source file in the code viewer.
 *
 * FLOW:
 * 1. Fetch source code from /source-code/{filename} API
 * 2. Update the code viewer header with file path
 * 3. Set the code content and language class
 * 4. Trigger Prism.js highlighting
 * 5. If section is provided, find its line number and scroll to it
 *
 * RUNTIME LINE DETECTION:
 * When a section name is provided (e.g., "updateKPIs"), we search the loaded
 * content for patterns that indicate where that section is defined:
 * - Python: "def section_name" or "class SectionName"
 * - JavaScript: "function sectionName" or "sectionName(" or "const sectionName"
 *
 * This approach is more robust than hardcoded line numbers because:
 * - Line numbers change as code is edited
 * - Different environments might have different line endings
 * - The search adapts to the actual file content at runtime
 *
 * @param {string} filename - The file to load
 * @param {string} [section] - Optional section/function name to scroll to
 */
function loadSourceFile(filename, section = null) {
    console.log('Loading source file:', filename, section ? `(section: ${section})` : '');
    currentFile = filename;

    // Determine language for syntax highlighting based on file extension
    // Prism.js uses different language identifiers for different file types
    let language = 'python';
    if (filename.endsWith('.js')) {
        language = 'javascript';
    } else if (filename.endsWith('.html')) {
        language = 'markup';  // Prism uses 'markup' for HTML
    }

    // Update header with file path and appropriate icon
    const icon = language === 'python' ? 'fab fa-python'
               : language === 'javascript' ? 'fab fa-js'
               : 'fab fa-html5';
    const path = filename.endsWith('.py')
        ? `src/my_quickstart/${filename}`
        : `static/${filename}`;

    $('#currentFilePath').html(`<i class="${icon} me-2"></i>${path}`);

    // Show loading state while fetching
    const codeEl = $('#codeContent');
    codeEl.text('Loading...');

    // Fetch source code from API
    // The /source-code/{filename} endpoint returns {filename, content}
    $.getJSON(`/source-code/${filename}`, function(data) {
        currentFileContent = data.content || '// File not found';

        // Update code content in the <code> element
        codeEl.text(currentFileContent);
        codeEl.attr('class', `language-${language}`);

        // Trigger Prism.js syntax highlighting
        // This transforms plain text into highlighted HTML with line numbers
        if (typeof Prism !== 'undefined') {
            Prism.highlightElement(codeEl[0]);
        }

        // RUNTIME LINE DETECTION: If a section was requested, find and scroll to it
        // We do this AFTER Prism highlighting because:
        // 1. The content needs to be rendered before we can scroll
        // 2. Prism adds line-numbers-rows elements we use for accurate scrolling
        if (section) {
            // Small delay to ensure Prism.js has finished rendering line numbers
            // Prism's highlightElement is synchronous, but DOM updates need a tick
            setTimeout(() => {
                const lineNumber = findSectionLineNumber(currentFileContent, section, language);
                if (lineNumber > 0) {
                    console.log(`Found "${section}" at line ${lineNumber}`);
                    scrollToLine(lineNumber);
                } else {
                    console.warn(`Section "${section}" not found in ${filename}`);
                }
            }, 50);
        }

    }).fail(function(xhr, status, error) {
        console.error('Failed to load source file:', error);
        codeEl.text('// Error loading file: ' + error);
        currentFileContent = '';
    });
}


/**
 * Finds the line number where a section (function/class) is defined.
 *
 * RUNTIME LINE DETECTION EXPLAINED:
 * ---------------------------------
 * This is the core of our "smart scroll" feature. Instead of hardcoding line
 * numbers (which break when code changes), we search the actual file content
 * at runtime to find where a function or class is defined.
 *
 * HOW IT WORKS:
 * 1. Split the file content into lines
 * 2. Build regex patterns based on the language and section name
 * 3. Search each line for a match
 * 4. Return the 1-based line number (or 0 if not found)
 *
 * PATTERNS SEARCHED:
 * - Python:     "def section_name(" or "class SectionName"
 * - JavaScript: "function sectionName(" or "sectionName = function"
 *               or "const/let/var sectionName" or "sectionName(" at definition
 *
 * WHY THIS APPROACH:
 * - Resilient: Works even as code is edited and line numbers change
 * - Flexible: Can find functions, classes, or any named definition
 * - Language-aware: Uses appropriate patterns for Python vs JavaScript
 *
 * TRADE-OFFS:
 * - May not find minified code or unusual formatting
 * - Could match wrong occurrence if same name appears multiple times
 *   (we return the FIRST match, which is usually the definition)
 *
 * @param {string} content - The full file content
 * @param {string} sectionName - The function/class name to find
 * @param {string} language - The file language ('python', 'javascript', 'markup')
 * @returns {number} 1-based line number, or 0 if not found
 */
function findSectionLineNumber(content, sectionName, language) {
    if (!content || !sectionName) {
        return 0;
    }

    // Split content into lines for line-by-line search
    const lines = content.split('\n');

    // Build search patterns based on language
    // We use multiple patterns to catch different definition styles
    const patterns = [];

    if (language === 'python') {
        // Python patterns:
        // - "def function_name(" - function definition
        // - "class ClassName" - class definition (may or may not have parens)
        // - "@decorator" followed by def - decorated functions
        patterns.push(new RegExp(`^\\s*def\\s+${sectionName}\\s*\\(`));
        patterns.push(new RegExp(`^\\s*class\\s+${sectionName}\\b`));
        patterns.push(new RegExp(`^\\s*async\\s+def\\s+${sectionName}\\s*\\(`));
    } else if (language === 'javascript') {
        // JavaScript patterns:
        // - "function functionName(" - classic function declaration
        // - "functionName = function" - function expression
        // - "const/let/var functionName" - modern declaration
        // - "functionName(" in object/class context
        // - "async function" variants
        patterns.push(new RegExp(`^\\s*function\\s+${sectionName}\\s*\\(`));
        patterns.push(new RegExp(`^\\s*async\\s+function\\s+${sectionName}\\s*\\(`));
        patterns.push(new RegExp(`^\\s*(const|let|var)\\s+${sectionName}\\s*=`));
        patterns.push(new RegExp(`^\\s*${sectionName}\\s*[:=]\\s*(async\\s+)?function`));
        patterns.push(new RegExp(`^\\s*${sectionName}\\s*\\(`));  // Method shorthand
    } else {
        // HTML/markup: search for id or class attributes
        patterns.push(new RegExp(`id=["']${sectionName}["']`));
        patterns.push(new RegExp(`class=["'][^"']*${sectionName}[^"']*["']`));
    }

    // Search each line for any of our patterns
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of patterns) {
            if (pattern.test(line)) {
                // Return 1-based line number (lines array is 0-indexed)
                return i + 1;
            }
        }
    }

    // Fallback: simple substring search for the section name
    // This catches cases our patterns missed (e.g., comments mentioning the section)
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(sectionName)) {
            console.log(`Fallback match for "${sectionName}" at line ${i + 1}`);
            return i + 1;
        }
    }

    return 0;  // Not found
}


/**
 * Scrolls the code viewer to a specific line.
 *
 * Uses multiple approaches to accurately scroll to a line:
 * 1. Try to find Prism.js line-numbers-rows spans
 * 2. Fall back to measuring line height from rendered code
 *
 * @param {number} lineNumber - The line to scroll to
 */
function scrollToLine(lineNumber) {
    const viewer = $('.code-viewer-body');
    const preEl = viewer.find('pre')[0];
    const codeEl = viewer.find('code')[0];

    if (!preEl || !codeEl) {
        console.warn('No code element found for scrolling');
        return;
    }

    let offset = 0;

    // Method 1: Try to use Prism.js line-numbers-rows spans
    const lineNumbersRows = preEl.querySelector('.line-numbers-rows');
    if (lineNumbersRows && lineNumbersRows.children.length > 0) {
        // Get the height of a single line number span
        const firstLineSpan = lineNumbersRows.children[0];
        if (firstLineSpan) {
            const lineHeight = firstLineSpan.getBoundingClientRect().height;
            offset = (lineNumber - 1) * lineHeight;
            console.log(`Using line-numbers-rows method: lineHeight=${lineHeight}px, offset=${offset}px`);
        }
    }

    // Method 2: Fall back to measuring from pre element
    if (offset === 0) {
        const preStyle = window.getComputedStyle(preEl);
        let lineHeight = parseFloat(preStyle.lineHeight);

        // If lineHeight is 'normal', compute from font size
        if (isNaN(lineHeight) || lineHeight <= 0) {
            const fontSize = parseFloat(preStyle.fontSize) || 14;
            lineHeight = fontSize * 1.5;
        }

        offset = (lineNumber - 1) * lineHeight;
        console.log(`Using fallback method: lineHeight=${lineHeight}px, offset=${offset}px`);
    }

    // Add padding offset from the pre element
    const preStyle = window.getComputedStyle(preEl);
    const paddingTop = parseFloat(preStyle.paddingTop) || 0;
    offset += paddingTop;

    // Animate scroll with some padding above the target line
    const viewerHeight = viewer.height();
    const scrollTarget = Math.max(0, offset - (viewerHeight * 0.2));

    viewer.animate({
        scrollTop: scrollTarget
    }, 300);

    console.log(`Scrolling to line ${lineNumber}, final offset ${scrollTarget}px`);

    // Highlight the line briefly
    highlightLine(lineNumber);
}

/**
 * Briefly highlights a line in the code viewer.
 *
 * @param {number} lineNumber - The line to highlight
 */
function highlightLine(lineNumber) {
    // Remove any existing highlights
    $('.line-highlight').remove();

    const viewer = $('.code-viewer-body');
    const preEl = viewer.find('pre')[0];

    if (!preEl) return;

    // Get line height
    const lineNumbersRows = preEl.querySelector('.line-numbers-rows');
    let lineHeight = 21; // default

    if (lineNumbersRows && lineNumbersRows.children.length > 0) {
        lineHeight = lineNumbersRows.children[0].getBoundingClientRect().height;
    }

    const preStyle = window.getComputedStyle(preEl);
    const paddingTop = parseFloat(preStyle.paddingTop) || 0;

    // Create highlight element
    const highlight = $('<div class="line-highlight"></div>');
    highlight.css({
        position: 'absolute',
        left: 0,
        right: 0,
        top: paddingTop + (lineNumber - 1) * lineHeight,
        height: lineHeight,
        background: 'rgba(62, 0, 255, 0.15)',
        borderLeft: '3px solid #3E00FF',
        pointerEvents: 'none',
        zIndex: 10
    });

    // Add to pre element (needs relative positioning)
    $(preEl).css('position', 'relative').append(highlight);

    // Fade out after 2 seconds
    setTimeout(() => {
        highlight.fadeOut(500, function() {
            $(this).remove();
        });
    }, 2000);
}

/**
 * Copies the current code to clipboard.
 */
function copyCurrentCode() {
    const code = currentFileContent || '';

    if (!code) {
        showNotification('No code loaded to copy', 'warning');
        return;
    }

    navigator.clipboard.writeText(code).then(() => {
        showNotification('Code copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('Failed to copy code', 'danger');
    });
}


// =============================================================================
// 12. INTERACTIVE CODE FEATURES - Click-to-Code Navigation
// =============================================================================
// The "code-link" feature: clicking UI elements reveals their source code.

/**
 * Sets up click handlers for code-link elements.
 *
 * Elements with class="code-link" and data-target="file:section"
 * will navigate to the Build tab and highlight the relevant code.
 *
 * EXAMPLES:
 * - data-target="app.js:updateKPIs" -> app.js, scrolls to updateKPIs function
 * - data-target="constraints.py:required_skill" -> constraints.py
 */
function setupCodeLinkHandlers() {
    // Main code-link elements
    $(document).on('click', '.code-link', function(e) {
        // Don't trigger for nested clickable elements
        if ($(e.target).closest('.btn').length > 0) {
            return; // Let button clicks work normally
        }

        const target = $(this).data('target');
        if (target) {
            navigateToCode(target);
        }
    });

    // Constraint badges
    $(document).on('click', '.constraint-badge', function(e) {
        e.stopPropagation();
        const target = $(this).data('target');
        if (target) {
            navigateToCode(target);
        }
    });
}

/**
 * Navigates to a specific code location from an code-link target.
 *
 * TARGET FORMAT: "filename:section"
 * - filename: The file to show (e.g., "app.js", "constraints.py")
 * - section: Optional section/function name to scroll to (e.g., "updateKPIs")
 *
 * RUNTIME LINE DETECTION:
 * Unlike static line numbers that would break when code changes, this function
 * uses runtime search to find the section. After the file loads from the API,
 * we search the actual content for the section name (function/class definition)
 * and scroll to where it's found. This keeps code-links working even as code evolves.
 *
 * @param {string} target - The target in "file:section" format
 */
function navigateToCode(target) {
    console.log('Navigating to code:', target);

    // Parse target: "filename:section" -> ["filename", "section"]
    // The section is optional - if not provided, we just show the file from the top
    const [filename, section] = target.split(':');

    // Switch to Build tab using Bootstrap 5 Tab API
    // We access the nav-link element and create a Tab instance to show it
    const tabEl = document.querySelector('[data-bs-target="#build"]');
    if (tabEl) {
        const tab = new bootstrap.Tab(tabEl);
        tab.show();
    }

    // Load the file after a short delay to ensure tab transition completes
    // The delay is needed because Bootstrap's tab.show() is asynchronous
    setTimeout(() => {
        // Update file navigator active state for visual feedback
        $('.file-item').removeClass('active');
        $(`.file-item[data-file="${filename}"]`).addClass('active');

        // Load the file, passing the section name for line scrolling
        // If section is provided, loadSourceFile will search for it after loading
        loadSourceFile(filename, section);
    }, 100);

    // Show notification with file and section info
    const sectionInfo = section ? ` → ${section}` : '';
    showNotification(`Viewing ${filename}${sectionInfo}`, 'info');
}


// =============================================================================
// 13. NOTIFICATIONS
// =============================================================================
// Toast-style notification messages.

/**
 * Shows a notification toast message.
 *
 * TYPES:
 * - 'success': Green checkmark
 * - 'danger': Red X
 * - 'warning': Yellow warning
 * - 'info': Blue info
 *
 * @param {string} message - The message to display
 * @param {string} type - The notification type (success, danger, warning, info)
 */
function showNotification(message, type = 'info') {
    const panel = $('#notificationPanel');

    // Create the toast
    const toast = $(`
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);

    panel.append(toast);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        toast.alert('close');
    }, 5000);
}


// =============================================================================
// 14. UTILITY FUNCTIONS
// =============================================================================
// Helper functions used throughout the application.

/**
 * Escapes HTML special characters to prevent XSS.
 *
 * @param {string} text - The text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// =============================================================================
// 15. RESOURCE & TASK CRUD OPERATIONS
// =============================================================================
// Functions for adding and removing resources and tasks dynamically.

/**
 * Shows the Add Resource modal dialog.
 *
 * @param {Event} event - Click event (to stop propagation)
 */
function showAddResourceModal(event) {
    event.stopPropagation();

    // Clear previous values
    $('#resourceName').val('');
    $('#resourceCapacity').val(100);
    $('#resourceSkills').val('');

    // Show modal
    const modal = new bootstrap.Modal('#addResourceModal');
    modal.show();
}

/**
 * Adds a new resource to the schedule.
 *
 * Reads values from the Add Resource modal form and adds
 * a new resource to loadedSchedule.resources.
 */
function addResource() {
    const name = $('#resourceName').val().trim();
    const capacity = parseInt($('#resourceCapacity').val()) || 100;
    const skillsStr = $('#resourceSkills').val().trim();
    const skills = skillsStr ? skillsStr.split(',').map(s => s.trim().toLowerCase()) : [];

    // Validate
    if (!name) {
        showNotification('Please enter a resource name', 'warning');
        return;
    }

    // Check for duplicate
    if (loadedSchedule && loadedSchedule.resources) {
        if (loadedSchedule.resources.some(r => r.name === name)) {
            showNotification('A resource with this name already exists', 'warning');
            return;
        }
    }

    // Initialize schedule if needed
    if (!loadedSchedule) {
        loadedSchedule = { resources: [], tasks: [] };
    }
    if (!loadedSchedule.resources) {
        loadedSchedule.resources = [];
    }

    // Add the resource
    loadedSchedule.resources.push({
        name: name,
        capacity: capacity,
        skills: skills
    });

    // Close modal and re-render
    bootstrap.Modal.getInstance('#addResourceModal').hide();
    renderSchedule(loadedSchedule);
    showNotification(`Added resource: ${name}`, 'success');
}

/**
 * Removes a resource from the schedule.
 *
 * @param {string} resourceName - Name of the resource to remove
 * @param {Event} event - Click event (to stop propagation)
 */
function removeResource(resourceName, event) {
    event.stopPropagation();

    if (!loadedSchedule || !loadedSchedule.resources) {
        return;
    }

    // Remove the resource
    loadedSchedule.resources = loadedSchedule.resources.filter(r => r.name !== resourceName);

    // Unassign any tasks assigned to this resource
    if (loadedSchedule.tasks) {
        loadedSchedule.tasks.forEach(task => {
            if (task.resource === resourceName) {
                task.resource = null;
            }
        });
    }

    // Re-render
    renderSchedule(loadedSchedule);
    showNotification(`Removed resource: ${resourceName}`, 'info');
}

/**
 * Shows the Add Task modal dialog.
 *
 * @param {Event} event - Click event (to stop propagation)
 */
function showAddTaskModal(event) {
    event.stopPropagation();

    // Clear previous values
    $('#taskName').val('');
    $('#taskDuration').val(30);
    $('#taskSkill').val('');

    // Show modal
    const modal = new bootstrap.Modal('#addTaskModal');
    modal.show();
}

/**
 * Adds a new task to the schedule.
 *
 * Reads values from the Add Task modal form and adds
 * a new task to loadedSchedule.tasks.
 */
function addTask() {
    const name = $('#taskName').val().trim();
    const duration = parseInt($('#taskDuration').val()) || 30;
    const requiredSkill = $('#taskSkill').val().trim().toLowerCase();

    // Validate
    if (!name) {
        showNotification('Please enter a task name', 'warning');
        return;
    }

    // Initialize schedule if needed
    if (!loadedSchedule) {
        loadedSchedule = { resources: [], tasks: [] };
    }
    if (!loadedSchedule.tasks) {
        loadedSchedule.tasks = [];
    }

    // Generate unique ID
    const existingIds = loadedSchedule.tasks.map(t => t.id);
    let newId = `task-${loadedSchedule.tasks.length + 1}`;
    let counter = loadedSchedule.tasks.length + 1;
    while (existingIds.includes(newId)) {
        counter++;
        newId = `task-${counter}`;
    }

    // Add the task
    loadedSchedule.tasks.push({
        id: newId,
        name: name,
        duration: duration,
        requiredSkill: requiredSkill || '',
        resource: null
    });

    // Close modal and re-render
    bootstrap.Modal.getInstance('#addTaskModal').hide();
    renderSchedule(loadedSchedule);
    showNotification(`Added task: ${name}`, 'success');
}

/**
 * Removes a task from the schedule.
 *
 * @param {string} taskId - ID of the task to remove
 * @param {Event} event - Click event (to stop propagation)
 */
function removeTask(taskId, event) {
    event.stopPropagation();

    if (!loadedSchedule || !loadedSchedule.tasks) {
        return;
    }

    // Find task name for notification
    const task = loadedSchedule.tasks.find(t => t.id === taskId);
    const taskName = task ? task.name : taskId;

    // Remove the task
    loadedSchedule.tasks = loadedSchedule.tasks.filter(t => t.id !== taskId);

    // Re-render
    renderSchedule(loadedSchedule);
    showNotification(`Removed task: ${taskName}`, 'info');
}


// =============================================================================
// 16. CONSTRAINT WEIGHT CONTROLS
// =============================================================================
// Functions for adjusting constraint weights via sliders.

/**
 * Default constraint weight values.
 * Hard constraints default to 100, soft constraints to 50.
 */
const DEFAULT_WEIGHTS = {
    RequiredSkill: 100,
    ResourceCapacity: 100,
    MinimizeDuration: 50,
    BalanceLoad: 50
};

/**
 * Updates the displayed value for a constraint weight slider.
 *
 * Called by oninput on each slider.
 *
 * @param {string} constraintName - Name of the constraint (e.g., "RequiredSkill")
 */
function updateWeightDisplay(constraintName) {
    const value = $(`#weight${constraintName}`).val();
    $(`#weight${constraintName}Value`).text(value);
}

/**
 * Resets all constraint weights to their default values.
 */
function resetConstraintWeights() {
    Object.keys(DEFAULT_WEIGHTS).forEach(name => {
        $(`#weight${name}`).val(DEFAULT_WEIGHTS[name]);
        $(`#weight${name}Value`).text(DEFAULT_WEIGHTS[name]);
    });
    showNotification('Constraint weights reset to defaults', 'info');
}

/**
 * Gets the current constraint weights from the sliders.
 *
 * @returns {Object} Object with constraint names and their weights (0-100)
 */
function getConstraintWeights() {
    return {
        required_skill: parseInt($('#weightRequiredSkill').val()) || 100,
        resource_capacity: parseInt($('#weightResourceCapacity').val()) || 100,
        minimize_duration: parseInt($('#weightMinimizeDuration').val()) || 50,
        balance_load: parseInt($('#weightBalanceLoad').val()) || 50
    };
}
