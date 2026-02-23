const EMPLOYEES_FILE_ID = '1tJ_U_EtSF7YCjGahjKYn-w_TDgCuaPZL_tGMJ0ZFOdM';
const SCANNER_FILE_ID = '-1RAGc0WsyXO6A7fjyad_nJDiLqM22eYREccJdjie3TMw';

function doGet(e) {
  try {
    var action = getParam(e, 'action');
    var callback = getParam(e, 'callback');
    var result;

    if (action === 'login') {
      result = handleLogin(e);
    } else if (action === 'scanTicket') {
      result = handleScan(getParam(e, 'qrData'));
    } else if (action === 'checkScanStatus') {
      result = handleCheckScanStatus(e);
    } else if (action === 'submitRating') {
      result = handleSubmitRating(e);
    } else {
      result = { status: 'error', message: 'Naməlum əməliyyat' };
    }

    return sendJSONP(result, callback);
  } catch (error) {
    return sendJSONP({ status: 'error', message: String(error) }, getParam(e, 'callback'));
  }
}

function doPost(e) {
  return doGet(e);
}

function handleLogin(e) {
  var id = getParam(e, 'id') || getParam(e, 'employeeId');
  var pass = getParam(e, 'pass') || getParam(e, 'password');
  if (!id || !pass) return { status: 'error', message: 'ID və parol tələb olunur' };

  var sheet = getEmployeesSheet();
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return { status: 'not_found' };

  var cols = detectColumns(data[0]);
  if (cols.id < 0) return { status: 'error', message: 'ID sütunu tapılmadı' };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (val(row[cols.id]) !== id) continue;

    var rowPass = cols.pass >= 0 ? val(row[cols.pass]) : '';
    if (cols.pass >= 0 && rowPass !== pass) {
      return { status: 'invalid_pass', message: 'Parol yanlışdır' };
    }

    return {
      status: 'success',
      employee: {
        id: id,
        fullName: cols.name >= 0 ? val(row[cols.name]) : '',
        firstName: cols.firstName >= 0 ? val(row[cols.firstName]) : '',
        lastName: cols.lastName >= 0 ? val(row[cols.lastName]) : '',
        fatherName: cols.fatherName >= 0 ? val(row[cols.fatherName]) : ''
      }
    };
  }

  return { status: 'not_found', message: 'İstifadəçi tapılmadı' };
}

function handleSubmitRating(e) {
  var employeeId = getParam(e, 'employeeId') || getParam(e, 'id');
  var fullName = getParam(e, 'fullName');
  var ratingText = getParam(e, 'ratingText') || getParam(e, 'reason');
  var ratingStars = Number(getParam(e, 'ratingStars') || getParam(e, 'rating'));
  var dateKey = getParam(e, 'date') || todayDateKey();

  if (!employeeId) return { status: 'error', message: 'employeeId boşdur' };
  if (!ratingText) return { status: 'error', message: 'Səbəb boşdur' };
  if (!ratingStars || ratingStars < 1 || ratingStars > 5) return { status: 'error', message: 'Ulduz 1-5 arası olmalıdır' };

  var employeesSheet = getEmployeesSheet();
  var ratingSheet = getRatingSheet(employeesSheet.getParent());

  var employeeData = getEmployeeById(employeesSheet, employeeId);
  if (!fullName) fullName = employeeData.fullName || '';

  ensureRatingHeaders(ratingSheet);

  var map = buildHeaderMap(ratingSheet.getRange(1, 1, 1, ratingSheet.getLastColumn()).getValues()[0]);

  var targetRow = ratingSheet.getLastRow() + 1;

  setIfExists(ratingSheet, targetRow, map, ['id', 'əməkdaş id', 'employee id'], employeeId);
  setIfExists(ratingSheet, targetRow, map, ['ad və soyad', 'ad soyad', 'full name'], fullName);
  setIfExists(ratingSheet, targetRow, map, ['ad'], employeeData.firstName || '');
  setIfExists(ratingSheet, targetRow, map, ['soyad'], employeeData.lastName || '');
  setIfExists(ratingSheet, targetRow, map, ['ata adı', 'ata adi', 'father name'], employeeData.fatherName || '');
  setIfExists(ratingSheet, targetRow, map, ['ulduzla qiymətləndirmə', 'ulduzla qiymetlendirme'], ratingStars);
  setIfExists(ratingSheet, targetRow, map, ['yemək qiymətləndirmə', 'yemek qiymetlendirme'], ratingText);
  setIfExists(ratingSheet, targetRow, map, ['tarix', 'date', 'datekey'], dateKey);

  return { status: 'success', message: 'Qiymətləndirmə əlavə edildi' };
}

