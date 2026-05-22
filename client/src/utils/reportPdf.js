import jsPDF from "jspdf";
import { MEDICAL_DISCLAIMER } from "./clinicalRisk";

const BODY_FONT_SIZE = 10;
const BODY_LINE_HEIGHT = 13;
const TITLE_LINE_HEIGHT = 14;

const formatDateTime = (value) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
};

const getText = (t, fallback = "") => (t == null ? fallback : String(t));

const ensureSpace = (doc, y, needed, pageBottom = 90) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - pageBottom) {
    doc.addPage();
    return 60;
  }
  return y;
};

/**
 * Reset jsPDF typography before every text draw — never inherit stretched spacing.
 */
const resetPdfTypography = (doc, { bold = false, fontSize = BODY_FONT_SIZE } = {}) => {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  if (typeof doc.setCharSpace === "function") doc.setCharSpace(0);
  if (typeof doc.setLineHeightFactor === "function") doc.setLineHeightFactor(1.2);
};

/**
 * Draw text with typography reset. Never pass maxWidth — lines must be pre-wrapped.
 */
const pdfText = (doc, text, x, y, options = {}) => {
  resetPdfTypography(doc, {
    bold: options.bold,
    fontSize: options.fontSize ?? BODY_FONT_SIZE,
  });
  doc.text(String(text), x, y);
};

/**
 * Draw pre-wrapped lines (from splitTextToSize) without maxWidth justification.
 */
const pdfTextLines = (doc, lines, x, y, lineHeight = BODY_LINE_HEIGHT, options = {}) => {
  const rows = Array.isArray(lines) ? lines : [String(lines)];
  let cursorY = y;
  rows.forEach((line) => {
    pdfText(doc, line, x, cursorY, options);
    cursorY += lineHeight;
  });
  return cursorY;
};

const dedupeConsecutiveWords = (input) => {
  let s = String(input);
  let prev;
  do {
    prev = s;
    s = s.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");
  } while (s !== prev);
  return s;
};

/**
 * Strong medical text sanitizer — safe cleanup only, no letter-spacing manipulation.
 */
const sanitizeMedicalText = (input) => {
  if (input == null) return "";
  let s = String(input).normalize("NFKC");

  s = s.replace(/[\u200B-\u200F\uFEFF\u2060-\u206F\u00AD]/g, "");
  s = s.replace(/[\u2000-\u200A\u202F\u205F\u3000]/g, " ");

  s = s
    .replace(/[""«»„‟]/g, '"')
    .replace(/[''‚‛`´]/g, "'")
    .replace(/[''`´]+/g, "'");

  s = s.replace(/[!！]+/g, "");
  s = s.replace(/[·•]+/g, " ");
  s = s.replace(/\s+/g, " ");

  s = s.replace(/[\u2012\u2013\u2014\u2015\-–—]+/g, " — ");
  s = s.replace(/\s*—\s*/g, " — ");
  s = s.replace(/\s*→\s*/g, " — ");

  s = s.replace(
    /\bWHO(?:\s+(?:EMERGENCY\s+)?WARNING(?:\s+SIGN)?(?:\s*\([^)]*\))?)+/gi,
    "WHO warning sign"
  );
  s = s.replace(
    /(?:\bWHO warning sign\b\s*){2,}/gi,
    "WHO warning sign"
  );

  s = s.replace(/\blow\s+low\b/gi, "low");
  s = s.replace(/\bLow\s+Low\b/g, "Low");
  s = s.replace(/\blow\s+specificity\b/gi, "low-specificity");

  s = dedupeConsecutiveWords(s);

  s = s.replace(/\s+([,;:.])/g, "$1");
  s = s.replace(/\s{2,}/g, " ");
  s = s.trim();

  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Format engine explanation strings into compact hospital-style bullet lines.
 */
