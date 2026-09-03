// Apps Script backend for the Hugo & Carla RSVP form.
// Paste this whole file into Extensions -> Apps Script on the RSVP Google
// Sheet, replacing everything there, then Deploy -> Manage deployments ->
// edit the existing deployment -> Version: New version -> Deploy.
// (Keeps the same /exec URL, so nothing changes on the site.)
//
// Before deploying, run test_sendSampleEmails() once from this editor
// (function picker top bar -> Run) to trigger the Gmail-send permission
// prompt and to receive two sample emails at your own address.

var CONFIG = {
  brideEmail: 'sauro.lorenzo@icloud.com', // TODO: revert to sauro.carla@hotmail.com after testing
  senderName: 'Hugo & Carla',
  siteUrl: 'https://kvothe783.github.io/Wedding-Invitation-Page-Carla/'
};

var EVENTS = [
  {
    key: 'ceremonie',
    title: 'Mariage Hugo & Carla — Cérémonie',
    label: '15 h 30 — Cérémonie',
    address: '17 grand place, Roubaix 59100',
    // 14 May 2027, 15:30–16:30 Europe/Paris (CEST, UTC+2)
    startUtc: '20270514T133000Z',
    endUtc: '20270514T143000Z',
    startIso: '2027-05-14T13:30:00Z',
    endIso: '2027-05-14T14:30:00Z'
  },
  {
    key: 'vin-honneur',
    title: 'Mariage Hugo & Carla — Vin d’honneur',
    label: '17 h 00 — Vin d’honneur',
    address: 'Lauwestraat 59, 8560 Wevelgem, Belgique',
    // 14 May 2027, 17:00–20:00 Europe/Paris (CEST, UTC+2)
    startUtc: '20270514T150000Z',
    endUtc: '20270514T180000Z',
    startIso: '2027-05-14T15:00:00Z',
    endIso: '2027-05-14T18:00:00Z'
  }
];

var SHEET_HEADERS = ['date', 'nom', 'prenom', 'presence', 'nombre', 'email'];

function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  saveToSheet(d);

  try { sendGuestEmail(d); } catch (err) { Logger.log('sendGuestEmail failed: ' + err); }
  try { sendBrideEmail(d); } catch (err) { Logger.log('sendBrideEmail failed: ' + err); }

  return ContentService.createTextOutput('ok');
}

function saveToSheet(d) {
  var sheet = SpreadsheetApp.getActiveSheet();

  var firstRow = sheet.getRange(1, 1, 1, SHEET_HEADERS.length).getValues()[0];
  if (firstRow.join('') === '') {
    sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setValues([SHEET_HEADERS]);
  }

  var data = sheet.getDataRange().getValues();
  var nom = String(d.nom || '').trim().toLowerCase();
  var prenom = String(d.prenom || '').trim().toLowerCase();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    var rNom = String(data[i][1] || '').trim().toLowerCase();
    var rPrenom = String(data[i][2] || '').trim().toLowerCase();
    if (rNom === nom && rPrenom === prenom) { rowIndex = i + 1; break; }
  }

  var row = [d.date, d.nom, d.prenom, d.presence, d.nombre, d.email || ''];
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

// ---------- Emails ----------

