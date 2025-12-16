/*
 * =============================================================================
 * SOLVERFORGE QUICKSTART - SHARED WEB UI UTILITIES
 * =============================================================================
 *
 * This file provides shared utility functions for all SolverForge quickstart UIs.
 * It includes:
 * - Header/footer generation
 * - Error notification handling
 * - Application info display
 * - Color utilities for visualizations
 *
 * USAGE:
 * ------
 * 1. Include this file AFTER jQuery and Bootstrap in your HTML
 * 2. Call replaceQuickstartSolverForgeAutoHeaderFooter() in your app.js
 * 3. Use showError() for displaying error notifications
 * 4. Use pickColor()/nextColor() for consistent visualization colors
 */


// =============================================================================
// HEADER & FOOTER GENERATION
// =============================================================================

/**
 * Replaces the placeholder header and footer with the SolverForge branded versions.
 *
 * This function looks for:
 * - <header id="solverforge-auto-header"> - replaced with navbar
 * - <footer id="solverforge-auto-footer"> - replaced with footer links
 *
 * The header includes:
 * - SolverForge logo linking to homepage
 * - Navigation tabs: Demo UI, Guide, REST API
 * - Data dropdown for selecting demo datasets
 *
 * CUSTOMIZATION:
 * - Modify the HTML template below to change navigation items
 * - Update logo src to use a different logo
 * - Add/remove nav items as needed
 */
function replaceQuickstartSolverForgeAutoHeaderFooter() {
    const solverforgeHeader = $("header#solverforge-auto-header");
    if (solverforgeHeader != null) {
        // Set white background for header
        solverforgeHeader.css("background-color", "#ffffff");

        // Append the navbar HTML
        solverforgeHeader.append(
            $(`<div class="container-fluid">
        <nav class="navbar sticky-top navbar-expand-lg shadow-sm mb-3" style="background-color: #ffffff;">
          <!-- Logo - links to SolverForge homepage -->
          <a class="navbar-brand" href="https://www.solverforge.org">
            <img src="/webjars/solverforge/img/solverforge-horizontal.svg" alt="SolverForge logo" width="400">
          </a>

          <!-- Mobile toggle button -->
          <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>

          <!-- Navigation items -->
          <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="nav nav-pills">
              <!-- Demo UI tab - shows the main visualization -->
              <li class="nav-item active" id="navUIItem">
                <button class="nav-link active" id="navUI" data-bs-toggle="pill" data-bs-target="#demo" type="button" style="color: #1f2937;">Demo UI</button>
              </li>
              <!-- Guide tab - shows REST API usage guide -->
              <li class="nav-item" id="navRestItem">
                <button class="nav-link" id="navRest" data-bs-toggle="pill" data-bs-target="#rest" type="button" style="color: #1f2937;">Guide</button>
              </li>
              <!-- REST API tab - shows Swagger/OpenAPI docs -->
              <li class="nav-item" id="navOpenApiItem">
                <button class="nav-link" id="navOpenApi" data-bs-toggle="pill" data-bs-target="#openapi" type="button" style="color: #1f2937;">REST API</button>
              </li>
            </ul>
          </div>

          <!-- Data dropdown - populated dynamically with demo datasets -->
          <div class="ms-auto">
              <div class="dropdown">
                  <button class="btn dropdown-toggle" type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="background-color: #10b981; color: #ffffff; border-color: #10b981;">
                      Data
                  </button>
                  <div id="testDataButton" class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                      <!-- Demo data items will be added here by fetchDemoData() -->
                  </div>
              </div>
          </div>
        </nav>
      </div>`));
    }

    const solverforgeFooter = $("footer#solverforge-auto-footer");
    if (solverforgeFooter != null) {
        // Append the footer HTML
        solverforgeFooter.append(
            $(`<footer class="bg-black text-white-50">
               <div class="container">
                 <div class="hstack gap-3 p-4">
                   <div class="ms-auto"><a class="text-white" href="https://www.solverforge.org">SolverForge</a></div>
                   <div class="vr"></div>
                   <div><a class="text-white" href="https://www.solverforge.org/docs">Documentation</a></div>
                   <div class="vr"></div>
                   <div><a class="text-white" href="https://github.com/SolverForge/solverforge">Code</a></div>
                   <div class="vr"></div>
                   <div class="me-auto"><a class="text-white" href="mailto:info@solverforge.org">Support</a></div>
                 </div>
               </div>
               <!-- Application info will be displayed here -->
               <div id="applicationInfo" class="container text-center"></div>
             </footer>`));

        // Load and display application info
        applicationInfo();
    }
}


