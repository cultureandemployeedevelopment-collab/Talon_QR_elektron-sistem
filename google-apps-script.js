 codex/fix-scanner-and-qr-code-updates-o8nd5s
const EMPLOYEES_FILE_ID = '1tJ_U_EtSF7YCjGahjKYn-w_TDgCuaPZL_tGMJ0ZFOdM';
const SCANNER_FILE_ID = '-1RAGc0WsyXO6A7fjyad_nJDiLqM22eYREccJdjie3TMw';
/**
 * GHG QR Scanner backend (Google Apps Script)
 */

const CONFIG = {
  sheets: {
    scanner: 'Scanner',
    names: 'Adlar',
    report: 'REPORT',
    rating: 'Yemək qiymətləndirməsi',
    idSheet: 'ID'
  },
  scannerStatus: {
    success: 'Təsdiqləndi',
    duplicate: 'Təkrar cəhd',
    error: 'Xəta'
  }
};
 main

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action ? e.parameter.action : '').trim();
    var callback = e && e.parameter ? e.parameter.callback : null;
    var result;

    if (action === 'login') {
 codex/fix-scanner-and-qr-code-updates-o8nd5s
      result = handleLogin(e);
    } else if (action === 'scanTicket') {
      result = handleScan(e.parameter.qrData);
    } else if (action === 'checkScanStatus') {
      result = handleCheckScanStatus(e);
    } else if (action === 'submitRating') {
      result = handleSubmitRating(e);
    } else if (action === 'getScannedNames') {
      result = handleGetScannedNames(e);
    } else {
      result = { status: 'error', message: 'Naməlum əməliyyat' };
    }

    return sendJSONP(result, callback);
  } catch (error) {
    return sendJSONP({ status: 'error', message: error.toString() }, e && e.parameter ? e.parameter.callback : null);
  }
}

function doPost(e) {
  return doGet(e);

      return jsonResponse_(login_(e), callback);
    }

    if (action === 'checkScanStatus') {
      return jsonResponse_(checkScanStatus_(e), callback);
    }

    if (action === 'scanTicket') {
      return jsonResponse_(scanTicket_(getParam_(e, 'qrData')), callback);
    }

    if (action === 'submitRating') {
      return jsonResponse_(submitRating_(e), callback);
    }

    if (action === 'getScannedNames') {
      return jsonResponse_(getScannedNames_(e), callback);
    }

    return jsonResponse_({ status: 'error', message: 'Unknown action' }, callback);
  } catch (err) {
    return jsonResponse_({ status: 'error', message: err.message }, callback);
  }
}

function login_(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const namesSheet = mustGetSheet_(ss, CONFIG.sheets.names);

  const employeeId = String(getParam_(e, 'id') || getParam_(e, 'employeeId') || '').trim();
  const pass = String(getParam_(e, 'pass') || getParam_(e, 'password') || '').trim();

  if (!employeeId || !pass) {
    return { status: 'error', message: 'ID və parol tələb olunur' };
  }

  const map = headerMap_(namesSheet);
  const idCol = findHeaderColumn_(map, ['id', 'əməkdaş id', 'emekdas id', 'employee id']);
  const nameCol = findHeaderColumn_(map, ['ad və soyad', 'ad soyad', 'full name', 'name']);
  const passCol = findHeaderColumn_(map, ['parol', 'password', 'şifrə', 'sifre']);

  if (!idCol) return { status: 'error', message: 'Adlar sheet-də ID sütunu tapılmadı' };

  const lastRow = namesSheet.getLastRow();
  if (lastRow < 2) return { status: 'error', message: 'İstifadəçi tapılmadı' };

  const values = namesSheet.getRange(2, 1, lastRow - 1, namesSheet.getLastColumn()).getValues();

  for (var i = 0; i < values.length; i++) {
    const row = values[i];
    if (String(row[idCol - 1] || '').trim() !== employeeId) continue;

    if (passCol) {
      const rowPass = String(row[passCol - 1] || '').trim();
      if (rowPass !== pass) {
        return { status: 'error', message: 'Parol yanlışdır' };
      }
    }

    return {
      status: 'success',
      employee: {
        id: employeeId,
        fullName: nameCol ? String(row[nameCol - 1] || '').trim() : 'İşçi'
      }
    };
  }

  return { status: 'error', message: 'İstifadəçi tapılmadı' };
 main
}