function sendGuestEmail(d) {
  if (!d.email) return;

  var attending = d.presence === 'oui';
  var prenom = escapeHtml(d.prenom);
  var subject = attending
    ? 'Confirmation — Hugo & Carla, 14 mai 2027'
    : 'Votre réponse — Hugo & Carla';

  var body;
  var attachments = [];

  if (attending) {
    var progRows = EVENTS.map(function (ev) {
      return '<tr><td style="padding:10px 0;border-top:1px solid rgba(62,82,51,.15);">' +
        '<div style="font-size:16px;">' + ev.label + '</div>' +
        '<div style="font-size:13px;opacity:.8;">' + ev.address + '</div>' +
        '</td></tr>';
    }).join('');

    var icsContent = buildIcs(EVENTS);
    var icsDataUri = 'data:text/calendar;charset=utf-8;base64,' + Utilities.base64Encode(icsContent, Utilities.Charset.UTF_8);

    var perEventRows = EVENTS.map(function (ev) {
      return '<tr><td align="center" style="padding:12px 0;border-top:1px solid rgba(62,82,51,.15);">' +
        '<div style="font-size:13px;margin-bottom:10px;">' + ev.label + '</div>' +
        '<a href="' + gcalLink(ev) + '" style="display:inline-block;margin:0 6px;text-decoration:none;" title="Ajouter au Google Calendar">' +
        '<img src="' + iconDataUri(ICON_GCAL) + '" width="30" height="30" alt="Google Calendar" style="display:block;border-radius:6px;"></a>' +
        '<a href="' + outlookLink(ev) + '" style="display:inline-block;margin:0 6px;text-decoration:none;" title="Ajouter à Outlook">' +
        '<img src="' + iconDataUri(ICON_OUTLOOK) + '" width="30" height="30" alt="Outlook" style="display:block;border-radius:6px;"></a>' +
        '</td></tr>';
    }).join('');

    var countLine = d.nombre > 1 ? (' à ' + Number(d.nombre)) : '';

    body = emailShell(
      '<div style="font-family:Georgia,\'Apple Chancery\',\'Brush Script MT\',cursive;font-style:italic;font-size:34px;text-align:center;margin:0 0 18px;">Merci !</div>' +
      '<p style="font-size:15px;line-height:1.6;text-align:center;margin:0 0 26px;">Bonjour ' + prenom + ', nous avons bien noté votre présence' + countLine + '. À très bientôt !</p>' +
      '<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;text-align:center;opacity:.7;margin-bottom:2px;">Le programme</div>' +
      '<table width="100%" cellpadding="0" cellspacing="0" role="presentation">' + progRows + '</table>' +
      '<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;text-align:center;opacity:.7;margin:30px 0 14px;">Ajouter à mon calendrier</div>' +
      '<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">' +
      '<a href="' + icsDataUri + '" style="display:inline-block;background:#3E5233;color:#F8F7EF;text-decoration:none;padding:13px 20px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">' +
      '<img src="' + iconDataUri(ICON_PLUS) + '" width="15" height="15" alt="" style="vertical-align:middle;margin-right:8px;">Les 2 événements en un geste</a>' +
      '</td></tr></table>' +
      '<p style="font-size:12px;line-height:1.5;opacity:.65;text-align:center;margin:10px 0 22px;">Ouvre votre application calendrier (le fichier .ics est aussi joint à cet email) — Apple Calendar, Outlook et Google Calendar proposent alors d’ajouter les deux événements d’un coup.</p>' +
      '<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;opacity:.6;text-align:center;">Ou un par un</div>' +
      '<table width="100%" cellpadding="0" cellspacing="0" role="presentation">' + perEventRows + '</table>'
    );

    attachments.push(Utilities.newBlob(icsContent, 'text/calendar', 'mariage-hugo-carla.ics'));
  } else {
    body = emailShell(
      '<div style="font-family:Georgia,\'Apple Chancery\',\'Brush Script MT\',cursive;font-style:italic;font-size:30px;text-align:center;margin:0 0 18px;">Merci pour votre réponse</div>' +
      '<p style="font-size:15px;line-height:1.6;text-align:center;margin:0;">Bonjour ' + prenom + ', nous avons bien noté que vous ne pourrez pas être des nôtres. Vous nous manquerez !</p>'
    );
  }

  MailApp.sendEmail({
    to: d.email,
    subject: subject,
    htmlBody: body,
    name: CONFIG.senderName,
    replyTo: CONFIG.brideEmail,
    attachments: attachments
  });
}

function sendBrideEmail(d) {
  var attending = d.presence === 'oui';
  var nom = escapeHtml(d.nom);
  var prenom = escapeHtml(d.prenom);
  var email = escapeHtml(d.email);
  var subject = 'RSVP — ' + d.prenom + ' ' + d.nom + (attending ? ' (présent·e)' : ' (absent·e)');
  var receivedAt = Utilities.formatDate(d.date ? new Date(d.date) : new Date(), 'Europe/Paris', "d MMMM yyyy 'à' HH'h'mm");

  var rows = [
    ['Nom', nom],
    ['Prénom', prenom],
    ['Email', email],
    ['Réponse', attending ? 'Présent·e' : 'Absent·e']
  ];
  if (attending) rows.push(['Nombre de personnes', String(Number(d.nombre))]);
  rows.push(['Reçu le', receivedAt]);

  var rowsHtml = rows.map(function (r) {
    return '<tr>' +
      '<td style="padding:9px 0;border-top:1px solid rgba(62,82,51,.15);font-size:11px;letter-spacing:.1em;text-transform:uppercase;opacity:.7;width:45%;vertical-align:top;">' + r[0] + '</td>' +
      '<td style="padding:9px 0;border-top:1px solid rgba(62,82,51,.15);font-size:15px;">' + r[1] + '</td>' +
      '</tr>';
  }).join('');

  var body = emailShell(
    '<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;text-align:center;opacity:.7;margin-bottom:20px;">Nouvelle réponse RSVP</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0" role="presentation">' + rowsHtml + '</table>'
  );

  MailApp.sendEmail({
    to: CONFIG.brideEmail,
    subject: subject,
    htmlBody: body,
    name: CONFIG.senderName + ' — Site'
  });
}

function emailShell(innerHtml) {
  return '<div style="background:#F8F7EF;padding:32px 16px;font-family:Georgia,\'EB Garamond\',serif;color:#3E5233;">' +
    '<div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid rgba(62,82,51,.15);padding:36px 28px;">' +
    innerHtml +
    '<div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(62,82,51,.25);font-size:12px;letter-spacing:.08em;text-transform:uppercase;text-align:center;opacity:.7;">Hugo &amp; Carla — 14 mai 2027</div>' +
    '</div></div>';
}

