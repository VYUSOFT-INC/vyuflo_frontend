// src/utils/notifNavigation.ts
// Role-aware notification URL resolver.

import { getUiSession } from "./uiSession";
import type { Notification } from "../types/employee/notification.types";

type AppRole = "employee" | "hr" | "attorney" | "app_admin";

function getCurrentRole(): AppRole {
  const session = getUiSession();
  const role = session?.roles?.[0];
  if (role === "hr" || role === "attorney" || role === "app_admin") return role;
  return "employee";
}

export function resolveNotifUrl(raw?: string | null): string | null {
  if (!raw) return null;

  const role = getCurrentRole();
  const path = raw.startsWith("/") ? raw : `/${raw}`;

  const appMatch     = path.match(/^\/applications\/([^/]+)/);
  const caseMatch    = path.match(/^\/employer\/cases\/([^/]+)/);
  const docViewMatch = path.match(/^\/documents\/([^/]+)\/view/);
  const docMatch     = path.match(/^\/documents\/([^/]+)/);

  const appId = appMatch?.[1] ?? caseMatch?.[1];
  const docId = docViewMatch?.[1] ?? docMatch?.[1];

  if (appId) {
    if (role === "hr")       return `/employer/cases/${appId}`;
    if (role === "attorney") return `/lawyer/cases/${appId}`;
    return `/applications/${appId}`;
  }

  if (docId) {
    if (role === "attorney") return `/lawyer/documents/${docId}/review`;
    if (role === "hr")       return `/employer/documents/${docId}`;
    return `/documents/${docId}`;
  }

  if (path.startsWith("/employer/employees")) {
    return role === "hr" ? "/employer/employees" : "/applications/list";
  }

  if (path.includes("/messages")) {
    if (role === "hr")       return "/employer/messages";
    if (role === "attorney") return "/lawyer/messages";
    return "/messages";
  }

  if (path === "/deadlines") {
    return role === "hr" ? "/employer/deadlines" : "/applications/list";
  }

  if (path.startsWith("/employer/") && role === "hr")       return path;
  if (path.startsWith("/lawyer/")   && role === "attorney") return path;
  if (path.startsWith("/admin/")    && role === "app_admin") return path;

  if (path.startsWith("/employer/")) {
    return role === "attorney" ? "/lawyer/cases" : "/applications/list";
  }

  return path;
}

export function getNotifRoute(notif: Notification): string | null {
  const fromCta = resolveNotifUrl(notif.cta_primary_url);
  if (fromCta) return fromCta;

  if (notif.application_id) {
    const role = getCurrentRole();
    if (role === "hr")       return `/employer/cases/${notif.application_id}`;
    if (role === "attorney") return `/lawyer/cases/${notif.application_id}`;
    return `/applications/${notif.application_id}`;
  }

  if (notif.document_id) {
    const role = getCurrentRole();
    if (role === "attorney") return `/lawyer/documents/${notif.document_id}/review`;
    return `/documents/${notif.document_id}`;
  }

  return null;
}