function sendJSONP(data, callback) {
  var json = JSON.stringify(data);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function getEmployeesSheet() {
  var ss = SpreadsheetApp.openById(EMPLOYEES_FILE_ID);
  return ss.getSheetByName('Cadvel1') || ss.getSheets()[0];
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

 codex/fix-scanner-and-qr-code-updates-o8nd5s
function normalizeDateKey(input) {
  return (input || '').toString().trim();
}

function todayDateKey_() {
  return Utilities.formatDate(new Date(), 'Asia/Baku', 'yyyyMMdd');
}

function parseQR(qrData) {
  var parts = (qrData || '').toString().split('|');
  // GHG|ID|TYPE_CODE|DATEKEY|HASH|TYPE_ID
  if (parts.length < 6 || parts[0] !== 'GHG') return null;

  const typeMap = { breakfast: 'Səhər Yeməyi', lunch: 'Günorta Yeməyi', dinner: 'Axşam Yeməyi', dry: 'Quru Talon' };
  const normalizedType = normalize_(typeMap[ticketType] || ticketType);

  const lastRow = scannerSheet.getLastRow();
  if (lastRow < 2) return { status: 'success', used: false };

  const values = scannerSheet.getRange(2, 1, lastRow - 1, scannerSheet.getLastColumn()).getValues();

  for (var i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    if (String(row[idCol - 1] || '').trim() !== employeeId) continue;

    if (dateKey_(row[dateCol - 1]) !== dateStr) continue;

    const rowType = normalize_(row[typeCol - 1]);
    const statusText = normalize_(row[statusCol - 1]);
    if (rowType === normalizedType && /təsdiq|tesdiq|istifadə/.test(statusText)) {
      return { status: 'success', used: true };
    }
  }
 main

  return {
    empId: (parts[1] || '').trim(),
    typeCode: (parts[2] || '').trim(),
    dateKey: (parts[3] || '').trim(),
    hash: (parts[4] || '').trim(),
    typeId: (parts[5] || '').trim(),
    raw: qrData
  };
}

 codex/fix-scanner-and-qr-code-updates-o8nd5s
function findEmployeeName(empId) {
  try {
    var sheet = getEmployeesSheet();
    if (!sheet) return 'Naməlum əməkdaş';

    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) return 'Naməlum əməkdaş';

    var idCol = 0;
    var nameCol = 1;

    var headers = data[0];
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i] || '').trim().toLowerCase();
      if (h === 'id' || h === 'i̇d') idCol = i;
      if (h === 'ad və soyad' || h === 'ad soyad' || h === 'ad') nameCol = i;
    }

    for (var r = 1; r < data.length; r++) {
      var rowId = data[r][idCol] ? data[r][idCol].toString().trim() : '';
      if (rowId === empId) {
        var rowName = data[r][nameCol] ? data[r][nameCol].toString().trim() : '';
        return rowName || 'Naməlum əməkdaş';
      }
    }

    return 'Naməlum əməkdaş';
  } catch (error) {
    return 'Naməlum əməkdaş';
  }
}

function handleLogin(e) {
  var id = e.parameter.id ? e.parameter.id.toString().trim() : (e.parameter.employeeId ? e.parameter.employeeId.toString().trim() : '');
  var pass = e.parameter.pass ? e.parameter.pass.toString().trim() : (e.parameter.password ? e.parameter.password.toString().trim() : '');

  try {
    var sheet = getEmployeesSheet();
    if (!sheet) return { status: 'error', message: 'Sheet tapılmadı' };

    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) return { status: 'not_found' };

    var headers = data[0];
    var idCol = 0;
    var passCol = 2;
    var nameCol = 1;

    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i] || '').trim().toLowerCase();
      if (h === 'id' || h === 'i̇d') idCol = i;
      if (h === 'parol' || h === 'password') passCol = i;
      if (h === 'ad və soyad' || h === 'ad soyad' || h === 'ad') nameCol = i;
    }

    for (var r = 1; r < data.length; r++) {
      var rowId = data[r][idCol] ? data[r][idCol].toString().trim() : '';
      var rowPass = data[r][passCol] ? data[r][passCol].toString().trim() : '';
      var rowName = data[r][nameCol] ? data[r][nameCol].toString().trim() : '';

      if (rowId === id) {
        if (rowPass === pass) {
          return {
            status: 'success',
            employee: { id: id, fullName: rowName }
          };
        }
        return { status: 'invalid_pass', message: 'Parol yanlışdır' };
      }
    }

    return { status: 'not_found', message: 'İstifadəçi tapılmadı' };
  } catch (error) {
    return { status: 'error', message: 'Xəta: ' + error.toString() };
  }
}

