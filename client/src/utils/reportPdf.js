import jsPDF from "jspdf";
import { MEDICAL_DISCLAIMER } from "./clinicalRisk";
import { normalizeTrackingRecords } from "./tracking";

const formatDateTime = (value) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
};

const getRiskBadge = (riskLevel) => {
  const l = String(riskLevel || "").toUpperCase();
  if (l.includes("SEVERE") || l === "CRITICAL") return { label: "Severe Risk", color: [239, 68, 68] };
  if (l.includes("HIGH") || l.includes("SUSPICION")) return { label: "High Suspicion", color: [249, 115, 22] };
  if (l === "MODERATE" || l === "MEDIUM") return { label: "Moderate", color: [245, 158, 11] };
  return { label: "Low", color: [16, 185, 129] };
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

const splitByWidth = (doc, text, width) => {
  const raw = getText(text, "N/A");
  return doc.splitTextToSize(raw, Math.max(40, width));
};

const normalizeBulletText = (value) => {
  const cleaned = String(value || "")
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*→\s*/g, " → ")
    .trim();
  return cleaned ? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}` : "";
};

const addBulletListParagraph = (doc, y, left, right, label, items, fallback) => {
  const boxPad = 10;
  const contentWidth = right - left - boxPad * 2;
  const itemIndent = 8;
  const lineHeight = 14;
  const candidateItems = Array.isArray(items) && items.length ? items : [fallback];
  const listItems = candidateItems
    .map((item) => normalizeBulletText(item))
    .filter(Boolean);

  const wrappedItems = listItems.map((item) => {
    const lines = splitByWidth(doc, item, contentWidth - itemIndent);
    return Array.isArray(lines) ? lines : [String(lines)];
  });

  const totalLines = wrappedItems.reduce((count, lines) => count + lines.length, 0);
  const boxHeight = totalLines * lineHeight + 28;

  y = ensureSpace(doc, y, boxHeight + 10);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(left, y, right - left, boxHeight, 4, 4, "FD");
  doc.setFont("helvetica", "normal");
  doc.setCharSpace(0);
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(label, left + boxPad, y + 16);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);

  let contentY = y + 30;
  for (const itemLines of wrappedItems) {
    itemLines.forEach((line, index) => {
      const textValue = normalizeBulletText(line);
      if (index === 0) {
        doc.text(`• ${textValue}`, left + boxPad, contentY);
      } else {
        doc.text(textValue, left + boxPad + itemIndent, contentY);
      }
      contentY += lineHeight;
    });
    contentY += 3;
  }

  return y + boxHeight + 8;
};

const drawSectionHeader = (doc, y, title, left = 36, right = doc.internal.pageSize.getWidth() - 36) => {
  const barHeight = 22;
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(left, y, right - left, barHeight, 4, 4, "F");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title, left + 10, y + 14);
  return y + barHeight + 12;
};

const tryExtractReportSections = (report) => {
  // Matches the existing DashboardPage parsing approach.
  const reportText = report?.reportText || "";
  const clean = String(reportText)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*`]/g, "")
    .trim();

  const lines = clean.split("\n").map((line) => line.trim()).filter(Boolean);

  const sections = {
    "Assessment Summary": report?.summary || "Clinical assessment summary unavailable.",
    "Detected Warning Signs":
      (report?.detectedWarnings || report?.symptoms || []).join(", ") || "None reported.",
    "AI Risk Score": Number.isFinite(report?.riskScore)
      ? `${report.riskScore}/100 — ${report.severityLabel || report.riskLevel} (estimated, not confirmed)`
      : "Not available",
    "Recommended Action":
      (report?.recommendations || []).join(" ") ||
      "Continue hydration, monitor temperature, and recheck symptoms every 12-24 hours.",
    "WHO Guidance":
      report?.whoGuidance ||
      "Maintain hydration, monitor platelet count, and seek immediate clinical care if bleeding or abdominal pain develops.",
    // Fastest hackathon-safe option: remove Bangla from PDF export to avoid corrupted Unicode.
    "WHO Guidance (Bangla)": "", 
    "Emergency Advice":
      report?.emergencyAdvice ||
      "Seek urgent care for persistent vomiting, bleeding, severe abdominal pain, or drowsiness.",
    "Disclaimer":
      report?.medicalDisclaimer ||
      MEDICAL_DISCLAIMER,
  };

  for (const line of lines) {
    const [label, ...rest] = line.split(":");
    const content = rest.join(":").trim();
    if (sections[label] && content) sections[label] = content;
  }

  const orderedTitles = [
    "Assessment Summary",
    "Detected Warning Signs",
    "AI Risk Score",
    "Recommended Action",
    "WHO Guidance",
    "WHO Guidance (Bangla)",
    "Emergency Advice",
    "Disclaimer",
  ];

  return orderedTitles.map((title) => ({ title, content: sections[title] }));
};