const formatContributingFactor = (raw) => {
  let s = sanitizeMedicalText(raw);
  if (!s) return "";

  const segments = s.split(/\s+—\s+/);
  let label = (segments[0] || "").trim();
  let detail = segments.slice(1).join(" — ").trim();

  if (/^fever\b/i.test(label)) {
    const tempMatch = label.match(/fever\s*([\d.]+\s*°?\s*c?)/i);
    label = tempMatch ? `Fever ${tempMatch[1].replace(/\s+/g, "")}` : "Fever";
  } else if (label.length > 0) {
    label = label.charAt(0).toUpperCase() + label.slice(1);
  }

  if (detail) {
    detail = detail
      .replace(/low-specificity viral symptom.*/i, "low-specificity viral symptom")
      .replace(/temperature severity factor.*/i, "temperature severity factor")
      .replace(/WHO CRITICAL PHASE WINDOW.*/i, "WHO critical phase window")
      .replace(/non-critical phase.*/i, "non-critical phase")
      .replace(/WHO EMERGENCY WARNING SIGN.*/i, "WHO warning sign")
      .replace(/severe dengue progression indicator.*/i, "severe dengue progression indicator")
      .replace(/dengue-specific thrombocytopenia.*/i, "dengue-associated thrombocytopenia")
      .replace(/\(also seen in[^)]*\)/gi, "")
      .replace(/\(dengue typically[^)]*\)/gi, "")
      .trim();

    detail = sanitizeMedicalText(detail);
    if (/thrombocytopenia|platelet/i.test(detail) && !/^low platelet/i.test(label)) {
      return "Low platelet count — dengue-associated thrombocytopenia";
    }
    if (/WHO\s*warning/i.test(detail) || /emergency warning/i.test(detail)) {
      detail = "WHO warning sign";
    }
    if (detail) return `${label} — ${detail}`;
  }

  return label;
};

const sanitizeRecommendationLine = (raw) => {
  let s = sanitizeMedicalText(raw);
  if (!s) return "";

  s = s.replace(
    /laboratory confirmation[^:]*:\s*/i,
    ""
  );

  if (/cbc|platelet|ns1|rapid dengue/i.test(s)) {
    return "Laboratory confirmation: CBC, platelet count, NS1 test, or rapid dengue test";
  }

  return s;
};

const splitByWidth = (doc, text, width) => {
  resetPdfTypography(doc);
  const raw = sanitizeMedicalText(getText(text, "N/A"));
  return doc.splitTextToSize(raw, Math.max(40, width));
};