function handleScan(qrData) {
  if (!qrData) return { status: 'error', message: 'QR data boşdur' };

  var parsed = parseQR(qrData);
  if (!parsed) return { status: 'error', message: 'Yanlış QR formatı' };

  var empId = parsed.empId;
  var typeCode = parsed.typeCode;
  var typeId = parsed.typeId;
  var dateKey = parsed.dateKey;

  var todayKey = todayDateKey_();
  if (dateKey !== todayKey) {
    return {
      status: 'error',
      message: 'Bu QR yalnız öz günündə etibarlıdır',
      data: { empId: empId, qrDate: dateKey, today: todayKey }
    };
  }

  var typeNames = {
    S: 'Səhər Yeməyi',
    G: 'Günorta Yeməyi',
    A: 'Axşam Yeməyi',
    Q: 'Quru Talon'
  };
  var ticketType = typeNames[typeCode] || 'Naməlum';
  var adSoyad = findEmployeeName(empId);

  var alreadyScanned = false;
  try {
    var logSheet = getScannerSheet();
    var logData = logSheet.getDataRange().getValues();

    for (var i = 1; i < logData.length; i++) {
      var rowDateKey = logData[i][2] ? logData[i][2].toString().trim() : '';
      var rowEmpId = logData[i][3] ? logData[i][3].toString().trim() : '';
      var rowTypeId = logData[i][6] ? logData[i][6].toString().trim() : '';
      var rowStatus = logData[i][8] ? logData[i][8].toString().trim() : '';

      if (rowDateKey === dateKey && rowEmpId === empId && rowTypeId === typeId && rowStatus === 'Təsdiqləndi') {
        alreadyScanned = true;
        break;
      }
    }

    var status = alreadyScanned ? 'Təkrar skan' : 'Təsdiqləndi';
    var now = new Date();
    var todayStr = Utilities.formatDate(now, 'Asia/Baku', 'dd.MM.yyyy');
    var timeStr = Utilities.formatDate(now, 'Asia/Baku', 'HH:mm:ss');

    logSheet.appendRow([
      todayStr,
      timeStr,
      dateKey,
      empId,
      adSoyad,
      ticketType,
      typeId,
      qrData,
      status
    ]);
  } catch (error) {
    return { status: 'error', message: 'Yazma xətası: ' + error.toString() };
  }

  if (alreadyScanned) {
    return {
      status: 'warning',
      message: 'Bu talon artıq istifadə edilib',
      data: { empId: empId, adSoyad: adSoyad, ticketType: ticketType, qrData: qrData }

function submitRating_(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ratingSheet = getRatingSheet_(ss);

  const employeeId = String(getParam_(e, 'employeeId') || getParam_(e, 'id') || '').trim();
  const fullName = String(getParam_(e, 'fullName') || '').trim();
  const ratingText = String(getParam_(e, 'ratingText') || getParam_(e, 'reason') || '').trim();
  const ratingStars = Number(getParam_(e, 'ratingStars') || getParam_(e, 'rating') || 0);

  if (!employeeId) return { status: 'error', message: 'employeeId boşdur' };
  if (!ratingText) return { status: 'error', message: 'ratingText boşdur' };
  if (!ratingStars || ratingStars < 1 || ratingStars > 5) return { status: 'error', message: 'ratingStars 1-5 arası olmalıdır' };

  const map = headerMap_(ratingSheet);
  const idCol = findHeaderColumn_(map, ['id', 'əməkdaş id', 'emekdas id', 'employee id']);
  const nameCol = findHeaderColumn_(map, ['ad və soyad', 'ad soyad', 'full name']);
  const starsCol = findHeaderColumn_(map, ['ulduzla qiymətləndirmə', 'ulduzla qiymetlendirme']);
  const textCol = findHeaderColumn_(map, ['yemək qiymətləndirmə', 'yemek qiymetlendirme']);

  if (!idCol || !starsCol || !textCol) {
    return { status: 'error', message: 'Qiymətləndirmə sheet-də tələb olunan sütunlar tapılmadı' };
  }

  const rowIndex = findLatestRowByEmployeeInSheet_(ratingSheet, idCol, employeeId);
  const targetRow = rowIndex > 0 ? rowIndex : ratingSheet.getLastRow() + 1;

  ratingSheet.getRange(targetRow, idCol).setValue(employeeId);
  if (nameCol && fullName) ratingSheet.getRange(targetRow, nameCol).setValue(fullName);
  ratingSheet.getRange(targetRow, starsCol).setValue(ratingStars);
  ratingSheet.getRange(targetRow, textCol).setValue(ratingText);

  return {
    status: 'success',
    message: rowIndex > 0 ? 'Qiymətləndirmə yeniləndi' : 'Qiymətləndirmə əlavə edildi',
    rowIndex: targetRow
  };
}

function getScannedNames_(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scannerSheet = mustGetSheet_(ss, CONFIG.sheets.scanner);

  const dateStr = String(getParam_(e, 'date') || '').trim() || dateKey_(new Date());
  const map = headerMap_(scannerSheet);
  const dateCol = findHeaderColumn_(map, ['tarix', 'date']);
  const idCol = findHeaderColumn_(map, ['əməkdaş id', 'emekdas id', 'employee id', 'id']);
  const nameCol = findHeaderColumn_(map, ['ad və soyad', 'ad soyad', 'full name']);
  const typeCol = findHeaderColumn_(map, ['talon növü', 'ticket type', 'növ']);
  const statusCol = findHeaderColumn_(map, ['status', 'vəziyyət']);

  if (!dateCol || !idCol || !nameCol || !statusCol) {
    return { status: 'error', message: 'Scanner sütunları natamamdır', items: [] };
  }

  const lastRow = scannerSheet.getLastRow();
  if (lastRow < 2) return { status: 'success', items: [] };

  const values = scannerSheet.getRange(2, 1, lastRow - 1, scannerSheet.getLastColumn()).getValues();
  const items = [];

  for (var i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const statusText = normalize_(row[statusCol - 1]);
    if (!/təsdiq|tesdiq|istifadə/.test(statusText)) continue;
    if (dateKey_(row[dateCol - 1]) !== dateStr) continue;

    items.push({
      employeeId: String(row[idCol - 1] || '').trim(),
      fullName: String(row[nameCol - 1] || '').trim(),
      ticketType: typeCol ? String(row[typeCol - 1] || '').trim() : '',
      status: String(row[statusCol - 1] || '').trim()
    });
  }

  return { status: 'success', items: items };
}

function findLatestRowByEmployeeInSheet_(sheet, idCol, employeeId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (String(values[i][idCol - 1] || '').trim() === employeeId) return i + 2;
  }
  return 0;
}

function scanTicket_(qrData) {
  if (!qrData) {
    return { status: 'error', message: 'QR məlumatı boşdur' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scannerSheet = mustGetSheet_(ss, CONFIG.sheets.scanner);
  const namesSheet = mustGetSheet_(ss, CONFIG.sheets.names);
  const reportSheet = mustGetSheet_(ss, CONFIG.sheets.report);

  const now = new Date();
  const parsed = parseQr_(qrData);
  const reportRowData = findReportByQr_(reportSheet, qrData);

  const employeeId = reportRowData.empId || parsed.empId || '';
  const ticketType = reportRowData.ticketType || parsed.ticketType || 'Bilinməyən talon';
  const fullName = findNameById_(namesSheet, employeeId) || 'Bilinməyən əməkdaş';

  const alreadyUsed = isQrAlreadyUsed_(scannerSheet, qrData) || reportRowData.used;

  if (alreadyUsed) {
    appendScannerRow_(scannerSheet, {
      date: now,
      employeeId: employeeId,
      fullName: fullName,
      ticketType: ticketType,
      qrData: qrData,
      status: CONFIG.scannerStatus.duplicate
    });

    return {
      status: 'warning',
      message: 'Bu QR artıq istifadə edilib',
      data: { empId: employeeId, adSoyad: fullName, ticketType: ticketType, qrData: qrData }
 main
    };
  }

  return {
    status: 'success',
 codex/fix-scanner-and-qr-code-updates-o8nd5s
    message: 'Təsdiqləndi',
    data: { empId: empId, adSoyad: adSoyad, ticketType: ticketType, qrData: qrData }
  };
}

function handleCheckScanStatus(e) {
  var empId = e.parameter.id ? e.parameter.id.toString().trim() : '';
  var ticketType = e.parameter.ticketType ? e.parameter.ticketType.toString().trim() : '';
  var dateKey = normalizeDateKey(e.parameter.date);

  if (!empId || !ticketType || !dateKey) {
    return { status: 'error', used: false, message: 'Parametrlər natamamdır' };
  }

  try {
    var logSheet = getScannerSheet();
    var logData = logSheet.getDataRange().getValues();

    var used = false;
    for (var i = 1; i < logData.length; i++) {
      var rowDateKey = logData[i][2] ? logData[i][2].toString().trim() : '';
      var rowEmpId = logData[i][3] ? logData[i][3].toString().trim() : '';
      var rowTypeId = logData[i][6] ? logData[i][6].toString().trim() : '';
      var rowStatus = logData[i][8] ? logData[i][8].toString().trim() : '';

      if (rowDateKey === dateKey && rowEmpId === empId && rowTypeId === ticketType && rowStatus === 'Təsdiqləndi') {
        used = true;
        break;
      }
    }

    message: 'Talon təsdiqləndi',
    data: { empId: employeeId, adSoyad: fullName, ticketType: ticketType, qrData: qrData }
  };
}

function parseQr_(qrData) {
  const parts = String(qrData).split('|').map(function (x) { return x.trim(); });

  if (parts.length >= 3 && parts[0] === 'GHG') {
    const typeMap = { S: 'Səhər Yeməyi', G: 'Günorta Yeməyi', A: 'Axşam Yeməyi', Q: 'Quru Talon' };
    return { empId: parts[1] || '', ticketType: typeMap[parts[2]] || parts[2] || '' };
  }

  return { empId: '', ticketType: '' };
}

function findReportByQr_(sheet, qrData) {
  const map = headerMap_(sheet);
  const qrCol = findHeaderColumn_(map, ['talon id', 'qr', 'qr kod', 'kod']);
  const empCol = findHeaderColumn_(map, ['əməkdaş id', 'employee id', 'id']);
  const typeCol = findHeaderColumn_(map, ['talon növü', 'növ', 'ticket type']);
  const statusCol = findHeaderColumn_(map, ['status', 'vəziyyət']);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || !qrCol) return { rowIndex: 0, empId: '', ticketType: '', used: false };

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  for (var i = 0; i < values.length; i++) {
    const row = values[i];
    if (normalize_(row[qrCol - 1]) !== normalize_(qrData)) continue;

    const statusText = String(statusCol ? row[statusCol - 1] : '').toLowerCase();
    return {
      rowIndex: i + 2,
      empId: empCol ? String(row[empCol - 1]).trim() : '',
      ticketType: typeCol ? String(row[typeCol - 1]).trim() : '',
      used: /istifadə|tesdiq|təsdiq|used/.test(statusText)
    };
  }

  return { rowIndex: 0, empId: '', ticketType: '', used: false };
}

function markReportAsUsed_(sheet, rowIndex, now) {
  if (!rowIndex) return;

  const map = headerMap_(sheet);
  const statusCol = findHeaderColumn_(map, ['status', 'vəziyyət']);
  const usedDateCol = findHeaderColumn_(map, ['istifadə tarixi', 'used date', 'tarix']);
  const usedTimeCol = findHeaderColumn_(map, ['istifadə saatı', 'used time', 'saat']);

  if (statusCol) sheet.getRange(rowIndex, statusCol).setValue('İstifadə edildi');

  if (usedDateCol) {
    sheet.getRange(rowIndex, usedDateCol).setValue(now);
    sheet.getRange(rowIndex, usedDateCol).setNumberFormat('dd.MM.yyyy');
  }
 main

    return { status: 'success', used: used };
  } catch (error) {
    return { status: 'error', used: false, message: error.toString() };
  }
}

function handleGetScannedNames(e) {
  var dateKey = normalizeDateKey(e.parameter.date || todayDateKey_());

 codex/fix-scanner-and-qr-code-updates-o8nd5s
  try {
    var logSheet = getScannerSheet();
    var logData = logSheet.getDataRange().getValues();
    var items = [];

    for (var i = logData.length - 1; i >= 1; i--) {
      var rowDateKey = logData[i][2] ? logData[i][2].toString().trim() : '';
      var rowStatus = logData[i][8] ? logData[i][8].toString().trim() : '';
      if (rowDateKey !== dateKey || rowStatus !== 'Təsdiqləndi') continue;

      items.push({
        employeeId: logData[i][3] ? logData[i][3].toString().trim() : '',
        fullName: logData[i][4] ? logData[i][4].toString().trim() : '',
        ticketType: logData[i][5] ? logData[i][5].toString().trim() : '',
        status: rowStatus,
        time: logData[i][1] ? logData[i][1].toString().trim() : ''
      });
    }

  const values = scannerSheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const normalizedQr = normalize_(qrData);

  for (var i = 0; i < values.length; i++) {
    const qr = normalize_(values[i][5]);
    const status = String(values[i][6] || '').toLowerCase();
    if (qr === normalizedQr && /təsdiq|tesdiq|istifadə/.test(status)) return true;
  }

  return false;
}
 main

    return { status: 'success', items: items };
  } catch (error) {
    return { status: 'error', items: [], message: error.toString() };
  }
}

function handleSubmitRating(e) {
  var employeeId = (e.parameter.employeeId || e.parameter.id || '').toString().trim();
  var ratingStars = Number(e.parameter.ratingStars || e.parameter.rating || 0);
  var ratingText = (e.parameter.ratingText || e.parameter.reason || '').toString().trim();

  if (!employeeId) return { status: 'error', message: 'employeeId boşdur' };
  if (!ratingText) return { status: 'error', message: 'ratingText boşdur' };
  if (!ratingStars || ratingStars < 1 || ratingStars > 5) return { status: 'error', message: 'rating 1-5 olmalıdır' };

 codex/fix-scanner-and-qr-code-updates-o8nd5s
  try {
    var sheet = getEmployeesSheet();
    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) return { status: 'error', message: 'Cədvəl boşdur' };

    var headers = data[0];
    var idCol = 0;
    var starsCol = 2;
    var textCol = 3;

    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i] || '').trim().toLowerCase();
      if (h === 'id' || h === 'i̇d') idCol = i;
      if (h === 'ulduzla qiymətləndirmə' || h === 'ulduzla qiymetlendirme') starsCol = i;
      if (h === 'yemək qiymətləndirmə' || h === 'yemek qiymetlendirme' || h === 'yemək qiymətləndirməsi') textCol = i;
    }

    var foundRow = 0;
    for (var r = 1; r < data.length; r++) {
      var rowId = data[r][idCol] ? data[r][idCol].toString().trim() : '';
      if (rowId === employeeId) {
        foundRow = r + 1;
        break;
      }
    }

  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === idStr) return String(values[i][1]).trim();
  }

  return '';
}

