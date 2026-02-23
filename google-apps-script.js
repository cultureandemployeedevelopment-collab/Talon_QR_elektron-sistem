/**
 * GHG QR Scanner backend (Google Apps Script)
 *
 * Added action: submitRating
 * - Writes rating text + stars to Scanner sheet columns:
 *   "Yemək Qiymətləndirmə" and "Ulduzla qiymətləndirmə"
 */

const CONFIG = {
  sheets: {
    scanner: 'Scanner',
    names: 'Adlar',
 codex/duzlt-qeydiyyat-problemini-2p8g9u
    report: 'REPORT',
    idSheet: 'ID'

 codex/duzlt-qeydiyyat-problemini-cumj8p
    report: 'REPORT',
    idSheet: 'ID'

    report: 'REPORT'
 main
 main
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

 codex/duzlt-qeydiyyat-problemini-2p8g9u
    if (action === 'login') {
      const payload = login_(e);
      return jsonResponse_(payload, callback);
    }

    if (action === 'checkScanStatus') {
      const payload = checkScanStatus_(e);
      return jsonResponse_(payload, callback);
    }


 main
    if (action === 'scanTicket') {
      const qrData = getParam_(e, 'qrData');
      const payload = scanTicket_(qrData);
      return jsonResponse_(payload, callback);
    }

    if (action === 'submitRating') {
      const payload = submitRating_(e);
      return jsonResponse_(payload, callback);
    }

    return jsonResponse_({ status: 'error', message: 'Unknown action' }, callback);
  } catch (err) {
    return jsonResponse_({ status: 'error', message: err.message }, callback);
  }
}

 codex/duzlt-qeydiyyat-problemini-2p8g9u

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

  if (!idCol) {
    return { status: 'error', message: 'Adlar sheet-də ID sütunu tapılmadı' };
  }

  const lastRow = namesSheet.getLastRow();
  if (lastRow < 2) return { status: 'error', message: 'İstifadəçi tapılmadı' };

  const values = namesSheet.getRange(2, 1, lastRow - 1, namesSheet.getLastColumn()).getValues();

  for (var i = 0; i < values.length; i++) {
    const row = values[i];
    const rowId = String(row[idCol - 1] || '').trim();
    if (rowId !== employeeId) continue;

    if (passCol) {
      const rowPass = String(row[passCol - 1] || '').trim();
      if (rowPass !== pass) {
        return { status: 'error', message: 'Parol yanlışdır' };
      }
    }

    const fullName = nameCol ? String(row[nameCol - 1] || '').trim() : '';
    return {
      status: 'success',
      employee: {
        id: employeeId,
        fullName: fullName || 'İşçi'
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
    const rowId = String(row[idCol - 1] || '').trim();
    if (rowId !== employeeId) continue;

    const rowDateKey = dateKey_(row[dateCol - 1]);
    if (rowDateKey !== dateStr) continue;

    const rowType = normalize_(row[typeCol - 1]);
    const statusText = normalize_(row[statusCol - 1]);
    const isUsedStatus = /təsdiq|tesdiq|istifadə/.test(statusText);

    if (rowType === normalizedType && isUsedStatus) {
      return { status: 'success', used: true };
    }
  }

  return { status: 'success', used: false };
}

function submitRating_(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

function submitRating_(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
 codex/duzlt-qeydiyyat-problemini-cumj8p
 main
  const idSheet = mustGetSheet_(ss, CONFIG.sheets.idSheet);

  const employeeId = getParam_(e, 'employeeId') || getParam_(e, 'id');
  const fullName = getParam_(e, 'fullName');
  const ratingText = (getParam_(e, 'ratingText') || getParam_(e, 'reason') || '').trim();
  const ratingStars = Number(getParam_(e, 'ratingStars') || getParam_(e, 'rating') || 0);
  const now = new Date();

 codex/duzlt-qeydiyyat-problemini-2p8g9u

  const scannerSheet = mustGetSheet_(ss, CONFIG.sheets.scanner);

  const employeeId = getParam_(e, 'employeeId') || getParam_(e, 'id');
  const fullName = getParam_(e, 'fullName');
  const ticketType = getParam_(e, 'ticketType') || '';
  const qrData = getParam_(e, 'qrData') || '';
  const ratingText = (getParam_(e, 'ratingText') || getParam_(e, 'reason') || '').trim();
  const ratingStars = Number(getParam_(e, 'ratingStars') || getParam_(e, 'rating') || 0);
 main

 main
  if (!employeeId) {
    return { status: 'error', message: 'employeeId boşdur' };
  }
  if (!ratingText) {
    return { status: 'error', message: 'ratingText boşdur' };
  }
  if (!ratingStars || ratingStars < 1 || ratingStars > 5) {
    return { status: 'error', message: 'ratingStars 1-5 arası olmalıdır' };
  }

 codex/duzlt-qeydiyyat-problemini-2p8g9u

 codex/duzlt-qeydiyyat-problemini-cumj8p
 main
  const map = headerMap_(idSheet);
  const idCol = findHeaderColumn_(map, ['id', 'əməkdaş id', 'emekdas id', 'employee id']);
  const nameCol = findHeaderColumn_(map, ['ad və soyad', 'ad soyad', 'full name']);
  const textCol = findHeaderColumn_(map, ['yemək qiymətləndirmə', 'yemek qiymetlendirme']);
  const starsCol = findHeaderColumn_(map, ['ulduzla qiymətləndirmə', 'ulduzla qiymetlendirme']);
  const dateCol = findHeaderColumn_(map, ['qiymetlendirme tarixi', 'rating date', 'tarix']);

  if (!idCol || !textCol || !starsCol) {
    return { status: 'error', message: 'ID sheet-də tələb olunan sütunlar tapılmadı' };
  }

  const rowIndex = findLatestRowByEmployeeInSheet_(idSheet, idCol, String(employeeId).trim());

  if (rowIndex > 0) {
    idSheet.getRange(rowIndex, textCol).setValue(ratingText);
    idSheet.getRange(rowIndex, starsCol).setValue(ratingStars);
    if (dateCol) idSheet.getRange(rowIndex, dateCol).setValue(now);

    return {
      status: 'success',
      message: 'Qiymətləndirmə ID cədvəlində yeniləndi',
      rowIndex: rowIndex
    };
  }

  const newRow = idSheet.getLastRow() + 1;
  idSheet.getRange(newRow, idCol).setValue(String(employeeId).trim());
  if (nameCol && fullName) idSheet.getRange(newRow, nameCol).setValue(fullName);
  idSheet.getRange(newRow, textCol).setValue(ratingText);
  idSheet.getRange(newRow, starsCol).setValue(ratingStars);
  if (dateCol) idSheet.getRange(newRow, dateCol).setValue(now);

  return {
    status: 'success',
    message: 'Qiymətləndirmə ID cədvəlinə əlavə edildi',
 codex/duzlt-qeydiyyat-problemini-2p8g9u


  const map = headerMap_(scannerSheet);
  const ratingTextCol = findHeaderColumn_(map, ['yemək qiymətləndirmə', 'yemek qiymetlendirme']);
  const ratingStarsCol = findHeaderColumn_(map, ['ulduzla qiymətləndirmə', 'ulduzla qiymetlendirme', 'ulduz qiymeti']);

  if (!ratingTextCol || !ratingStarsCol) {
    return { status: 'error', message: 'Scanner sheet-də rating sütunları tapılmadı' };
  }

  const targetRow = findLatestScannerRowByEmployee_(scannerSheet, String(employeeId).trim());
  const now = new Date();

  if (targetRow > 0) {
    scannerSheet.getRange(targetRow, ratingTextCol).setValue(ratingText);
    scannerSheet.getRange(targetRow, ratingStarsCol).setValue(ratingStars);

    return {
      status: 'success',
      message: 'Qiymətləndirmə mövcud sətrə yazıldı',
      rowIndex: targetRow
    };
  }

  appendScannerRow_(scannerSheet, {
    date: now,
    employeeId: String(employeeId).trim(),
    fullName: fullName || 'Bilinməyən əməkdaş',
    ticketType: ticketType || 'Bilinməyən talon',
    qrData: qrData,
    status: 'Qiymətləndirmə'
  });

  const newRow = scannerSheet.getLastRow();
  scannerSheet.getRange(newRow, ratingTextCol).setValue(ratingText);
  scannerSheet.getRange(newRow, ratingStarsCol).setValue(ratingStars);

  return {
    status: 'success',
    message: 'Qiymətləndirmə yeni sətrə yazıldı',
 main
 main
    rowIndex: newRow
  };
}

 codex/duzlt-qeydiyyat-problemini-2p8g9u

function findLatestRowByEmployeeInSheet_(sheet, idCol, employeeId) {

 codex/duzlt-qeydiyyat-problemini-cumj8p

function findLatestRowByEmployeeInSheet_(sheet, idCol, employeeId) {

function findLatestScannerRowByEmployee_(sheet, employeeId) {
 main
 main
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const map = headerMap_(sheet);
 codex/duzlt-qeydiyyat-problemini-2p8g9u
  const dateCol = findHeaderColumn_(map, ['tarix', 'date', 'qiymetlendirme tarixi', 'rating date']);

 codex/duzlt-qeydiyyat-problemini-cumj8p
  const dateCol = findHeaderColumn_(map, ['tarix', 'date', 'qiymetlendirme tarixi', 'rating date']);

  const idCol = findHeaderColumn_(map, ['əməkdaş id', 'emekdas id', 'employee id', 'id']);
  if (!idCol) return 0;

  const dateCol = findHeaderColumn_(map, ['tarix', 'date']);
 main
 main
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  const today = new Date();
  const todayKey = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyyMMdd');

  let latestToday = 0;
  let latestAny = 0;

  for (var i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const rowEmployeeId = String(row[idCol - 1] || '').trim();
    if (rowEmployeeId !== employeeId) continue;

    const rowIndex = i + 2;
    if (!latestAny) latestAny = rowIndex;

    if (dateCol) {
      const rowDate = row[dateCol - 1];
      const rowKey = dateKey_(rowDate);
      if (rowKey && rowKey === todayKey) {
        latestToday = rowIndex;
        break;
      }
    }
  }

  return latestToday || latestAny || 0;
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
  if (m) {
    return m[3] + ('0' + m[2]).slice(-2) + ('0' + m[1]).slice(-2);
  }

  return '';
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
      data: {
        empId: employeeId,
        adSoyad: fullName,
        ticketType: ticketType,
        qrData: qrData
      }
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
    data: {
      empId: employeeId,
      adSoyad: fullName,
      ticketType: ticketType,
      qrData: qrData
    }
  };
}

function parseQr_(qrData) {
  const parts = String(qrData).split('|').map(function (x) { return x.trim(); });

  if (parts.length >= 3 && parts[0] === 'GHG') {
    const typeMap = { S: 'Səhər Yeməyi', G: 'Günorta Yeməyi', A: 'Axşam Yeməyi', Q: 'Quru Talon' };

    return {
      empId: parts[1] || '',
      ticketType: typeMap[parts[2]] || parts[2] || ''
    };
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
  if (lastRow < 2 || !qrCol) {
    return { rowIndex: 0, empId: '', ticketType: '', used: false, statusCol: statusCol };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  for (var i = 0; i < values.length; i++) {
    const row = values[i];
    const qr = normalize_(row[qrCol - 1]);

    if (qr === normalize_(qrData)) {
      const statusText = String(statusCol ? row[statusCol - 1] : '').toLowerCase();
      const used = /istifadə|tesdiq|təsdiq|used/.test(statusText);

      return {
        rowIndex: i + 2,
        empId: empCol ? String(row[empCol - 1]).trim() : '',
        ticketType: typeCol ? String(row[typeCol - 1]).trim() : '',
        used: used,
        statusCol: statusCol
      };
    }
  }

  return { rowIndex: 0, empId: '', ticketType: '', used: false, statusCol: statusCol };
}

function markReportAsUsed_(sheet, rowIndex, now) {
  if (!rowIndex) return;

  const map = headerMap_(sheet);
  const statusCol = findHeaderColumn_(map, ['status', 'vəziyyət']);
  const usedDateCol = findHeaderColumn_(map, ['istifadə tarixi', 'used date', 'tarix']);
  const usedTimeCol = findHeaderColumn_(map, ['istifadə saatı', 'used time', 'saat']);

  if (statusCol) {
    sheet.getRange(rowIndex, statusCol).setValue('İstifadə edildi');
  }

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

    if (qr === normalizedQr && /təsdiq|tesdiq|istifadə/.test(status)) {
      return true;
    }
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
    if (String(values[i][0]).trim() === idStr) {
      return String(values[i][1]).trim();
    }
  }

  return '';
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

function mustGetSheet_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet tapılmadı: ' + sheetName);
  return sheet;
}

function getParam_(e, name) {
  return (e && e.parameter && e.parameter[name]) || '';
}

function jsonResponse_(payload, callback) {
  const text = callback
    ? callback + '(' + JSON.stringify(payload) + ')'
    : JSON.stringify(payload);

  return ContentService
    .createTextOutput(text)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
