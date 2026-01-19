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
  const grade = formObject.grade; 
  const type = formObject.checkType; // Passed from the button click
  const notes = formObject.notes || "";
  
  // Use the calculated 24h time sent from frontend
  const timeString = formObject.manualTime; 
  
  // Use server time for Date (assuming check-in is for "today")
  const now = new Date();
  const dateString = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");

  // A. UPDATE STUDENT GRADE IF NEEDED
  updateStudentGrade(name, grade, studentSheet);

  // B. LOG DATA TO SINGLE TAB
  const targetSheet = ss.getSheetByName('Logs');
  
  // Appends: Name, Grade, Type (In/Out), Time, Date, Notes
  targetSheet.appendRow([name, grade, type, timeString, dateString, notes]);
  
  return { status: "SUCCESS", type: type };
}

function updateStudentGrade(name, newGrade, sheet) {
  const data = sheet.getDataRange().getValues();
  
  // Look for the student
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      if (String(data[i][1]) !== String(newGrade)) {
        sheet.getRange(i + 1, 2).setValue(newGrade);
      }
      return;
    }
  }
  
  sheet.appendRow([name, newGrade]);
}