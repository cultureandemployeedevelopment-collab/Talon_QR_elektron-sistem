// Bu Apps Script həm login (employees), həm də scanner axınlarını idarə edir.
var EMPLOYEES_FILE_ID = '1tJ_U_EtSF7YCjGahjKYn-w_TDgCuaPZL_tGMJ0ZFOdM';
var SCANNER_FILE_ID = '-1RAGc0WsyXO6A7fjyad_nJDiLqM22eYREccJdjie3TMw';

function doGet(e) {
  var callback = getParam_(e, 'callback');
  try {
    var action = getParam_(e, 'action');
    var result;

    if (action === 'login') {
      result = handleLogin_(e);
    } else if (action === 'scanTicket') {
      result = handleScan_(getParam_(e, 'qrData'));
    } else if (action === 'checkScanStatus') {
      result = handleCheckScanStatus_(e);
    } else if (action === 'submitRating') {
      result = handleSubmitRating_(e);
    } else {
      result = { status: 'error', message: 'Naməlum əməliyyat' };
    }

    return sendJSONP_(result, callback);
  } catch (err) {
    return sendJSONP_({ status: 'error', message: String(err) }, callback);
  }
}

function doPost(e) {
  return doGet(e);
}

function handleLogin_(e) {
  var id = getParam_(e, 'id') || getParam_(e, 'employeeId');
  var pass = getParam_(e, 'pass') || getParam_(e, 'password');

  if (!id || !pass) {
    return { status: 'error', message: 'ID və parol tələb olunur' };
  }

  var sheet = getEmployeesSheet_();
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) {
    return { status: 'not_found', message: 'İstifadəçi tapılmadı' };
  }

  var cols = detectColumns_(data[0]);
  if (cols.id < 0) {
    return { status: 'error', message: 'ID sütunu tapılmadı' };
  }

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (toText_(row[cols.id]) !== id) {
      continue;
    }

    if (cols.pass >= 0 && toText_(row[cols.pass]) !== pass) {
      return { status: 'invalid_pass', message: 'Parol yanlışdır' };
    }

    var fullName = cols.name >= 0 ? toText_(row[cols.name]) : '';
    var firstName = cols.firstName >= 0 ? toText_(row[cols.firstName]) : '';
    var lastName = cols.lastName >= 0 ? toText_(row[cols.lastName]) : '';
    var fatherName = cols.fatherName >= 0 ? toText_(row[cols.fatherName]) : '';

    return {
      status: 'success',
      employee: {
        id: id,
        fullName: buildFullName_(fullName, firstName, lastName, fatherName),
        firstName: firstName,
        lastName: lastName,
        fatherName: fatherName
      }
    };
  }

  return { status: 'not_found', message: 'İstifadəçi tapılmadı' };
}

function handleSubmitRating_(e) {
  var employeeId = getParam_(e, 'employeeId') || getParam_(e, 'id');
  var fullName = getParam_(e, 'fullName');
  var ratingText = getParam_(e, 'ratingText') || getParam_(e, 'reason');
  var ratingStars = Number(getParam_(e, 'ratingStars') || getParam_(e, 'rating'));

  if (!employeeId) {
    return { status: 'error', message: 'employeeId boşdur' };
  }
  if (!ratingText) {
    return { status: 'error', message: 'Səbəb boşdur' };
  }
  if (!ratingStars || ratingStars < 1 || ratingStars > 5) {
    return { status: 'error', message: 'Ulduz 1-5 arası olmalıdır' };
  }

  var employeesSheet = getEmployeesSheet_();
  var employeeData = findEmployeeById_(employeesSheet, employeeId);
  var displayName = fullName || employeeData.displayName;

  var ratingSheet = getOrCreateRatingSheet_(employeesSheet.getParent());
  ensureRatingHeaders_(ratingSheet);

  var headers = ratingSheet.getRange(1, 1, 1, Math.max(1, ratingSheet.getLastColumn())).getValues()[0];
  var map = headerMap_(headers);
  var row = ratingSheet.getLastRow() + 1;

  writeByAliases_(ratingSheet, row, map, ['id', 'i̇d', 'əməkdaş id', 'employee id'], employeeId);
  writeByAliases_(ratingSheet, row, map, ['ad və soyad', 'ad soyad', 'full name'], displayName);
  writeByAliases_(ratingSheet, row, map, ['ulduzla qiymətləndirmə', 'ulduzla qiymetlendirme', 'ulduz'], ratingStars);
  writeByAliases_(ratingSheet, row, map, ['yemək qiymətləndirmə', 'yemek qiymetlendirme', 'qiymətləndirmə mətni'], ratingText);

  return { status: 'success', message: 'Qiymətləndirmə əlavə edildi' };
}