function handleScan(qrData) {
  if (!qrData) return { status: 'error', message: 'QR data boşdur' };
  var parsed = parseQR(qrData);
  if (!parsed) return { status: 'error', message: 'Yanlış QR formatı' };

  var todayKey = todayDateKey();
  if (parsed.dateKey !== todayKey) {
    return { status: 'error', message: 'Bu QR yalnız bu gün oxunur' };
  }

  var sheet = getScannerSheet();
  var data = sheet.getDataRange().getValues();
  var duplicate = false;

  for (var i = 1; i < data.length; i++) {
    if (val(data[i][2]) === parsed.dateKey && val(data[i][3]) === parsed.empId && val(data[i][6]) === parsed.typeId && val(data[i][8]) === 'Təsdiqləndi') {
      duplicate = true;
      break;
    }
  }

  var now = new Date();
  var statusText = duplicate ? 'Təkrar cəhd' : 'Təsdiqləndi';

  sheet.appendRow([
    Utilities.formatDate(now, 'Asia/Baku', 'dd.MM.yyyy'),
    Utilities.formatDate(now, 'Asia/Baku', 'HH:mm:ss'),
    parsed.dateKey,
    parsed.empId,
    getEmployeeById(getEmployeesSheet(), parsed.empId).fullName || 'Naməlum əməkdaş',
    typeName(parsed.typeCode),
    parsed.typeId,
    qrData,
    statusText
  ]);

  if (duplicate) return { status: 'warning', message: 'Təkrar cəhd', data: { status: statusText } };
  return { status: 'success', message: 'Təsdiqləndi', data: { status: statusText } };
}

function handleCheckScanStatus(e) {
  var empId = getParam(e, 'id');
  var ticketType = getParam(e, 'ticketType');
  var dateKey = getParam(e, 'date') || todayDateKey();
  if (!empId || !ticketType) return { status: 'error', used: false, message: 'Parametrlər natamamdır' };

  var sheet = getScannerSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (val(data[i][2]) === dateKey && val(data[i][3]) === empId && val(data[i][6]) === ticketType && val(data[i][8]) === 'Təsdiqləndi') {
      return { status: 'success', used: true };
    }
  }
  return { status: 'success', used: false };
}

function parseQR(qrData) {
  var parts = String(qrData || '').split('|');
  if (parts.length < 6 || parts[0] !== 'GHG') return null;
  return {
    empId: val(parts[1]),
    typeCode: val(parts[2]),
    dateKey: val(parts[3]),
    hash: val(parts[4]),
    typeId: val(parts[5])
  };
}

function getEmployeesSheet() {
  var ss = SpreadsheetApp.openById(EMPLOYEES_FILE_ID);
  return ss.getSheetByName('Cadvel1') || ss.getSheets()[0];
}

function getRatingSheet(ss) {
  return ss.getSheetByName('Yemək qiymətləndirməsi') || ss.getSheetByName('Yemek qiymetlendirmesi') || ss.getSheetByName('Cadvel1') || ss.getSheets()[0];
}

function getScannerSheet() {
  var ss = SpreadsheetApp.openById(SCANNER_FILE_ID);
  var sheet = ss.getSheetByName('Scanner');
  if (!sheet) {
    sheet = ss.insertSheet('Scanner');
    sheet.appendRow(['Tarix', 'Saat', 'DateKey', 'Əməkdaş ID', 'Ad Soyad', 'Talon Növü', 'TicketTypeId', 'Talon ID', 'Status']);
  }
  return sheet;
}

function ensureRatingHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['İD', 'Ad və Soyad', 'Ad', 'Soyad', 'Ata adı', 'Ulduzla qiymətləndirmə', 'Yemək Qiymətləndirmə', 'Tarix']);
    return;
  }

  var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  var required = ['İD', 'Ad və Soyad', 'Ad', 'Soyad', 'Ata adı', 'Ulduzla qiymətləndirmə', 'Yemək Qiymətləndirmə', 'Tarix'];
  var existingNorm = headers.map(function(h){ return normalize(h); });

  for (var i = 0; i < required.length; i++) {
    if (existingNorm.indexOf(normalize(required[i])) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(required[i]);
      existingNorm.push(normalize(required[i]));
    }
  }
}

function getEmployeeById(sheet, employeeId) {
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return { fullName: '', firstName: '', lastName: '', fatherName: '' };

  var cols = detectColumns(data[0]);
  for (var i = 1; i < data.length; i++) {
    if (val(data[i][cols.id]) === employeeId) {
      var fullName = cols.name >= 0 ? val(data[i][cols.name]) : '';
      var firstName = cols.firstName >= 0 ? val(data[i][cols.firstName]) : '';
      var lastName = cols.lastName >= 0 ? val(data[i][cols.lastName]) : '';
      var fatherName = cols.fatherName >= 0 ? val(data[i][cols.fatherName]) : '';

      if (!firstName || !lastName) {
        var parts = fullName.split(' ').filter(Boolean);
        if (!firstName && parts.length > 0) firstName = parts[0];
        if (!lastName && parts.length > 1) lastName = parts.slice(1).join(' ');
      }

      return { fullName: fullName, firstName: firstName, lastName: lastName, fatherName: fatherName };
    }
  }
  return { fullName: '', firstName: '', lastName: '', fatherName: '' };
}

function detectColumns(headerRow) {
  return {
    id: findColumn(headerRow, ['id', 'i̇d', 'əməkdaş id', 'employee id']),
    name: findColumn(headerRow, ['ad və soyad', 'ad soyad', 'full name']),
    firstName: findColumn(headerRow, ['ad', 'first name']),
    lastName: findColumn(headerRow, ['soyad', 'last name']),
    fatherName: findColumn(headerRow, ['ata adı', 'ata adi', 'father name']),
    pass: findColumn(headerRow, ['parol', 'password'])
  };
}

function findColumn(headers, aliases) {
  var normHeaders = headers.map(function(h){ return normalize(h); });
  for (var i = 0; i < aliases.length; i++) {
    var a = normalize(aliases[i]);
    for (var c = 0; c < normHeaders.length; c++) {
      if (normHeaders[c] === a || normHeaders[c].indexOf(a) !== -1 || a.indexOf(normHeaders[c]) !== -1) return c;
    }
  }
  return -1;
}

function buildHeaderMap(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    map[normalize(headers[i])] = i + 1;
  }
  return map;
}

function setIfExists(sheet, row, map, aliases, value) {
  for (var i = 0; i < aliases.length; i++) {
    var key = normalize(aliases[i]);
    if (map[key]) {
      sheet.getRange(row, map[key]).setValue(value);
      return true;
    }
  }
  return false;
}

function typeName(code) {
  var map = { S: 'Səhər Yeməyi', G: 'Günorta Yeməyi', A: 'Axşam Yeməyi', Q: 'Quru Talon' };
  return map[code] || 'Naməlum';
}

function normalize(t) {
  return String(t || '')
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

function todayDateKey() {
  return Utilities.formatDate(new Date(), 'Asia/Baku', 'yyyyMMdd');
}

function getParam(e, key) {
  if (!e || !e.parameter || typeof e.parameter[key] === 'undefined' || e.parameter[key] === null) return '';
  return String(e.parameter[key]).trim();
}

function val(v) {
  return String(v || '').trim();
}

function sendJSONP(data, callback) {
  var json = JSON.stringify(data);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