const prepareBulletItems = (items, fallback, formatter = sanitizeMedicalText) => {
  const candidateItems = Array.isArray(items) && items.length ? items : [fallback];
  const seen = new Set();
  return candidateItems
    .map(formatter)
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const addBulletListParagraph = (doc, y, left, right, label, items, fallback, formatter) => {
  const boxPad = 10;
  const contentWidth = right - left - boxPad * 2;
  const bulletIndent = 10;
  const continuationIndent = 14;
  const lineHeight = BODY_LINE_HEIGHT;
  const paragraphSpacing = 6;

  const listItems = prepareBulletItems(items, fallback, formatter);

  const wrappedItems = listItems.map((item) => {
    const lines = splitByWidth(doc, item, contentWidth - bulletIndent - continuationIndent);
    return Array.isArray(lines) ? lines : [String(lines)];
  });

  const totalLines = wrappedItems.reduce((count, lines) => count + lines.length, 0);
  const boxHeight = Math.max(48, totalLines * lineHeight + paragraphSpacing * listItems.length + 22);

  y = ensureSpace(doc, y, boxHeight + 10);

  doc.setDrawColor(148, 163, 184);
  doc.setFillColor(247, 250, 252);
  doc.roundedRect(left, y, right - left, boxHeight, 4, 4, "FD");

  resetPdfTypography(doc, { bold: true, fontSize: BODY_FONT_SIZE });
  doc.setTextColor(30, 41, 59);
  pdfText(doc, label, left + boxPad, y + 14, { bold: true });

  resetPdfTypography(doc);
  doc.setTextColor(51, 65, 85);

  let contentY = y + 30;
  wrappedItems.forEach((itemLines) => {
    itemLines.forEach((line, index) => {
      const x = left + boxPad + (index === 0 ? 0 : continuationIndent);
      const text = index === 0 ? `• ${line}` : line;
      pdfText(doc, text, x, contentY);
      contentY += lineHeight;
    });
    contentY += paragraphSpacing;
  });

  return y + boxHeight + 10;
};

const drawSectionHeader = (doc, y, title, left = 36, right = 559, color = [37, 99, 235]) => {
  const barHeight = 18;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(left, y, right - left, barHeight, 3, 3, "F");
  resetPdfTypography(doc, { bold: true, fontSize: BODY_FONT_SIZE });
  doc.setTextColor(255, 255, 255);
  pdfText(doc, title, left + 8, y + 12, { bold: true });
  return y + barHeight + 10;
};

const extractReportSections = (report) => {
  const reportText = report?.reportText || "";
  const clean = String(reportText)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const lines = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = {
    "Clinical Assessment": report?.summary || "Assessment summary not available.",
    "Detected WHO Warning Signs":
      (Array.isArray(report?.detectedWarnings) ? report.detectedWarnings : report?.symptoms || [])
        .map(sanitizeMedicalText)
        .filter(Boolean)
        .join("; ") || "None reported.",
    "Risk Estimate": Number.isFinite(report?.riskScore)
      ? `${report.riskScore}/100 — ${report.severityLabel || report.riskLevel}`
      : "Not available",
    "Clinical Recommendation":
      (Array.isArray(report?.recommendations) ? report.recommendations : [])
        .map(sanitizeRecommendationLine)
        .filter(Boolean)
        .join("; ") ||
      "Maintain hydration and monitor symptoms daily.",
    "WHO Management Guidance":
      sanitizeMedicalText(report?.whoGuidance) ||
      "Continue hydration. Seek immediate care if warning signs develop.",
    "Emergency Advisory":
      sanitizeMedicalText(report?.emergencyAdvice) ||
      "Seek urgent hospital care for: persistent vomiting, abdominal pain, bleeding, or drowsiness.",
  };

  for (const line of lines) {
    const [label, ...rest] = line.split(":");
    const content = rest.join(":").trim();
    if (sections[label] && content) sections[label] = sanitizeMedicalText(content);
  }

  return sections;
};

const getPatientInfo = (patient, report) => {
  const name = getText(patient?.name || patient?.fullName || patient?.full_name, "Unknown");
  const email = getText(patient?.email, "No email");
  const pregnancyStatus = report?.pregnancyStatus ?? patient?.pregnancyStatus;
  const pregnancyText = pregnancyStatus === true ? "Yes" : pregnancyStatus === false ? "No" : "Unknown";

  const createdAt = report?.createdAt || report?.created_at || patient?.updatedAt || "N/A";
  const riskLevel = report?.riskLevel || "Unknown";
  const riskScore = report?.riskScore ?? 0;
  const dayOfIllness = report?.dayOfIllness ?? 1;

  return {
    name,
    email,
    pregnancyText,
    createdAt,
    riskLevel,
    riskScore,
    dayOfIllness,
  };
};

/**
 * Generate a hospital-grade medical PDF report
 */
export const generateMedicalReportPdf = ({
  patient,
  latestReport,
  trackingRecords = [],
}) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const left = 36;
  const right = pageWidth - 36;

  resetPdfTypography(doc);

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 60, "F");
  doc.setTextColor(255, 255, 255);
  pdfText(doc, "DengueShield AI", left, 25, { bold: true, fontSize: 16 });
  resetPdfTypography(doc, { fontSize: 11 });
  doc.setTextColor(255, 255, 255);
  pdfText(doc, "Clinical Risk Assessment Report", left, 40);

  let y = 78;

  const p = getPatientInfo(patient, latestReport);
  const headerColor = p.riskScore >= 80
    ? [220, 38, 38]
    : p.riskScore >= 50
    ? [249, 115, 22]
    : p.riskScore >= 25
    ? [234, 179, 8]
    : [16, 185, 129];

  y = drawSectionHeader(doc, y, "1. PATIENT INFORMATION", left, right, headerColor);

  const riskBadgeColor = p.riskScore >= 80 ? [239, 68, 68] :
                         p.riskScore >= 60 ? [249, 115, 22] :
                         p.riskScore >= 40 ? [245, 158, 11] :
                         p.riskScore >= 20 ? [59, 130, 246] : [16, 185, 129];

  resetPdfTypography(doc, { bold: true, fontSize: 9 });
  doc.setTextColor(51, 65, 85);
  pdfText(doc, "Name:", left, y + 14, { bold: true, fontSize: 9 });
  pdfText(doc, "Email:", left, y + 28, { bold: true, fontSize: 9 });
  pdfText(doc, "Day of Illness:", left, y + 42, { bold: true, fontSize: 9 });
  pdfText(doc, "Pregnancy Status:", left, y + 56, { bold: true, fontSize: 9 });

  resetPdfTypography(doc, { fontSize: 9 });
  doc.setTextColor(30, 41, 59);
  pdfText(doc, p.name, left + 95, y + 14, { fontSize: 9 });
  pdfText(doc, p.email, left + 95, y + 28, { fontSize: 9 });
  pdfText(doc, String(p.dayOfIllness), left + 95, y + 42, { fontSize: 9 });
  pdfText(doc, p.pregnancyText, left + 95, y + 56, { fontSize: 9 });

  doc.setFillColor(riskBadgeColor[0], riskBadgeColor[1], riskBadgeColor[2]);
  doc.roundedRect(right - 120, y - 4, 115, 25, 5, 5, "F");
  doc.setTextColor(255, 255, 255);
  pdfText(doc, `Risk Score: ${p.riskScore}/100`, right - 115, y + 10, { bold: true });

  y += 80;

  y = drawSectionHeader(doc, y, "2. AI CLINICAL ASSESSMENT", left, right, headerColor);

  const sections = extractReportSections(latestReport);

  const addTextBox = (title, content) => {
    const lines = splitByWidth(doc, content, right - left - 20);
    const boxHeight = Math.max(54, lines.length * BODY_LINE_HEIGHT + 24);

    y = ensureSpace(doc, y, boxHeight + 10);
    doc.setDrawColor(219, 234, 254);
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(left, y, right - left, boxHeight, 3, 3, "FD");

    resetPdfTypography(doc, { bold: true });
    doc.setTextColor(30, 58, 138);
    pdfText(doc, title, left + 8, y + 14, { bold: true });

    resetPdfTypography(doc);
    doc.setTextColor(15, 23, 42);
    pdfTextLines(doc, lines, left + 8, y + 32, BODY_LINE_HEIGHT);

    y += boxHeight + 10;
    return y;
  };

  y = addTextBox("Clinical Assessment", sections["Clinical Assessment"]);
  y = addTextBox("Detected Warning Signs", sections["Detected WHO Warning Signs"]);

  y = ensureSpace(doc, y, 40);
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(left, y, right - left, 35, 3, 3, "FD");
  resetPdfTypography(doc, { bold: true });
  doc.setTextColor(51, 65, 85);
  pdfText(doc, "Estimated Dengue Risk (Not a diagnosis)", left + 10, y + 12, { bold: true });
  resetPdfTypography(doc, { fontSize: 11 });
  doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
  pdfText(doc, sections["Risk Estimate"], left + 10, y + 26, { fontSize: 11 });

  y += 45;

  y = addBulletListParagraph(
    doc,
    y,
    left,
    right,
    "Key Contributing Factors",
    latestReport?.triggeredFactors,
    "Assessment based on clinical presentation and WHO warning signs.",
    formatContributingFactor
  );

  y = ensureSpace(doc, y, 120);
  y = drawSectionHeader(doc, y, "3. CLINICAL RECOMMENDATIONS", left, right, headerColor);

  y = addBulletListParagraph(
    doc,
    y,
    left,
    right,
    "Recommended Actions",
    latestReport?.recommendations,
    "Maintain hydration, monitor symptoms daily, and seek clinical care if warning signs develop.",
    sanitizeRecommendationLine
  );

  y = addTextBox("Clinical Recommendation", sections["Clinical Recommendation"]);

  y = ensureSpace(doc, y, 150);
  y = drawSectionHeader(doc, y, "4. WHO MANAGEMENT GUIDANCE", left, right, headerColor);

  y = addTextBox("WHO Hydration & Care", sections["WHO Management Guidance"]);
  y = addTextBox("Emergency Warning Signs", sections["Emergency Advisory"]);

  if (latestReport?.nearestHospitals && latestReport.nearestHospitals.length > 0) {
    y = ensureSpace(doc, y, 100);
    y = drawSectionHeader(doc, y, "5. NEAREST HEALTHCARE FACILITIES", left, right, headerColor);

    const hospitals = latestReport.nearestHospitals.slice(0, 5);

    hospitals.forEach((hospital, idx) => {
      y = ensureSpace(doc, y, 30);
      resetPdfTypography(doc, { bold: true, fontSize: 9 });
      doc.setTextColor(30, 41, 59);
      pdfText(doc, `${idx + 1}. ${sanitizeMedicalText(hospital.name)}`, left, y, { bold: true, fontSize: 9 });
      resetPdfTypography(doc, { fontSize: 8 });
      doc.setTextColor(100, 116, 139);
      pdfText(doc, `Distance: ${sanitizeMedicalText(hospital.distance)}`, left + 15, y + 12, { fontSize: 8 });
      y += 20;
    });
  }

  y = ensureSpace(doc, y, 100);
  y = drawSectionHeader(doc, y, "6. IMPORTANT MEDICAL DISCLAIMER", left, right, headerColor);

  const disclaimerLines = splitByWidth(doc, MEDICAL_DISCLAIMER, right - left - 16);

  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(255, 250, 240);
  doc.roundedRect(left, y, right - left, disclaimerLines.length * 11 + 20, 3, 3, "FD");

  resetPdfTypography(doc, { fontSize: 8 });
  doc.setTextColor(127, 29, 29);
  pdfTextLines(doc, disclaimerLines, left + 10, y + 14, 11, { fontSize: 8 });

  const footerY = pageHeight - 30;
  doc.setDrawColor(200, 200, 200);
  doc.line(left, footerY, right, footerY);
  resetPdfTypography(doc, { fontSize: 8 });
  doc.setTextColor(128, 128, 128);
  pdfText(doc, "Generated by DengueShield AI", left, footerY + 12, { fontSize: 8 });
  pdfText(doc, `Report Date: ${formatDateTime(new Date())}`, right - 150, footerY + 12, { fontSize: 8 });

  return doc;
};

export default generateMedicalReportPdf;
