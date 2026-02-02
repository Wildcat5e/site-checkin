// Injects all main JavaScript for Index.html
function includeJS() {
  return `
<script>
let studentDatabase = {};
let isTimeEdited = false; // Flag to stop auto-update if user types
let clockInterval;

window.onload = function() {
  refreshData();
  startClock(); // Start the live clock
  setInterval(refreshData, 30000);
};

function refreshData() {
  google.script.run.withSuccessHandler(populateStudents).getStudentList();
}

function populateStudents(data) {
  studentDatabase = data;
  console.log("Database updated: " + Object.keys(data).length + " students.");
}

// --- CLOCK LOGIC ---
// --- CLOCK & INACTIVITY LOGIC ---
let inactivityTimer;

function startClock() {
  updateTimeUI();
  clockInterval = setInterval(updateTimeUI, 1000);

  // Listen for activity to reset the timer
  document.onmousemove = resetInactivityTimer;
  document.onkeypress = resetInactivityTimer;
  document.onclick = resetInactivityTimer;
}

function updateTimeUI() {
  if (isTimeEdited) return;

  // Apply Grey Styling (Auto-Sync Mode)
  const hourBox = document.getElementById('timeHour');
  const minBox = document.getElementById('timeMin');
  const ampmBox = document.getElementById('timeAmPm');

  if (!hourBox.classList.contains('auto-sync')) {
    hourBox.classList.add('auto-sync');
    minBox.classList.add('auto-sync');
    ampmBox.classList.add('auto-sync');
  }

  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12;

  const minStr = minutes < 10 ? '0' + minutes : minutes;

  hourBox.value = hours;
  minBox.value = minStr;
  ampmBox.value = ampm;
}

// If user is idle for 60 seconds, re-sync to current time
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  // Only set the timer if the user has actually edited the time
  if (isTimeEdited) {
    inactivityTimer = setTimeout(reSyncClock, 60000); // 60,000 ms = 1 minute
  }
}

function reSyncClock() {
  isTimeEdited = false; // Allow auto-update again
  updateTimeUI(); // Force immediate update
  console.log("Inactivity detected: Clock re-synced.");
}

// Stop the clock if user clicks into any time field
// Stop the clock and turn text white if user interacts
function stopClock() {
  isTimeEdited = true;

  // Remove the grey styling
  document.getElementById('timeHour').classList.remove('auto-sync');
  document.getElementById('timeMin').classList.remove('auto-sync');
  document.getElementById('timeAmPm').classList.remove('auto-sync');

  resetInactivityTimer(); // Restart the 60s countdown
}

function autoFillGrade() {
  const name = document.getElementById('studentNameInput').value;
  const storedGrade = studentDatabase[name];
  if (storedGrade) {
    const radios = document.getElementsByName('grade');
    for (let r of radios) {
      if (r.value == storedGrade) r.checked = true;
    }
  }
}

// --- SUBMIT HANDLING ---

function triggerSubmit(type) {
  const form = document.getElementById('accessForm');

  // 1. Set Hidden Type Field
  document.getElementById('hiddenCheckType').value = type;

  // 2. Validate Inputs
  if (!form.grade.value) {
    alert("ERROR: Please select your Grade.");
    return;
  }

  const name = form.studentName.value;
  if (!name) {
    alert("ERROR: Please enter a name.");
    return;
  }

  if (!studentDatabase[name]) {
    const confirmNew = confirm("UNRECOGNIZED STUDENT: '" + name + "'.\n\nAdd this new user to the database?");
    if (!confirmNew) return;
  }

  const selectedGrade = form.grade.value;
  const storedGrade = studentDatabase[name];

  if (storedGrade && String(storedGrade) !== String(selectedGrade)) {
    const confirmChange = confirm("ALERT:\n\nGrade changing from '" + storedGrade + "' to '" + selectedGrade + "'.\n\nIs this correct?");
    if (!confirmChange) return;
  }

  // 3. Process Time to Backend Format (24h)
  const hh = parseInt(document.getElementById('timeHour').value);
  const mm = parseInt(document.getElementById('timeMin').value);
  const ampm = document.getElementById('timeAmPm').value;

  if (isNaN(hh) || isNaN(mm) || hh < 1 || hh > 12 || mm < 0 || mm > 59) {
     alert("Invalid Time Entered.");
     return;
  }

  // Convert to 24h string
  let hours24 = hh;
  if (ampm === "PM" && hh < 12) hours24 = hh + 12;
  if (ampm === "AM" && hh === 12) hours24 = 0;

  const mmStr = mm < 10 ? '0' + mm : mm;
  const hhStr = hours24 < 10 ? '0' + hours24 : hours24;

  const finalTimeStr = hhStr + ":" + mmStr;
  document.getElementById('hiddenManualTime').value = finalTimeStr;

  // 4. Send to Backend
  document.getElementById('loading').style.display = 'flex';
  google.script.run.withSuccessHandler(afterSubmit).processForm(form);
}

function afterSubmit(response) {
  refreshData();
  const msg = document.getElementById('statusMsg');

  if (response.type === "Check In") {
     msg.innerHTML = "ACCESS GRANTED.<br>WELCOME BACK.";
     msg.style.color = "var(--neon-green)";
  } else {
     msg.innerHTML = "SESSION ENDED.<br>SEE YOU NEXT TIME.";
     msg.style.color = "#ff0055";
  }

  setTimeout(() => {
    document.getElementById('accessForm').reset();
    document.getElementById('loading').style.display = 'none';
    msg.innerHTML = "PROCESSING...";
    msg.style.color = "white";

    // Restart the live clock for the next user
    isTimeEdited = false;
    updateTimeUI();
  }, 2000);
}

// --- DROPDOWN LOGIC (UNCHANGED) ---
function showSuggestions() {
  const input = document.getElementById('studentNameInput');
  const list = document.getElementById('suggestions');
  const query = input.value.toLowerCase();
  list.innerHTML = '';
  if (query.length === 0) { list.style.display = 'none'; return; }

  const allNames = Object.keys(studentDatabase);
  const startsWith = allNames.filter(name => name.toLowerCase().startsWith(query));
  startsWith.sort();
  const contains = allNames.filter(name =>
    name.toLowerCase().includes(query) && !name.toLowerCase().startsWith(query)
  );
  contains.sort();
  const matches = [...startsWith, ...contains];

  if (matches.length > 0) {
    list.style.display = 'block';
    matches.forEach(name => {
      const li = document.createElement('li');
      const regex = new RegExp(`(${query})`, 'gi');
      const highlightedName = name.replace(regex, '<strong>$1</strong>');
      li.innerHTML = highlightedName;
      li.onclick = () => {
        input.value = name;
        list.style.display = 'none';
        autoFillGrade();
      };
      list.appendChild(li);
    });
  } else {
    list.style.display = 'none';
  }
}

document.addEventListener('click', function(e) {
  const wrapper = document.querySelector('.input-wrapper');
  if (!wrapper.contains(e.target)) {
    document.getElementById('suggestions').style.display = 'none';
  }
});
</script>
`;
}
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