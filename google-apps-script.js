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
    report: 'REPORT'
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

function submitRating_(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scannerSheet = mustGetSheet_(ss, CONFIG.sheets.scanner);

  const employeeId = getParam_(e, 'employeeId') || getParam_(e, 'id');
  const fullName = getParam_(e, 'fullName');
  const ticketType = getParam_(e, 'ticketType') || '';
  const qrData = getParam_(e, 'qrData') || '';
  const ratingText = (getParam_(e, 'ratingText') || getParam_(e, 'reason') || '').trim();
  const ratingStars = Number(getParam_(e, 'ratingStars') || getParam_(e, 'rating') || 0);

  if (!employeeId) {
    return { status: 'error', message: 'employeeId boşdur' };
  }
  if (!ratingText) {
    return { status: 'error', message: 'ratingText boşdur' };
  }
  if (!ratingStars || ratingStars < 1 || ratingStars > 5) {
    return { status: 'error', message: 'ratingStars 1-5 arası olmalıdır' };
  }

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
    rowIndex: newRow
  };
}

function findLatestScannerRowByEmployee_(sheet, employeeId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const map = headerMap_(sheet);
  const idCol = findHeaderColumn_(map, ['əməkdaş id', 'emekdas id', 'employee id', 'id']);
  if (!idCol) return 0;

  const dateCol = findHeaderColumn_(map, ['tarix', 'date']);
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