function handleScan_(qrData) {
  if (!qrData) {
    return { status: 'error', message: 'QR data boşdur' };
  }

  var parsed = parseQR_(qrData);
  if (!parsed) {
    return { status: 'error', message: 'Yanlış QR formatı' };
  }

  if (parsed.dateKey !== todayDateKey_()) {
    return {
      status: 'error',
      speak: true,
      message: 'Bu QR bu günə aid deyil'
    };
  }

  var scannerSheet = getScannerSheet_();
  var rows = scannerSheet.getDataRange().getValues();
  var duplicate = false;

  for (var i = 1; i < rows.length; i++) {
    if (
      toText_(rows[i][2]) === parsed.dateKey &&
      toText_(rows[i][3]) === parsed.empId &&
      toText_(rows[i][6]) === parsed.typeId &&
      toText_(rows[i][8]) === 'Təsdiqləndi'
    ) {
      duplicate = true;
      break;
    }
  }

  var now = new Date();
  var statusText = duplicate ? 'Təkrar cəhd' : 'Təsdiqləndi';
  var employee = findEmployeeById_(getEmployeesSheet_(), parsed.empId);

  scannerSheet.appendRow([
    Utilities.formatDate(now, 'Asia/Baku', 'dd.MM.yyyy'),
    Utilities.formatDate(now, 'Asia/Baku', 'HH:mm:ss'),
    parsed.dateKey,
    parsed.empId,
    employee.displayName || 'Naməlum əməkdaş',
    ticketTypeName_(parsed.typeCode),
    parsed.typeId,
    qrData,
    statusText
  ]);

  if (duplicate) {
    return { status: 'warning', message: 'Təkrar cəhd' };
  }

  return { status: 'success', message: 'Təsdiqləndi' };
}

function handleCheckScanStatus_(e) {
  var empId = getParam_(e, 'id');
  var ticketType = getParam_(e, 'ticketType');
  var dateKey = getParam_(e, 'date') || todayDateKey_();

  if (!empId || !ticketType) {
    return { status: 'error', used: false, message: 'Parametrlər natamamdır' };
  }

  var scannerSheet = getScannerSheet_();
  var rows = scannerSheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (
      toText_(rows[i][2]) === dateKey &&
      toText_(rows[i][3]) === empId &&
      toText_(rows[i][6]) === ticketType &&
      toText_(rows[i][8]) === 'Təsdiqləndi'
    ) {
      return { status: 'success', used: true };
    }
  }

  return { status: 'success', used: false };
}

function parseQR_(qrData) {
  var parts = String(qrData || '').split('|');
  if (parts.length < 6 || parts[0] !== 'GHG') {
    return null;
  }

  return {
    empId: toText_(parts[1]),
    typeCode: toText_(parts[2]),
    dateKey: toText_(parts[3]),
    hash: toText_(parts[4]),
    typeId: toText_(parts[5])
  };
}

function getEmployeesSpreadsheet_() {
  return openSpreadsheetById_(EMPLOYEES_FILE_ID, 'Employees');
}

function getScannerSpreadsheet_() {
  return openSpreadsheetById_(SCANNER_FILE_ID, 'Scanner');
}

function openSpreadsheetById_(sheetId, label) {
  var id = toText_(sheetId);
  if (!id) {
    throw new Error(label + ' fayl ID-si təyin edilməyib');
  }

  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error(label + ' faylı tapılmadı və ya giriş icazəsi yoxdur (ID: ' + id + ')');
  }
}

function getEmployeesSheet_() {
  var preferredSheets = ['Cadvel1', 'Cədvəl1', 'Employees', 'Employee'];
  var candidates = [];

  // 1) Əsas employee faylını yoxla.
  try {
    candidates.push(getEmployeesSpreadsheet_());
  } catch (e) {
    // employee faylı açılmırsa fallback-lərə keç.
  }

  // 2) Bəzi quraşdırmalarda employee cədvəli scanner faylında saxlanılır.
  if (toText_(SCANNER_FILE_ID) && SCANNER_FILE_ID !== EMPLOYEES_FILE_ID) {
    try {
      candidates.push(getScannerSpreadsheet_());
    } catch (e) {
      // scanner faylı açılmasa belə digər fallback-lərlə davam et.
    }
  }

  // 3) Son fallback: bu scriptin bağlı olduğu aktiv spreadsheet.
  try {
    candidates.push(SpreadsheetApp.getActiveSpreadsheet());
  } catch (e) {
    // aktiv spreadsheet yoxdursa sadəcə mövcud namizədlərlə davam et.
  }

  for (var i = 0; i < candidates.length; i++) {
    var sheet = findSheetByNames_(candidates[i], preferredSheets);
    if (sheet) {
      return sheet;
    }
  }

  throw new Error('Employees cədvəli tapılmadı (Cadvel1/Cədvəl1/Employees)');
}

function getOrCreateRatingSheet_(ss) {
  var sheet = ss.getSheetByName('Yemək qiymətləndirməsi') || ss.getSheetByName('Yemek qiymetlendirmesi');
  if (!sheet) {
    sheet = ss.insertSheet('Yemək qiymətləndirməsi');
  }
  return sheet;
}

