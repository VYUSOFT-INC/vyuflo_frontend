// src/api/lawyer/templates.api.ts
//
// API wrappers for the Template Library. Pairs with templates.types.ts.
// JSDoc on each fn explains which UI element calls it.

import api from '../axios';
import type {
  CreateTemplatePayload,
  TemplateDetail,
  TemplateListResponse,
  UpdateTemplatePayload,
  UseTemplatePayload,
  UseTemplateResponse,
} from '../../types/lawyer/templates.types';

export const templatesApi = {
  /**
   * Powers the GRID. Backend sort: platform first → use_count desc → newest.
   *
   * @param params All params optional. is_platform omitted → All tab.
   *   is_platform=false → My Templates toggle
   *   is_platform=true  → Platform Templates toggle
   *   template_type     → tabs row (Cover/Support/RFE/Petition)
   *   visa_type_code    → optional filter chip ("H-1B", "O-1A", …)
   *   search            → title/description match
   *   page / page_size  → pagination footer (page_size max 50)
   */
  listTemplates: async (params?: {
    is_platform?: boolean;
    template_type?: string;
    visa_type_code?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<TemplateListResponse> => {
    /* Strip undefined so axios doesn't serialise "is_platform=undefined" */
    const cleaned: Record<string, string | number | boolean> = {};
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') cleaned[k] = v;
      });
    }
    const r = await api.get<TemplateListResponse>('/templates', {
      params: Object.keys(cleaned).length > 0 ? cleaned : undefined,
    });
    return r.data;
  },

  /**
   * Powers the PREVIEW MODAL. Returns body_content with {{placeholders}}.
   * Platform templates are visible to all attorneys. Personal templates
   * only visible to the creator (backend enforces, 403 otherwise).
   */
  getTemplate: async (templateId: string): Promise<TemplateDetail> => {
    const r = await api.get<TemplateDetail>(`/templates/${templateId}`);
    return r.data;
  },

  /**
   * "+ Create Template" button → opens form modal → submit hits this.
   * Always creates is_platform=false (personal). Returns full detail
   * including body_content so frontend can navigate straight into edit.
   */
  createTemplate: async (payload: CreateTemplatePayload): Promise<TemplateDetail> => {
    const r = await api.post<TemplateDetail>('/templates', payload);
    return r.data;
  },

  /**
   * 3-dot menu → Edit. Partial update — only provided fields are written.
   * Backend returns 403 if:
   *   - template is_platform=true (firm-wide governance)
   *   - current user !== created_by (only own templates editable)
   */
  updateTemplate: async (
    templateId: string,
    payload: UpdateTemplatePayload,
  ): Promise<TemplateDetail> => {
    const r = await api.patch<TemplateDetail>(`/templates/${templateId}`, payload);
    return r.data;
  },

  /**
   * 3-dot menu → Delete. Soft-delete (sets is_active=false). Data preserved
   * for audit. Same 403 rules as update (platform / not creator → blocked).
   */
  deleteTemplate: async (templateId: string): Promise<void> => {
    await api.delete(`/templates/${templateId}`);
  },

  /**
   * "Use" button → opens application-picker modal → submit hits this.
   * Backend flow:
   *   1. Validates template accessible (own or platform)
   *   2. Validates application_id is assigned to current attorney
   *   3. Creates Document (status=pending_review, is_draft=true)
   *   4. Increments template.use_count ("124 Uses" → "125 Uses")
   *   5. Returns document_id → frontend redirects to /lawyer/documents/edit/{id}
   */
  useTemplate: async (
    templateId: string,
    payload: UseTemplatePayload,
  ): Promise<UseTemplateResponse> => {
    const r = await api.post<UseTemplateResponse>(
      `/templates/${templateId}/use`,
      payload,
    );
    return r.data;
  },
};