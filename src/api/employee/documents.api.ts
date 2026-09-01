// src/api/documents.api.ts
import axios from "../axios";
import type { Document, DocumentListResponse } from "../../types/employee/document.types";

const documentsApi = {

  // GET /documents — all docs for current user
  list: async (): Promise<Document[]> => {
    const res = await axios.get("/documents");
    return Array.isArray(res.data) ? res.data : res.data.items ?? [];
  },

  // GET /documents?application_id=xxx
  listByApplication: async (applicationId: string): Promise<Document[]> => {
    const res = await axios.get("/documents", {
      params: { application_id: applicationId },
    });
    return Array.isArray(res.data) ? res.data : res.data.items ?? [];
  },

  // GET /documents/:id — single document
  get: async (id: string): Promise<Document> => {
    const res = await axios.get(`/documents/${id}`);
    return res.data;
  },

  // GET /documents/:id/view — serve file inline for viewing (matches backend endpoint)
  getFile: async (id: string): Promise<{ blob: Blob; fileName: string; contentType: string }> => {
    const res = await axios.get(`/documents/${id}/view`, {
      responseType: "blob",
    });
    const disposition = String(res.headers["content-disposition"] ?? "");
    const contentType = String(res.headers["content-type"] ?? "application/octet-stream");
    const nameMatch   = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)["']?/);
    const fileName    = nameMatch?.[1]?.trim() ?? "document";
    return { blob: res.data, fileName, contentType };
  },

    // documents.api.ts — add alongside reupload()
  getVersions: async (documentId: string): Promise<{
    id: string; file_name: string; version: number; status: string; uploaded_at: string;
  }[]> => {
    const res = await axios.get(`/documents/${documentId}/versions`);
    return res.data;
  },

  // POST /documents/upload — multipart upload
  upload: async (body: {
    application_id: string;
    document_type:  string;
    category:       string;
    file:           File;
  }): Promise<Document> => {
    const form = new FormData();
    form.append("application_id", body.application_id);
    form.append("document_type",  body.document_type);
    form.append("category",       body.category);
    form.append("file",           body.file);
    const res = await axios.post("/documents/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // PATCH /documents/:id/rename — display-name-only rename
  rename: async (id: string, newName: string): Promise<Document> => {
    const res = await axios.patch(`/documents/${id}/rename`, { new_name: newName });
    return res.data;
  },
  // GET /documents/hub — all of the current user's documents across every
  // case (scoped server-side to their own user_id), optionally filtered by 
  // a search term. Used by the "From Hub" picker. 
  listHub: async (params?: { search?: string }): Promise<Document[]> => {
    const res = await axios.get("/documents/hub", { params });
    return Array.isArray(res.data) ? res.data : res.data.items ?? [];
  },

  // POST /documents/:id/reuse — attach an existing Hub document to a new
  // case WITHOUT re-uploading (duplicates the file server-side so the two
  // rows are independent — safe to delete one without breaking the other).
  reuse: async (sourceDocumentId: string, applicationId: string): Promise<Document> => {
    const form = new FormData();
    form.append("application_id", applicationId);
    const res = await axios.post(`/documents/${sourceDocumentId}/reuse`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  reupload: async (oldDocId: string, file: File): Promise<Document> => {
    const form = new FormData();
    form.append("file", file);
    const res = await axios.post(`/documents/${oldDocId}/reupload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // DELETE /documents/:id
  delete: async (id: string): Promise<void> => {
    await axios.delete(`/documents/${id}`);
  },

  // PATCH /documents/:id/status
  updateStatus: async (id: string, status: string, note?: string): Promise<Document> => {
    const res = await axios.patch(`/documents/${id}/status`, { status, note });
    return res.data;
  },
};

export default documentsApi;
export type { Document, DocumentListResponse };