function getScannerSheet_() {
  var ss = getScannerSpreadsheet_();
  var sheet = ss.getSheetByName('Scanner');
  if (!sheet) {
    sheet = ss.insertSheet('Scanner');
    sheet.appendRow(['Tarix', 'Saat', 'DateKey', 'Əməkdaş ID', 'Ad Soyad Ata adı', 'Talon Növü', 'TicketTypeId', 'Talon ID', 'Status']);
  }
  return sheet;
}

function findSheetByNames_(ss, names) {
  if (!ss) return null;

  for (var i = 0; i < names.length; i++) {
    var byName = ss.getSheetByName(names[i]);
    if (byName) {
      return byName;
    }
  }

  return null;
}

function ensureRatingHeaders_(sheet) {
  var required = ['İD', 'Ad və Soyad', 'Ulduzla qiymətləndirmə', 'Yemək qiymətləndirmə'];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(required);
    return;
  }

  var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  var normalized = [];
  for (var i = 0; i < headers.length; i++) {
    normalized.push(normalize_(headers[i]));
  }

  for (var r = 0; r < required.length; r++) {
    var key = normalize_(required[r]);
    if (normalized.indexOf(key) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(required[r]);
      normalized.push(key);
    }
  }
}

function findEmployeeById_(sheet, employeeId) {
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) {
    return { displayName: '', fullName: '', firstName: '', lastName: '', fatherName: '' };
  }

  var cols = detectColumns_(data[0]);
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (cols.id < 0 || toText_(row[cols.id]) !== employeeId) {
      continue;
    }

    var fullName = cols.name >= 0 ? toText_(row[cols.name]) : '';
    var firstName = cols.firstName >= 0 ? toText_(row[cols.firstName]) : '';
    var lastName = cols.lastName >= 0 ? toText_(row[cols.lastName]) : '';
    var fatherName = cols.fatherName >= 0 ? toText_(row[cols.fatherName]) : '';

    return {
      displayName: buildFullName_(fullName, firstName, lastName, fatherName),
      fullName: fullName,
      firstName: firstName,
      lastName: lastName,
      fatherName: fatherName
    };
  }

  return { displayName: '', fullName: '', firstName: '', lastName: '', fatherName: '' };
}

function detectColumns_(headers) {
  return {
    id: findColumn_(headers, ['id', 'i̇d', 'əməkdaş id', 'employee id']),
    name: findColumn_(headers, ['ad və soyad', 'ad soyad', 'full name']),
    firstName: findColumn_(headers, ['ad', 'first name']),
    lastName: findColumn_(headers, ['soyad', 'last name']),
    fatherName: findColumn_(headers, ['ata adı', 'ata adi', 'father name']),
    pass: findColumn_(headers, ['parol', 'password'])
  };
}

function findColumn_(headers, aliases) {
  var normalizedHeaders = [];
  for (var i = 0; i < headers.length; i++) {
    normalizedHeaders.push(normalize_(headers[i]));
  }

  for (var a = 0; a < aliases.length; a++) {
    var alias = normalize_(aliases[a]);
    for (var c = 0; c < normalizedHeaders.length; c++) {
      if (normalizedHeaders[c] === alias || normalizedHeaders[c].indexOf(alias) !== -1 || alias.indexOf(normalizedHeaders[c]) !== -1) {
        return c;
      }
    }
  }
  return -1;
}

function headerMap_(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    map[normalize_(headers[i])] = i + 1;
  }
  return map;
}

function writeByAliases_(sheet, row, map, aliases, value) {
  for (var i = 0; i < aliases.length; i++) {
    var col = map[normalize_(aliases[i])];
    if (col) {
      sheet.getRange(row, col).setValue(value);
      return true;
    }
  }
  return false;
}

function buildFullName_(fullName, firstName, lastName, fatherName) {
  if (fullName) {
    return fullName;
  }

  var parts = [];
  if (firstName) parts.push(firstName);
  if (lastName) parts.push(lastName);
  if (fatherName) parts.push(fatherName + ' oğlu');

  return parts.join(' ').trim();
}

function ticketTypeName_(code) {
  var types = {
    S: 'Səhər Yeməyi',
    G: 'Günorta Yeməyi',
    A: 'Axşam Yeməyi',
    Q: 'Quru Talon'
  };
  return types[code] || 'Naməlum';
}

function normalize_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ə/g, 'e')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .trim();
}

function todayDateKey_() {
  return Utilities.formatDate(new Date(), 'Asia/Baku', 'yyyyMMdd');
}

function getParam_(e, key) {
  if (!e || !e.parameter || e.parameter[key] === undefined || e.parameter[key] === null) {
    return '';
  }
  return String(e.parameter[key]).trim();
}

function toText_(value) {
  return String(value || '').trim();
}

function sendJSONP_(payload, callback) {
  var text = JSON.stringify(payload);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + text + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text)
    .setMimeType(ContentService.MimeType.JSON);
}
