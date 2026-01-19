function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Robotics Club Ops')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* 1. GET DATA FOR DROPDOWN */
function getStudentList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Students');
  const data = sheet.getDataRange().getValues();
  
  // Remove headers
  if (data.length > 0) data.shift();
  
  let studentMap = {};
  data.forEach(row => {
    // Name is Col A (index 0), Grade is Col B (index 1)
    if (row[0]) { 
      studentMap[row[0]] = row[1]; 
    }
  });
  
  return studentMap;
}

/* 2. HANDLE FORM SUBMISSION */
function processForm(formObject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentSheet = ss.getSheetByName('Students');
  const logsSheet = ss.getSheetByName('Logs');
  
  const name = formObject.studentName;
  const grade = formObject.grade; 
  const type = formObject.checkType; // "Check In" or "Check Out"
  const notes = formObject.notes || "";
  const timeString = formObject.manualTime; // HH:mm
  
  const now = new Date();
  const dateString = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  // A. UPDATE STUDENT RECORD (Status, Last Seen, Grade, etc.)
  updateStudentRecord(studentSheet, name, grade, type, timestamp);

  // B. LOG DATA TO LOGS TAB
  // Logs: Name, Grade, Type, Time, Date, Notes
  logsSheet.appendRow([name, grade, type, timeString, dateString, notes]);
  
  return { status: "SUCCESS", type: type };
}

/* 3. CORE LOGIC FOR UPDATING STUDENTS SHEET */
function updateStudentRecord(sheet, name, newGrade, type, timestamp) {
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  // 1. FIND ROW
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      rowIndex = i + 1; // Convert 0-index to Sheet Row Number
      break;
    }
  }

  // 2. IF NEW STUDENT (Add them)
  if (rowIndex === -1) {
    // Append: Name, Grade, Status(empty), LastIn(empty), LastOut(empty), GradeChanged(empty), DateAdded
    sheet.appendRow([name, newGrade, "", "", "", "", timestamp]);
    rowIndex = sheet.getLastRow(); // Get the new row number
  }

  // 3. CHECK FOR GRADE CHANGE (Col B -> Column 2)
  // We grab the specific cell to check current value
  const gradeCell = sheet.getRange(rowIndex, 2);
  const currentGrade = gradeCell.getValue();
  
  // Only update if grade is different AND it's not a brand new user (handled above)
  // (If new user, currentGrade matches newGrade because we just wrote it, so this skips)
  if (String(currentGrade) !== String(newGrade)) {
    gradeCell.setValue(newGrade);
    // Update "Grade Last Changed" (Col F -> Column 6)
    sheet.getRange(rowIndex, 6).setValue(timestamp);
  }

  // 4. UPDATE STATUS & LAST SEEN
  const statusCell = sheet.getRange(rowIndex, 3); // Col C
  
  if (type === "Check In") {
    // Set Status Text & Color
    statusCell.setValue("Checked In").setBackground("#d9ead3"); // Light Green
    // Update Last Check In (Col D -> Column 4)
    sheet.getRange(rowIndex, 4).setValue(timestamp);
  } else {
    // Set Status Text & Color
    statusCell.setValue("Checked Out").setBackground("#f4cccc"); // Light Red
    // Update Last Check Out (Col E -> Column 5)
    sheet.getRange(rowIndex, 5).setValue(timestamp);
  }
}