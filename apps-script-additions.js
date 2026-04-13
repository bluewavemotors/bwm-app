// ─────────────────────────────────────────────────────────────────────────────
// APPS SCRIPT ADDITIONS — paste these into your existing Google Apps Script
// ─────────────────────────────────────────────────────────────────────────────
//
// SETUP:
//   1. Open your Apps Script (Extensions → Apps Script in your Google Sheet)
//   2. Add the doPost() function below (it does NOT exist in your current script)
//   3. Update your existing doGet() to handle the ?share= parameter (see below)
//   4. Re-deploy: Deploy → Manage Deployments → edit → "New version" → Deploy
//   5. A "Shares" sheet will be auto-created in your spreadsheet on first use
//
// ─────────────────────────────────────────────────────────────────────────────


// ── ADD THIS ENTIRE FUNCTION (new — you don't have doPost yet) ────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'createShare') {
      const ss          = SpreadsheetApp.getActiveSpreadsheet();
      const sharesSheet = ss.getSheetByName('Shares') || ss.insertSheet('Shares');

      // Add header row if sheet is brand new
      if (sharesSheet.getLastRow() === 0) {
        sharesSheet.appendRow(['shareId', 'carData', 'expiry', 'images', 'createdAt']);
      }

      // Generate a short unique ID
      const shareId = Utilities.getUuid().replace(/-/g, '').substring(0, 12);

      // Set 7-day expiry
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      sharesSheet.appendRow([
        shareId,
        JSON.stringify(data.car),
        expiry.toISOString(),
        JSON.stringify(data.images || []),
        new Date().toISOString()
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ shareId: shareId }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ error: 'unknown_action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ── UPDATE YOUR EXISTING doGet() — add this block at the TOP of your doGet ───
//
// Find your current doGet(e) function and insert the following block
// RIGHT AFTER the opening brace, before your existing inventory logic:
//
//   function doGet(e) {
//
//     // ▼ INSERT FROM HERE ─────────────────────────────────────────────────────
//     if (e.parameter && e.parameter.share) {
//       return handleShareLookup(e.parameter.share);
//     }
//     // ▲ INSERT TO HERE ────────────────────────────────────────────────────────
//
//     // ... your existing inventory code continues unchanged below ...
//   }


// ── ADD THIS HELPER FUNCTION alongside doPost ─────────────────────────────────
function handleShareLookup(shareId) {
  try {
    const ss          = SpreadsheetApp.getActiveSpreadsheet();
    const sharesSheet = ss.getSheetByName('Shares');

    if (!sharesSheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'not_found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const rows = sharesSheet.getDataRange().getValues();

    // Row 0 is the header; data starts at row 1
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === shareId) {
        const expiry = new Date(rows[i][2]);

        if (expiry < new Date()) {
          return ContentService
            .createTextOutput(JSON.stringify({ error: 'expired' }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService
          .createTextOutput(JSON.stringify({
            type   : 'share',
            car    : JSON.parse(rows[i][1]),
            images : JSON.parse(rows[i][3] || '[]')
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ error: 'not_found' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE SHEET COLUMN MAPPING REMINDER
// ─────────────────────────────────────────────────────────────────────────────
//
// Make sure your inventory sheet has an "images" column.
// The value should be comma-separated Google Drive file IDs, e.g.:
//   1A2B3C4D5E, 6F7G8H9I0J, ...
//
// Each Drive file must be shared: "Anyone with the link → Viewer"
//
// In your doGet() data mapping, add:
//   images: row[YOUR_IMAGES_COLUMN_INDEX]
//
// ─────────────────────────────────────────────────────────────────────────────
