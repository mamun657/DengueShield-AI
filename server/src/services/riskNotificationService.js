const Notification = require("../models/Notification");
const { resolvePatientNotificationPolicy } = require("./notificationPolicyService");
const {
  notifyPatientHighRisk,
  notifyPatientCritical,
} = require("./notificationDeliveryService");

const RISK_NOTIFICATION_TYPES = ["patient_risk_warning", "patient_critical_alert"];

/**
 * Event-driven risk notifications — fired immediately after risk engine output,
 * independent of AI report generation or Critical Patient Agent completion.
 */
const hasExistingRiskNotification = async (patientId, recordId) => {
  if (!patientId || !recordId) return false;
  return Boolean(
    await Notification.findOne({
      userId: patientId,
      type: { $in: RISK_NOTIFICATION_TYPES },
      "metadata.recordId": recordId,
    }).select("_id")
  );
};

const dispatchImmediateRiskNotifications = async (record, io) => {
  const patientId = record?.user?._id || record?.user;
  if (!patientId || !record?.computed) {
    return { dispatched: false, reason: "missing_record_data" };
  }

  const policy = resolvePatientNotificationPolicy({ record });
  if (!policy.shouldNotifyPatient) {
    return { dispatched: false, policy, reason: "below_threshold" };
  }

  const recordId = record._id;
  if (await hasExistingRiskNotification(patientId, recordId)) {
    return { dispatched: false, policy, reason: "duplicate" };
  }

  if (policy.patientLevel === "HIGH_RISK") {
    await notifyPatientHighRisk({ patientId, record, io });
    console.log("[RiskNotification] HIGH_RISK dispatched", recordId, patientId);
    return { dispatched: true, policy, level: "HIGH_RISK" };
  }

  if (policy.patientLevel === "CRITICAL") {
    await notifyPatientCritical({ patientId, record, alertDoc: null, io });
    console.log("[RiskNotification] CRITICAL dispatched", recordId, patientId);
    return { dispatched: true, policy, level: "CRITICAL" };
  }

  return { dispatched: false, policy, reason: "no_matching_level" };
};

module.exports = {
  dispatchImmediateRiskNotifications,
  hasExistingRiskNotification,
  RISK_NOTIFICATION_TYPES,
};
