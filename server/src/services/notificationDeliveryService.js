const User = require("../models/User");
const { createNotification, emitToUser, getDefaultAdmin, countUnreadForUser } = require("./messagingService");

const RISK_ALERT_TYPES = new Set(["patient_risk_warning", "patient_critical_alert"]);

/**
 * Extensible notification delivery layer.
 * Channels: dashboard (in-app DB + Socket.IO) are implemented; SMS, email, WhatsApp, and push
 * are stubbed for future provider integrations.
 */
const CHANNELS = {
  DASHBOARD: "dashboard",
  SMS: "sms",
  EMAIL: "email",
  WHATSAPP: "whatsapp",
  PUSH: "push",
};

const channelHandlers = {
  [CHANNELS.DASHBOARD]: async ({ userId, payload, io }) => {
    const notification = await createNotification({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      conversationId: payload.conversationId || null,
      relatedUserId: payload.relatedUserId || null,
      metadata: payload.metadata || {},
    });
    emitToUser(io, String(userId), "notification", notification);

    if (RISK_ALERT_TYPES.has(payload.type)) {
      const user = await User.findById(userId).select("_id role");
      const counts = user ? await countUnreadForUser(user) : { unreadCount: 1 };
      emitToUser(io, String(userId), "risk_alert", {
        notification,
        level: payload.metadata?.notificationLevel || null,
        unreadCount: counts.unreadCount,
        source: "risk_engine",
      });
    }

    return notification;
  },
  [CHANNELS.SMS]: async ({ payload }) => {
    if (process.env.NOTIFY_SMS_ENABLED === "true") {
      console.log("[NotificationDelivery] SMS stub:", payload.title);
    }
    return null;
  },
  [CHANNELS.EMAIL]: async ({ payload }) => {
    if (process.env.NOTIFY_EMAIL_ENABLED === "true") {
      console.log("[NotificationDelivery] Email stub:", payload.title);
    }
    return null;
  },
  [CHANNELS.WHATSAPP]: async ({ payload }) => {
    if (process.env.NOTIFY_WHATSAPP_ENABLED === "true") {
      console.log("[NotificationDelivery] WhatsApp stub:", payload.title);
    }
    return null;
  },
  [CHANNELS.PUSH]: async ({ payload }) => {
    if (process.env.NOTIFY_PUSH_ENABLED === "true") {
      console.log("[NotificationDelivery] Push stub:", payload.title);
    }
    return null;
  },
};

/**
 * Delivers a notification across one or more channels.
 */
const deliverNotification = async ({
  userId,
  channels = [CHANNELS.DASHBOARD],
  payload,
  io,
}) => {
  const results = [];
  for (const channel of channels) {
    const handler = channelHandlers[channel];
    if (!handler) continue;
    try {
      const result = await handler({ userId, payload, io });
      if (result) results.push({ channel, result });
    } catch (error) {
      console.warn(`[NotificationDelivery] ${channel} failed:`, error.message);
    }
  }
  return results;
};

/**
 * Admin alert when Critical Patient Agent classifies a case as CRITICAL.
 */
const notifyAdminCriticalPatient = async ({
  adminId,
  patient,
  alertDoc,
  conversationId,
  io,
}) => {
  const trendText = (alertDoc.riskTrend || [])
    .map((entry) => entry.riskScore)
    .join(" → ");
  const signsText = (alertDoc.warningSigns || []).join(", ") || "None listed";

  const body = [
    `Patient: ${patient.name || "Unknown"} (${patient._id})`,
    `Current Risk: ${alertDoc.riskScore}/100`,
    trendText ? `Risk Trend: ${trendText}` : null,
    `Warning Signs: ${signsText}`,
    `Recommended: ${alertDoc.recommendedAction || "Immediate Clinical Follow-up"}`,
  ]
    .filter(Boolean)
    .join("\n");

  return deliverNotification({
    userId: adminId,
    channels: [CHANNELS.DASHBOARD],
    payload: {
      type: "critical_patient",
      title: "🚨 Critical Patient Detected",
      body,
      conversationId,
      relatedUserId: patient._id,
      metadata: {
        alertId: alertDoc._id,
        patientId: patient._id,
        riskScore: alertDoc.riskScore,
        riskTrend: alertDoc.riskTrend,
        warningSigns: alertDoc.warningSigns,
        recommendedAction: alertDoc.recommendedAction,
        source: "critical_patient_agent",
      },
    },
    io,
  });
};

/**
 * HIGH RISK (75–89): notify patient only — no admin/MCP escalation.
 */
const notifyPatientHighRisk = async ({ patientId, record, io, conversationId = null }) => {
  const riskScore = Number(record?.computed?.riskScore || 0);
  const body =
    "Your recent symptoms indicate increasing dengue risk. Please monitor symptoms closely and seek medical attention if symptoms worsen.";

  return deliverNotification({
    userId: patientId,
    channels: [CHANNELS.DASHBOARD],
    payload: {
      type: "patient_risk_warning",
      title: "⚠ High Dengue Risk Detected",
      body,
      conversationId,
      relatedUserId: patientId,
      metadata: {
        riskScore,
        notificationLevel: "HIGH_RISK",
        recordId: record?._id,
        source: "notification_policy",
      },
    },
    io,
  });
};

/**
 * CRITICAL (≥90 or clinical exception): notify patient with urgent messaging.
 */
const notifyPatientCritical = async ({
  patientId,
  record,
  alertDoc,
  io,
  conversationId = null,
}) => {
  const riskScore = Number(record?.computed?.riskScore || alertDoc?.riskScore || 0);
  const body =
    "Your symptoms indicate a critical dengue risk. Please seek medical attention immediately.";

  return deliverNotification({
    userId: patientId,
    channels: [CHANNELS.DASHBOARD],
    payload: {
      type: "patient_critical_alert",
      title: "🚨 Critical Dengue Risk Detected",
      body,
      conversationId,
      relatedUserId: patientId,
      metadata: {
        alertId: alertDoc?._id,
        riskScore,
        warningSigns: alertDoc?.warningSigns,
        notificationLevel: "CRITICAL",
        recordId: record?._id,
        source: "notification_policy",
      },
    },
    io,
  });
};

const resolveDefaultAdmin = async () => getDefaultAdmin().catch(() => null);

module.exports = {
  CHANNELS,
  deliverNotification,
  notifyAdminCriticalPatient,
  notifyPatientHighRisk,
  notifyPatientCritical,
  resolveDefaultAdmin,
};