const getPatientInfo = (patient, report) => {
  const name = getText(patient?.name || patient?.fullName || patient?.full_name, "Unknown");
  const email = getText(patient?.email, "No email");
  const pregnancyStatus =
    report?.pregnancyStatus ?? patient?.pregnancyStatus ?? patient?.pregnancy_status;
  const pregnancyText = pregnancyStatus === true ? "Yes" : pregnancyStatus === false ? "No" : "N/A";

  const latestUpdatedAt = report?.createdAt || patient?.updatedAt || patient?.createdAt || "N/A";

  const riskLevel = report?.riskLevel || report?.risk_level || "LOW";
  const riskScore = report?.riskScore ?? report?.risk_score ?? 0;
  const dayOfIllness = report?.dayOfIllness ?? report?.day_of_illness ?? patient?.dayOfIllness ?? "-";

  return {
    name,
    email,
    pregnancyText,
    updatedAt: latestUpdatedAt,
    riskLevel,
    riskScore,
    dayOfIllness,
  };
};

const drawInfoColumn = (doc, { x, y, width, rows, labelWidth = 78 }) => {
  const lineHeight = 12;
  const rowPaddingY = 4;
  const cardPadding = 10;
  const valueWidth = width - labelWidth - cardPadding * 2 - 8;

  let cursorY = y + cardPadding + 10;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);

  const rowHeights = rows.map((row) => {
    const valueLines = splitByWidth(doc, row.v, valueWidth);
    return Math.max(lineHeight, valueLines.length * lineHeight) + rowPaddingY * 2;
  });
  const totalHeight = rowHeights.reduce((acc, h) => acc + h, 0) + cardPadding * 2;
  doc.roundedRect(x, y, width, totalHeight, 5, 5, "FD");

  rows.forEach((row, index) => {
    const rowHeight = rowHeights[index];
    const valueLines = splitByWidth(doc, row.v, valueWidth);

    if (index > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.line(x + cardPadding, cursorY - rowPaddingY - 2, x + width - cardPadding, cursorY - rowPaddingY - 2);
    }

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`${row.k}:`, x + cardPadding, cursorY + 2);
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(valueLines, x + cardPadding + labelWidth, cursorY + 2);
    cursorY += rowHeight;
  });

  return y + totalHeight;
};

/**
 * Generate a PDF from a Dashboard report + patient context.
 *
 * @param {object} params
 * @param {object} params.patient - patient profile object
 * @param {object} params.latestReport - report object (from /reports)
 * @param {Array} params.trackingRecords - 3-day trend records (optional)
 * @param {Array} params.history - patient monitoring history (optional)
 */
