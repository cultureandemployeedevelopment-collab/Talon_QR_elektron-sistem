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

function doGet(e) {
  const callback = (e && e.parameter && e.parameter.callback) || null;

  try {
    const action = getParam_(e, 'action');

    if (action === 'login') {
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
}

function checkScanStatus_(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scannerSheet = mustGetSheet_(ss, CONFIG.sheets.scanner);

  const employeeId = String(getParam_(e, 'id') || '').trim();
  const ticketType = String(getParam_(e, 'ticketType') || '').trim();
  const dateStr = String(getParam_(e, 'date') || '').trim();

  if (!employeeId || !ticketType || !dateStr) {
    return { status: 'error', message: 'id, ticketType, date tələb olunur', used: false };
  }

  const map = headerMap_(scannerSheet);
  const idCol = findHeaderColumn_(map, ['əməkdaş id', 'emekdas id', 'employee id', 'id']);
  const typeCol = findHeaderColumn_(map, ['talon növü', 'ticket type', 'növ']);
  const dateCol = findHeaderColumn_(map, ['tarix', 'date']);
  const statusCol = findHeaderColumn_(map, ['status', 'vəziyyət']);

  if (!idCol || !typeCol || !dateCol || !statusCol) {
    return { status: 'error', message: 'Scanner sütunları natamamdır', used: false };
  }

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

  return { status: 'success', used: false };
}

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
    };
  }

  markReportAsUsed_(reportSheet, reportRowData.rowIndex, now);

  appendScannerRow_(scannerSheet, {
    date: now,
    employeeId: employeeId,
    fullName: fullName,
    ticketType: ticketType,
    qrData: qrData,
    status: CONFIG.scannerStatus.success
  });

  return {
    status: 'success',
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

  if (usedTimeCol) {
    sheet.getRange(rowIndex, usedTimeCol).setValue(now);
    sheet.getRange(rowIndex, usedTimeCol).setNumberFormat('HH:mm');
  }
}

function isQrAlreadyUsed_(scannerSheet, qrData) {
  const lastRow = scannerSheet.getLastRow();
  if (lastRow < 2) return false;

  const values = scannerSheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const normalizedQr = normalize_(qrData);

  for (var i = 0; i < values.length; i++) {
    const qr = normalize_(values[i][5]);
    const status = String(values[i][6] || '').toLowerCase();
    if (qr === normalizedQr && /təsdiq|tesdiq|istifadə/.test(status)) return true;
  }

  return false;
}

function appendScannerRow_(sheet, data) {
  sheet.appendRow([
    data.date,
    data.date,
    data.employeeId,
    data.fullName,
    data.ticketType,
    data.qrData,
    data.status
  ]);

  const row = sheet.getLastRow();
  sheet.getRange(row, 1).setNumberFormat('dd.MM.yyyy');
  sheet.getRange(row, 2).setNumberFormat('HH:mm');
}

function findNameById_(namesSheet, employeeId) {
  if (!employeeId) return '';

  const lastRow = namesSheet.getLastRow();
  if (lastRow < 2) return '';

  const values = namesSheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const idStr = String(employeeId).trim();

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

  for (var i = 0; i < headers.length; i++) {
    const key = normalizeHeader_(headers[i]);
    if (key) map[key] = i + 1;
  }

  return map;
}

function findHeaderColumn_(map, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    const key = normalizeHeader_(aliases[i]);
    if (map[key]) return map[key];
  }
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
}