function getRatingSheet_(ss) {
  return ss.getSheetByName(CONFIG.sheets.rating)
    || ss.getSheetByName('Yemək Qiymətləndirməsi')
    || ss.getSheetByName('Yemek qiymetlendirmesi')
    || ss.getSheetByName(CONFIG.sheets.idSheet)
    || mustGetSheet_(ss, CONFIG.sheets.rating);
}

function headerMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
 main

    if (!foundRow) return { status: 'error', message: 'ID tapılmadı' };

    sheet.getRange(foundRow, starsCol + 1).setValue(ratingStars);
    sheet.getRange(foundRow, textCol + 1).setValue(ratingText);

    return { status: 'success', message: 'Qiymətləndirmə yazıldı', rowIndex: foundRow };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
 codex/fix-scanner-and-qr-code-updates-o8nd5s

  return null;
}

function normalizeHeader_(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[ı]/g, 'i');
}

function normalize_(text) {
  return String(text || '').trim().toLowerCase();
}

function dateKey_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyyMMdd');
  }

  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyyMMdd');
  }

  const text = String(value).trim();
  const m = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return m[3] + ('0' + m[2]).slice(-2) + ('0' + m[1]).slice(-2);

  return '';
}

function mustGetSheet_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet tapılmadı: ' + sheetName);
  return sheet;
}

function getParam_(e, name) {
  return (e && e.parameter && e.parameter[name]) || '';
}

function jsonResponse_(payload, callback) {
  const text = callback ? callback + '(' + JSON.stringify(payload) + ')' : JSON.stringify(payload);

  return ContentService
    .createTextOutput(text)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
 main
}