export const generateMedicalReportPdf = ({
  patient,
  latestReport,
  trackingRecords = [],
  history = [],
}) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const left = 36;
  const right = pageWidth - 36;

  // Risk badge
  const badge = getRiskBadge(latestReport?.riskLevel || latestReport?.risk_level || "LOW");

  // Title
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("DengueShield AI", left, 32);
  doc.setFontSize(12);
  doc.text("Medical Clinical Report", left, 50);

  let y = 88;

  // Patient information
  y = drawSectionHeader(doc, y, "1. PATIENT INFORMATION", left, right);

  const p = getPatientInfo(patient, latestReport);

  const colGap = 16;
  const colWidth = (right - left - colGap) / 2;
  const severityLabel = latestReport?.severityLabel || p.riskLevel;
  const displayTitle = latestReport?.displayTitle || severityLabel;
  const leftRows = [
    { k: "Full Name", v: p.name },
    { k: "Estimated Risk", v: `${p.riskScore}/100 — ${severityLabel}` },
    { k: "Day of Illness", v: String(p.dayOfIllness) },
    { k: "Report Date", v: formatDateTime(p.updatedAt) },
  ];
  const rightRows = [
    { k: "Email", v: p.email },
    { k: "Risk Estimate", v: displayTitle },
    { k: "AI Confidence", v: latestReport?.aiConfidenceLabel || "Moderate" },
    { k: "Pregnancy Status", v: p.pregnancyText },
    { k: "Lab Status", v: latestReport?.labPending ? "Pending — CBC/platelet advised" : "Included" },
  ];

  y = ensureSpace(doc, y, 170);
  const leftBottom = drawInfoColumn(doc, { x: left, y, width: colWidth, rows: leftRows });
  const rightBottom = drawInfoColumn(doc, { x: left + colWidth + colGap, y, width: colWidth, rows: rightRows });

  const badgeY = y - 12;
  doc.setFillColor(badge.color[0], badge.color[1], badge.color[2]);
  doc.setTextColor(255, 255, 255);
  doc.roundedRect(left + 10, badgeY, 132, 20, 8, 8, "F");
  doc.setFontSize(9);
  doc.text(`Risk Status: ${badge.label}`, left + 18, badgeY + 13);

  y = Math.max(leftBottom, rightBottom) + 14;

  // AI clinical summary
  y = ensureSpace(doc, y, 120);
  y = drawSectionHeader(doc, y, "2. AI CLINICAL SUMMARY", left, right);

  const sections = tryExtractReportSections(latestReport);
  const sectionMap = Object.fromEntries(sections.map((s) => [s.title, s.content]));

  const warningSigns = sectionMap["Detected Warning Signs"] || "None";
  const assessmentSummary = sectionMap["Assessment Summary"] || "";
  const recommendedAction = sectionMap["Recommended Action"] || "";
  const criticalStatus =
    latestReport?.emergencyAdvice ||
    "Monitoring — possible critical phase transition assessed probabilistically";

  const addParagraph = (label, text) => {
    y = ensureSpace(doc, y, 80);
    const lineHeight = 14;
    const boxPad = 10;
    const contentWidth = right - left - boxPad * 2;
    const lines = splitByWidth(doc, text, contentWidth);
    const boxHeight = lines.length * lineHeight + 26;

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(left, y, right - left, boxHeight, 4, 4, "FD");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(label, left + boxPad, y + 16);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(lines, left + boxPad, y + 32);
    y += boxHeight + 10;
  };

  addParagraph("Detected warning signs", warningSigns);
  addParagraph("AI assessment", assessmentSummary);
  addParagraph("AI recommendation", recommendedAction);
  addParagraph("Clinical phase assessment", criticalStatus);
  y = addBulletListParagraph(
    doc,
    y,
    left,
    right,
    "Triggered factors",
    latestReport?.triggeredFactors,
    "No significant WHO warning pathways detected."
  );

  // Trend summary
  const source = normalizeTrackingRecords(trackingRecords, 3);
  if (source.length) {
    y = ensureSpace(doc, y, 180);
    y = drawSectionHeader(doc, y, "3. 3-DAY TREND SUMMARY", left, right);

    // Hydration tracking from fluid field if present
    const hydration = source.map((r) => {
      const value = r.fluidIntakeLiters ?? r.fluid ?? r.hydration ?? 0;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    });

    const toF = (c) => {
      const num = Number(c);
      if (!Number.isFinite(num)) return null;
      return num <= 45 ? (num * 9) / 5 + 32 : num;
    };

    const rows = source.length
      ? source.map((r, idx) => {
          const tempC = r.temperature ?? r.temp ?? r.temperatureC;
          const risk = r.riskScore ?? r.risk_score ?? r.risk;
          const day = r.dayOfIllness ?? r.day ?? idx + 1;
          const hydrationValue = hydration[idx];
          return {
            day: `Day ${day}`,
            temp: tempC != null ? `${Math.round(toF(tempC) ?? 0)}°F` : "N/A",
            risk: Number.isFinite(Number(risk)) ? `${Number(risk)}` : "N/A",
            hydration: Number.isFinite(hydrationValue) ? `${hydrationValue} L` : "-",
          };
        })
      : [];

    const tableX = left;
    const tableY = y;
    const tableWidth = right - left;
    const col1 = tableWidth * 0.22;
    const col2 = tableWidth * 0.28;
    const col3 = tableWidth * 0.2;
    const col4 = tableWidth - col1 - col2 - col3;
    const rowHeight = 22;

    doc.setFillColor(219, 234, 254);
    doc.setDrawColor(148, 163, 184);
    doc.rect(tableX, tableY, tableWidth, rowHeight, "FD");
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text("Metric", tableX + 8, tableY + 14);
    doc.text("Temperature", tableX + col1 + 8, tableY + 14);
    doc.text("Risk Score", tableX + col1 + col2 + 8, tableY + 14);
    doc.text("Hydration", tableX + col1 + col2 + col3 + 8, tableY + 14);

    y += rowHeight;
    for (const row of rows) {
      if (y > pageHeight - 120) {
        doc.addPage();
        y = 60;
        y = drawSectionHeader(doc, y, "3. 3-DAY TREND SUMMARY (CONT.)", left, right);
      }
      doc.setFillColor(y / rowHeight % 2 === 0 ? 255 : 248, 250, 252);
      doc.rect(tableX, y, tableWidth, rowHeight, "FD");
      doc.setDrawColor(203, 213, 225);
      doc.line(tableX + col1, y, tableX + col1, y + rowHeight);
      doc.line(tableX + col1 + col2, y, tableX + col1 + col2, y + rowHeight);
      doc.line(tableX + col1 + col2 + col3, y, tableX + col1 + col2 + col3, y + rowHeight);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(row.day, tableX + 8, y + 14);
      doc.text(row.temp, tableX + col1 + 8, y + 14);
      doc.text(row.risk, tableX + col1 + col2 + 8, y + 14);
      doc.text(row.hydration, tableX + col1 + col2 + col3 + 8, y + 14);
      y += rowHeight;
    }

    // Spacer after table
    y += 12;
  }

  // WHO guidance
  y = ensureSpace(doc, y, 180);
  y = drawSectionHeader(doc, y, "4. WHO GUIDANCE", left, right);

  const whoEn = sectionMap["WHO Guidance"] || "";
  const whoBn = sectionMap["WHO Guidance (Bangla)"] || "";

  const emergencySigns = sectionMap["Emergency Advice"] || "";
  const hospitalRecommendation = latestReport?.hospitalRecommendation || "Seek immediate clinical care based on symptoms.";

  doc.setTextColor(15, 23, 42);

  const addMultiline = (text) => {
    const lineHeight = 12;
    const topPad = 12;
    const bottomSafety = 90;

    const lines = splitByWidth(doc, text, right - left);
    for (let i = 0; i < lines.length; i++) {
      if (y > pageHeight - bottomSafety) {
        doc.addPage();
        y = 60 + topPad;
      }
      doc.text(lines[i], left, y);
      y += lineHeight;
    }
  };

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Hydration advice", left, y);
  y += 12;
  doc.setTextColor(15, 23, 42);
  addMultiline(whoEn);

  doc.setTextColor(100, 116, 139);
  doc.text("Emergency warning signs", left, y);
  y += 12;
  doc.setTextColor(15, 23, 42);
  addMultiline(emergencySigns);

  doc.setTextColor(100, 116, 139);
  doc.text("Hospital recommendation", left, y);
  y += 12;
  doc.setTextColor(15, 23, 42);
  addMultiline(hospitalRecommendation);

  // Bangla guidance (disabled for PDF to avoid Unicode corruption)
  if (whoBn) {
    doc.setTextColor(100, 116, 139);
    doc.text("Bangla (WHO guidance) — unavailable in PDF", left, y);
    y += 12;
  }


  // Emergency alert section
  y = ensureSpace(doc, y, 170);

  const riskNum = Number(latestReport?.riskScore ?? latestReport?.risk_score ?? 0);
  const showEmergency =
    latestReport?.riskMode === "lab-enhanced" && Number.isFinite(riskNum) && riskNum >= 90;
  const showElevated =
    !showEmergency && Number.isFinite(riskNum) && riskNum >= 61;
  y = drawSectionHeader(doc, y, "5. EMERGENCY ALERT", left, right);

  if (showEmergency) {
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(left, y, right - left, 32, 8, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("URGENT: Severe dengue risk (lab-enhanced estimate)", left + 12, y + 21);
    y += 46;

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Emergency hotline: +000 000 0000", left, y);
    y += 14;
    doc.text("Nearest Hospitals:", left, y);

    const nearest = (latestReport?.nearestHospitals || []).slice(0, 5);
    y += 12;
    if (nearest.length === 0) {
      doc.setTextColor(55, 65, 81);
      doc.text("No nearby hospital data available.", left, y);
      y += 14;
    } else {
      doc.setTextColor(15, 23, 42);
      for (const h of nearest) {
        const hospitalName = h.name || h;
        const hospitalDistance = h.distance ? ` (${h.distance})` : "";
        doc.text(`• ${hospitalName}${hospitalDistance}`, left + 10, y);
        y += 14;
      }
    }
    
    y += 4;
    doc.setTextColor(239, 68, 68);
    doc.setFont(undefined, "bold");
    doc.text("Visit the nearest available hospital immediately.", left, y);
    doc.setFont(undefined, "normal");
    y += 14;
  } else if (showElevated) {
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(10);
    doc.text(
      "Elevated dengue risk suspicion. Clinical confirmation and CBC/platelet testing recommended.",
      left,
      y
    );
    y += 20;
  } else {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text("Continue monitoring. Seek care if warning signs develop.", left, y);
    y += 20;
  }

  // Footer
  if (y > pageHeight - 80) {
    doc.addPage();
    y = 60;
  }

  doc.setFillColor(17, 24, 39);
  doc.rect(0, pageHeight - 50, pageWidth, 50, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("Generated by DengueShield AI", left, pageHeight - 30);
  doc.text("AI-assisted dengue monitoring platform", left, pageHeight - 16);
  doc.setFontSize(9);
  doc.text(`Generated on: ${formatDateTime(new Date().toISOString())}`, left, pageHeight - 8);

  return doc;
};

