const EMPLOYEES_FILE_ID = '1tJ_U_EtSF7YCjGahjKYn-w_TDgCuaPZL_tGMJ0ZFOdM';
const SCANNER_FILE_ID = '-1RAGc0WsyXO6A7fjyad_nJDiLqM22eYREccJdjie3TMw';

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action ? e.parameter.action : '').trim();
    var callback = e && e.parameter ? e.parameter.callback : null;
    var result;

    if (action === 'login') {
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

  return {
    empId: (parts[1] || '').trim(),
    typeCode: (parts[2] || '').trim(),
    dateKey: (parts[3] || '').trim(),
    hash: (parts[4] || '').trim(),
    typeId: (parts[5] || '').trim(),
    raw: qrData
  };
}

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
    };
  }

  return {
    status: 'success',
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

    return { status: 'success', used: used };
  } catch (error) {
    return { status: 'error', used: false, message: error.toString() };
  }
}

function handleGetScannedNames(e) {
  var dateKey = normalizeDateKey(e.parameter.date || todayDateKey_());

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

    if (!foundRow) return { status: 'error', message: 'ID tapılmadı' };

    sheet.getRange(foundRow, starsCol + 1).setValue(ratingStars);
    sheet.getRange(foundRow, textCol + 1).setValue(ratingText);

    return { status: 'success', message: 'Qiymətləndirmə yazıldı', rowIndex: foundRow };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}