// =============================================================================
// ERROR NOTIFICATION HANDLING
// =============================================================================

/**
 * Shows a simple error notification with just a title.
 *
 * Use this for simple error messages that don't have additional details.
 * The notification auto-dismisses after 30 seconds.
 *
 * @param {string} title - The error message to display
 *
 * EXAMPLE:
 *   showSimpleError("No schedule data available");
 */
function showSimpleError(title) {
    const notification = $(`<div class="toast" role="alert" aria-live="assertive" aria-atomic="true" style="min-width: 50rem"/>`)
        .append($(`<div class="toast-header bg-danger">
                 <strong class="me-auto text-dark">Error</strong>
                 <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
               </div>`))
        .append($(`<div class="toast-body"/>`)
            .append($(`<p/>`).text(title))
        );
    $("#notificationPanel").append(notification);
    notification.toast({delay: 30000});
    notification.toast('show');
}

/**
 * Shows a detailed error notification from an AJAX error response.
 *
 * This extracts error details from the XMLHttpRequest object and displays:
 * - Error title (from the caller)
 * - Server error message
 * - Error code
 * - Error ID (for debugging)
 *
 * @param {string} title - A human-readable title for the error
 * @param {XMLHttpRequest} xhr - The jQuery AJAX error object
 *
 * EXAMPLE:
 *   $.post("/schedules", data).fail(function(xhr) {
 *       showError("Failed to start solving", xhr);
 *   });
 */
function showError(title, xhr) {
    // Extract error details from response
    var serverErrorMessage = !xhr.responseJSON ? `${xhr.status}: ${xhr.statusText}` : xhr.responseJSON.message;
    var serverErrorCode = !xhr.responseJSON ? `unknown` : xhr.responseJSON.code;
    var serverErrorId = !xhr.responseJSON ? `----` : xhr.responseJSON.id;
    var serverErrorDetails = !xhr.responseJSON ? `no details provided` : xhr.responseJSON.details;

    // Handle case where responseJSON exists but has unexpected format
    if (xhr.responseJSON && !serverErrorMessage) {
        serverErrorMessage = JSON.stringify(xhr.responseJSON);
        serverErrorCode = xhr.statusText + '(' + xhr.status + ')';
        serverErrorId = `----`;
    }

    // Log to console for debugging
    console.error(title + "\n" + serverErrorMessage + " : " + serverErrorDetails);

    // Create and show toast notification
    const notification = $(`<div class="toast" role="alert" aria-live="assertive" aria-atomic="true" style="min-width: 50rem"/>`)
        .append($(`<div class="toast-header bg-danger">
                 <strong class="me-auto text-dark">Error</strong>
                 <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
               </div>`))
        .append($(`<div class="toast-body"/>`)
            .append($(`<p/>`).text(title))
            .append($(`<pre/>`)
                .append($(`<code/>`).text(serverErrorMessage + "\n\nCode: " + serverErrorCode + "\nError id: " + serverErrorId))
            )
        );
    $("#notificationPanel").append(notification);
    notification.toast({delay: 30000});
    notification.toast('show');
}


// =============================================================================
// APPLICATION INFO
// =============================================================================

/**
 * Fetches and displays application version information in the footer.
 *
 * This calls the /info endpoint (if available) and displays:
 * - Application name
 * - Version number
 * - Build timestamp
 *
 * NOTE: Your backend must implement the /info endpoint for this to work.
 * If not implemented, the footer will just show the links without version info.
 */
