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
  const headers = data.shift(); // Remove headers
  
  // Create an object map: { "Adi Zaveri": 11, "John Doe": "" }
  let studentMap = {};
  data.forEach(row => {
    studentMap[row[0]] = row[1]; 
  });
  
  return studentMap;
}

/* 2. HANDLE FORM SUBMISSION */
function processForm(formObject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentSheet = ss.getSheetByName('Students');
  
  const name = formObject.studentName;
  const grade = formObject.grade; // comes in as string "9", "10"
  const type = formObject.checkType; // "Check In" or "Check Out"
  const notes = formObject.notes || "";
  
  const now = new Date();
  const timeString = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
  const dateString = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");

  // A. UPDATE STUDENT GRADE IF NEEDED
  // We use the 'updateGrade' flag sent from frontend, or check manually
  updateStudentGrade(name, grade, studentSheet);

  // B. LOG DATA TO CORRECT TAB
  let targetSheet;
  if (type === "Check In") {
    targetSheet = ss.getSheetByName('CheckIns');
  } else {
    targetSheet = ss.getSheetByName('CheckOuts');
  }
  
  targetSheet.appendRow([name, grade, timeString, dateString, notes]);
  
  return { status: "SUCCESS", type: type };
}

function updateStudentGrade(name, newGrade, sheet) {
  const data = sheet.getDataRange().getValues();
  
  // Look for the student
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      // If grade is different or empty, update it
      if (String(data[i][1]) !== String(newGrade)) {
        sheet.getRange(i + 1, 2).setValue(newGrade);
      }
      return;
    }
  }
  
  // If student doesn't exist in DB (shouldn't happen if using dropdown, but safety check)
  // Add them to the bottom
  sheet.appendRow([name, newGrade]);
}