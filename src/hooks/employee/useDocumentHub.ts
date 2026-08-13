// src/hooks/employee/useDocumentHub.ts
//
// FIXED: fetchAll() used to auto-select the first in-progress case as
// activeFilter on load. That meant every "plain" upload from the Hub
// silently carried that case's application_id, which the backend then used
// to link the document to a matching task — even though the person never
// touched a case tab. Hub now always starts on "All Documents" (activeFilter
// = "all"); a case only gets selected when the person explicitly clicks its
// tab, or when the page is opened with ?application_id=... in the URL
// (handled separately, in DocumentHub.tsx).

import { useState, useEffect, useCallback } from "react";
import documentHubApi from "../../api/employee/documentHub.api";
import type {
  ActivityItem,
  ApplicationTab,
  HubDocument,
  HubRequirements,
  StorageInfo,
} from "../../types/employee/documentHub.types";

export function useDocumentHub() {
  const [documents,       setDocuments]      = useState<HubDocument[]>([]);
  const [requirements,    setRequirements]   = useState<HubRequirements | null>(null);
  const [activity,        setActivity]       = useState<ActivityItem[]>([]);
  const [storage,         setStorage]        = useState<StorageInfo>({ used_mb: 0, total_mb: 50 });
  const [applicationTabs, setApplicationTabs] = useState<ApplicationTab[]>([]);
  const [isLoading,       setIsLoading]      = useState(true);
  const [error,           setError]          = useState<string | null>(null);
  const [uploading,       setUploading]      = useState(false);
  const [uploadError,     setUploadError]    = useState<string | null>(null);

  const [viewMode,    setViewMode]    = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // "all" = show everything, or an application UUID = filter to that app
  const [activeFilter, setActiveFilterState] = useState<string>("all");

  // ── Fetch everything ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [docs, tabs] = await Promise.all([
        documentHubApi.listDocuments(),
        documentHubApi.getAllApplicationTabs(),
      ]);

      setDocuments(docs);
      setApplicationTabs(tabs);
      setStorage(documentHubApi.getStorageInfo(docs));
      setActivity(documentHubApi.getActivity(docs));

      // Always land on "All Documents" — never auto-pick a case. See note
      // at the top of this file for why.
      setActiveFilterState("all");
      setRequirements(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail ?? "Failed to load documents.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Switch active filter + reload requirements for that app ───────────────
  const setActiveFilter = useCallback(async (filterId: string) => {
    setActiveFilterState(filterId);

    if (filterId === "all") {
      setRequirements(null);
      return;
    }

    try {
      const reqs = await documentHubApi.getRequirements(filterId);
      setRequirements(reqs);
    } catch {
      setRequirements(null);
    }
  }, []);

  // ── Upload — returns HubDocument so caller can react (toast, refresh, etc) ─
  const uploadDocument = useCallback(async (
    file: File,
    options?: { applicationId?: string; documentType?: string; category?: string }
  ): Promise<HubDocument | null> => {
    setUploading(true);
    setUploadError(null);
    try {
      const doc = await documentHubApi.uploadDocument(
        file,
        options?.applicationId,
        options?.documentType,
        options?.category,
      );
      void fetchAll(); // refresh list in background
      return doc;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setUploadError(err?.response?.data?.detail ?? "Upload failed. Please try again.");
      return null;
    } finally {
      setUploading(false);
    }
  }, [fetchAll]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteDocument = useCallback(async (id: string) => {
    try {
      await documentHubApi.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail ?? "Delete failed.");
      throw e; // let the caller (DocumentHub) show its own toast with the message
    }
  }, []);

  // ── Filter documents ──────────────────────────────────────────────────────
  const filtered = documents.filter(doc => {
    const matchSearch =
      !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchFilter =
      activeFilter === "all"
        ? true
        : doc.application_id === activeFilter;

    return matchSearch && matchFilter;
  });

  return {
    documents:       filtered,
    allDocuments:    documents,
    requirements,
    activity,
    storage,
    applicationTabs,
    isLoading,
    error,
    uploading,
    uploadError,
    viewMode,        setViewMode,
    activeFilter,
    setActiveFilter,
    searchQuery,     setSearchQuery,
    uploadDocument,
    deleteDocument,
    refetch: fetchAll,
  };
}