// ---------- Icons ----------
// Small self-contained SVGs (no external hosting), evoking each calendar
// service without reproducing an official logo asset. Encoded to a data
// URI at send time.

var ICON_GCAL = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 36 36">' +
  '<rect x="2" y="4" width="32" height="30" rx="5" fill="#ffffff" stroke="#dadce0"/>' +
  '<path d="M2 9a5 5 0 0 1 5-5h22a5 5 0 0 1 5 5v4H2V9z" fill="#1a73e8"/>' +
  '<text x="18" y="28" font-family="Arial, sans-serif" font-size="15" text-anchor="middle" fill="#1a73e8" font-weight="700">31</text>' +
  '</svg>';

var ICON_OUTLOOK = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 36 36">' +
  '<rect x="2" y="2" width="32" height="32" rx="6" fill="#0a2767"/>' +
  '<rect x="16" y="7" width="15" height="22" rx="1.5" fill="#ffffff"/>' +
  '<rect x="16" y="7" width="15" height="6" fill="#0078d4"/>' +
  '<circle cx="13" cy="18" r="9.5" fill="#0078d4"/>' +
  '<text x="13" y="23" font-family="Arial, sans-serif" font-size="13" text-anchor="middle" fill="#ffffff" font-weight="700">O</text>' +
  '</svg>';

var ICON_PLUS = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24">' +
  '<rect x="3" y="4" width="18" height="17" rx="2" fill="none" stroke="#F8F7EF" stroke-width="1.6"/>' +
  '<line x1="3" y1="9" x2="21" y2="9" stroke="#F8F7EF" stroke-width="1.6"/>' +
  '<line x1="7" y1="2" x2="7" y2="6" stroke="#F8F7EF" stroke-width="1.6" stroke-linecap="round"/>' +
  '<line x1="17" y1="2" x2="17" y2="6" stroke="#F8F7EF" stroke-width="1.6" stroke-linecap="round"/>' +
  '<line x1="12" y1="12" x2="12" y2="18" stroke="#F8F7EF" stroke-width="1.6" stroke-linecap="round"/>' +
  '<line x1="9" y1="15" x2="15" y2="15" stroke="#F8F7EF" stroke-width="1.6" stroke-linecap="round"/>' +
  '</svg>';

function iconDataUri(svg) {
  return 'data:image/svg+xml;base64,' + Utilities.base64Encode(svg, Utilities.Charset.UTF_8);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- Calendar ----------

function buildIcs(events) {
  var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hugo & Carla//Mariage 2027//FR', 'CALSCALE:GREGORIAN'];
  var stamp = Utilities.formatDate(new Date(), 'Etc/UTC', "yyyyMMdd'T'HHmmss'Z'");
  events.forEach(function (ev) {
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + ev.key + '-hugo-carla-2027@' + CONFIG.siteUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, ''));
    lines.push('DTSTAMP:' + stamp);
    lines.push('DTSTART:' + ev.startUtc);
    lines.push('DTEND:' + ev.endUtc);
    lines.push('SUMMARY:' + icsEscape(ev.title));
    lines.push('LOCATION:' + icsEscape(ev.address));
    lines.push('DESCRIPTION:' + icsEscape('Mariage de Hugo & Carla — ' + ev.label));
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function icsEscape(s) {
  return String(s).replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
}

function gcalLink(ev) {
  return 'https://calendar.google.com/calendar/render?' + toQuery({
    action: 'TEMPLATE',
    text: ev.title,
    dates: ev.startUtc + '/' + ev.endUtc,
    details: 'Mariage de Hugo & Carla',
    location: ev.address
  });
}

function outlookLink(ev) {
  return 'https://outlook.live.com/calendar/0/deeplink/compose?' + toQuery({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: ev.title,
    startdt: ev.startIso,
    enddt: ev.endIso,
    location: ev.address,
    body: 'Mariage de Hugo & Carla'
  });
}

function toQuery(params) {
  return Object.keys(params).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
}

// ---------- Manual test helper ----------
// Select this function in the editor's function picker and click Run once.
// It triggers the Gmail-send permission prompt and sends two sample emails
// to your own Google account address so you can check the design.

function test_sendSampleEmails() {
  var me = Session.getActiveUser().getEmail() || CONFIG.brideEmail;
  var sampleYes = { nom: 'Dupont', prenom: 'Marie', email: me, presence: 'oui', nombre: 2, date: new Date().toISOString() };
  var sampleNo = { nom: 'Martin', prenom: 'Paul', email: me, presence: 'non', nombre: 0, date: new Date().toISOString() };
  sendGuestEmail(sampleYes);
  sendBrideEmail(sampleYes);
  sendGuestEmail(sampleNo);
  sendBrideEmail(sampleNo);
}
