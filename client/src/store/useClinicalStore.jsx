import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { normalizeTrackingRecords } from "../utils/tracking";

const ClinicalStoreContext = createContext(null);

export const ClinicalStoreProvider = ({ children }) => {
  const [state, setState] = useState({
    latestAssessment: null,
    currentRisk: null,
    latestTracking: [],
    graphResult: null,
    pdfData: null,
    latestRecord: null,
    latestReport: null,
  });

  const updateState = useCallback((partial) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const setLatestAssessment = useCallback(
    (assessment) => {
      updateState({
        latestAssessment: assessment,
        currentRisk: assessment || null,
      });
    },
    [updateState]
  );

  const value = useMemo(
    () => ({
      ...state,
      setLatestAssessment,
      setCurrentRisk: (risk) => updateState({ currentRisk: risk }),
      setLatestTracking: (records) => updateState({ latestTracking: records }),
      setGraphResult: (graphResult) => updateState({ graphResult }),
      setPdfData: (pdfData) => updateState({ pdfData }),
      setLatestRecord: (latestRecord) => updateState({ latestRecord }),
      setLatestReport: (latestReport) => updateState({ latestReport }),
      hydrateFromDashboard: ({ dashboard, reports, tracking }) => {
        const records = Array.isArray(dashboard?.records) ? dashboard.records : [];
        const latestRecord = records[records.length - 1] || null;
        const assessment =
          dashboard?.latestAssessment || latestRecord?.computed || null;
        updateState({
          latestRecord,
          latestAssessment: assessment,
          currentRisk: assessment,
          latestTracking:
            tracking ||
            normalizeTrackingRecords(records, records.length || 1),
          latestReport: reports?.[0] || null,
        });
      },
    }),
    [state, setLatestAssessment, updateState]
  );

  return (
    <ClinicalStoreContext.Provider value={value}>
      {children}
    </ClinicalStoreContext.Provider>
  );
};

export const useClinicalStore = () => {
  const ctx = useContext(ClinicalStoreContext);
  if (!ctx) {
    throw new Error("useClinicalStore must be used within ClinicalStoreProvider");
  }
  return ctx;
};