function applicationInfo() {
    $.getJSON("info", function (info) {
        $("#applicationInfo").append("<small>" + info.application + " (version: " + info.version + ", built at: " + info.built + ")</small>");
    }).fail(function (xhr, ajaxOptions, thrownError) {
        console.warn("Unable to collect application information");
    });
}


// =============================================================================
// TANGO COLOR FACTORY
// =============================================================================
//
// These functions provide a consistent color palette for visualizations.
// The colors are based on the Tango color palette, which provides good
// contrast and accessibility.
//
// USAGE:
//   let color = pickColor("employee-1");  // Returns consistent color for same object
//   let color = nextColor();              // Returns next color in sequence

const SEQUENCE_1 = [0x8AE234, 0xFCE94F, 0x729FCF, 0xE9B96E, 0xAD7FA8];
const SEQUENCE_2 = [0x73D216, 0xEDD400, 0x3465A4, 0xC17D11, 0x75507B];

var colorMap = new Map;
var nextColorCount = 0;

/**
 * Returns a consistent color for an object.
 *
 * If the object has been seen before, returns the same color.
 * Otherwise, assigns and returns a new color.
 *
 * @param {*} object - Any object/value to get a color for
 * @returns {string} A hex color string (e.g., "#8ae234")
 */
function pickColor(object) {
    let color = colorMap[object];
    if (color !== undefined) {
        return color;
    }
    color = nextColor();
    colorMap[object] = color;
    return color;
}

/**
 * Returns the next color in the sequence.
 *
 * Cycles through SEQUENCE_1, then SEQUENCE_2, then generates
 * interpolated colors for additional objects.
 *
 * @returns {string} A hex color string (e.g., "#8ae234")
 */
function nextColor() {
    let color;
    let colorIndex = nextColorCount % SEQUENCE_1.length;
    let shadeIndex = Math.floor(nextColorCount / SEQUENCE_1.length);

    if (shadeIndex === 0) {
        color = SEQUENCE_1[colorIndex];
    } else if (shadeIndex === 1) {
        color = SEQUENCE_2[colorIndex];
    } else {
        // Generate interpolated colors for additional items
        shadeIndex -= 3;
        let floorColor = SEQUENCE_2[colorIndex];
        let ceilColor = SEQUENCE_1[colorIndex];
        let base = Math.floor((shadeIndex / 2) + 1);
        let divisor = 2;
        while (base >= divisor) {
            divisor *= 2;
        }
        base = (base * 2) - divisor + 1;
        let shadePercentage = base / divisor;
        color = buildPercentageColor(floorColor, ceilColor, shadePercentage);
    }
    nextColorCount++;
    return "#" + color.toString(16);
}

/**
 * Interpolates between two colors.
 *
 * @param {number} floorColor - The starting color (as integer)
 * @param {number} ceilColor - The ending color (as integer)
 * @param {number} shadePercentage - How far to interpolate (0-1)
 * @returns {number} The interpolated color (as integer)
 */
function buildPercentageColor(floorColor, ceilColor, shadePercentage) {
    let red = (floorColor & 0xFF0000) + Math.floor(shadePercentage * ((ceilColor & 0xFF0000) - (floorColor & 0xFF0000))) & 0xFF0000;
    let green = (floorColor & 0x00FF00) + Math.floor(shadePercentage * ((ceilColor & 0x00FF00) - (floorColor & 0x00FF00))) & 0x00FF00;
    let blue = (floorColor & 0x0000FF) + Math.floor(shadePercentage * ((ceilColor & 0x0000FF) - (floorColor & 0x0000FF))) & 0x0000FF;
    return red | green | blue;
}


// =============================================================================
// CLIPBOARD UTILITY
// =============================================================================

/**
 * Copies text content to the clipboard.
 *
 * Used by the Guide tab to let users copy cURL commands.
 *
 * @param {string} elementId - The ID of the element containing text to copy
 */
function copyTextToClipboard(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(function() {
        console.log('Copied to clipboard: ' + text.substring(0, 50) + '...');
    }).catch(function(err) {
        console.error('Failed to copy text: ', err);
    });
}
