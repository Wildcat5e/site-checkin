function doGet() {
    return HtmlService.createTemplateFromFile("Index")
        .evaluate()
        .setTitle("Robotics Club Ops")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

// Standard HTML Service include function
// This allows content injection from other files into Index.html
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// SPREADSHEET COLUMN SETTINGS
// Update these numbers if columns are added or moved in the "Students" sheet (1 = A, 2 = B, ...)
// Note that Java constants are zero-indexed, while Google Sheets columns are 1-indexed.
const COL_NAME = 1;
const COL_GRADE = 2;
const COL_STATUS = 3;
const COL_LAST_IN = 4;
const COL_LAST_OUT = 5;
const COL_GRADE_CHANGED = 6;
const COL_DATE_ADDED = 7;

/** Get data for dropdown */
function getStudentList() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Students");

    // Handle empty sheet case
    if (!sheet || sheet.getLastRow() <= 1) return {};
    const data = sheet.getDataRange().getValues();

    // Remove headers
    if (data.length > 0) data.shift();
    let studentMap = {};

    data.forEach((row) => {
        const nameValue = row[COL_NAME - 1];
        const gradeValue = row[COL_GRADE - 1];

        if (nameValue) {
            const displayName = String(nameValue).trim();
            const normName = displayName.toLowerCase();

            studentMap[normName] = {
                displayName: displayName,
                grade: gradeValue
            };
        }
    });

    return studentMap;
}

/** Handle form submission */
function processForm(formObject) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const studentSheet = ss.getSheetByName("Students");
    const logsSheet = ss.getSheetByName("Logs");

    // Error handling for missing sheets
    if (!studentSheet || !logsSheet) {
        return { status: "ERROR", message: "Missing required sheet(s)." };
    }

    // Sanitize and normalize input
    let name = String(formObject.studentName || "").trim();
    let normName = name.toLowerCase();
    let grade = String(formObject.grade || "").trim();
    const type = String(formObject.checkType || "").trim(); // "Check In" or "Check Out"
    const notes = String(formObject.notes || "").trim();
    const timeString = String(formObject.manualTime || "").trim(); // HH:mm

    // Validate Grade
    if (!["9", "10", "11", "12"].includes(grade)) {
        return { status: "ERROR", message: "Invalid grade." };
    }
    // Validate Name
    if (!name) {
        return { status: "ERROR", message: "Name required." };
    }
    // Validate Time format (HH:mm)
    if (!/^\d{2}:\d{2}$/.test(timeString)) {
        return { status: "ERROR", message: "Invalid time format." };
    }
    const now = new Date();
    const dateString = Utilities.formatDate(
        now,
        Session.getScriptTimeZone(),
        "yyyy-MM-dd",
    );
    const timestamp = Utilities.formatDate(
        now,
        Session.getScriptTimeZone(),
        "yyyy-MM-dd HH:mm:ss",
    );
    // Update student record (Status, Last Seen, Grade, etc.)
    try {
        updateStudentRecord(studentSheet, name, grade, type, timestamp);
        // Log data to Logs tab
        logsSheet.appendRow([name, grade, type, timeString, dateString, notes]);
        return { status: "SUCCESS", type: type };
    } catch (e) {
        return { status: "ERROR", message: "Sheet operation failed: " + e.message };
    }
}

/** Core logic for updating Students sheet */
function updateStudentRecord(sheet, name, newGrade, type, timestamp) {
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let normName = String(name).trim().toLowerCase();

    // Find row (case-insensitive, trim)
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][COL_NAME - 1]).trim().toLowerCase() === normName) {
            rowIndex = i + 1; // Convert 0-index to sheet row number
            break;
        }
    }
    // If new student, add them
    if (rowIndex === -1) {
        // Defend against missing columns by ensuring newRow has enough elements
        let maxCol = Math.max(COL_NAME, COL_GRADE, COL_DATE_ADDED, sheet.getLastColumn());
        let newRow = new Array(maxCol).fill("");

        newRow[COL_NAME - 1] = name;
        newRow[COL_GRADE - 1] = newGrade;
        newRow[COL_DATE_ADDED - 1] = timestamp;

        sheet.appendRow(newRow);
        rowIndex = sheet.getLastRow(); // Get the new row number
    }

    // Check for grade change
    const gradeCell = sheet.getRange(rowIndex, COL_GRADE);
    const currentGrade = gradeCell.getValue();

    // Only update if Grade is different
    if (String(currentGrade) !== String(newGrade)) {
        gradeCell.setValue(newGrade);
        // Update "Grade Last Changed"
        sheet.getRange(rowIndex, COL_GRADE_CHANGED).setValue(timestamp);
    }

    // Update Status and Last Seen
    const statusCell = sheet.getRange(rowIndex, COL_STATUS);

    if (type === "Check In") {
        // Set Status text and color
        statusCell.setValue("Checked In").setBackground("#d9ead3"); // Light green
        // Update Last Check In
        sheet.getRange(rowIndex, COL_LAST_IN).setValue(timestamp);
    } else {
        // Set Status text and color
        statusCell.setValue("Checked Out").setBackground("#f4cccc"); // Light red
        // Update Last Check Out
        sheet.getRange(rowIndex, COL_LAST_OUT).setValue(timestamp);
    }
}
