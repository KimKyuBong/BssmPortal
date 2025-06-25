import api from './api';

export interface DnsRequest {
  id: number;
  domain: string; // punycode 도메인
  original_domain: string; // 원본 한글 도메인
  ip: string;
  user: string;
  reason: string;
  status: '대기' | '승인' | '거절' | '삭제됨';
  reject_reason?: string;
  created_at: string;
  processed_at?: string;
}

export interface DnsRecord {
  id: number;
  domain: string; // punycode 도메인
  original_domain: string; // 원본 한글 도메인
  ip: string;
  user: string;
  created_at: string;
}

const dnsService = {
  async getRequests() {
    const res = await api.get('/dns/request/list/');
    if (res.data && Array.isArray(res.data)) return { ...res, data: res.data };
    if (res.data && Array.isArray(res.data.results)) return { ...res, data: res.data.results };
    return res;
  },
  async approveRequest(id: number) {
    return api.post(`/dns/request/${id}/approve/`, { action: '승인' });
  },
  async rejectRequest(id: number, reject_reason: string) {
    return api.post(`/dns/request/${id}/approve/`, { action: '거절', reason: reject_reason });
  },
  async applyDns() {
    return api.post('/dns/apply/');
  },
  async getMyRecords() {
    const res = await api.get('/dns/records/');
    if (res.data && Array.isArray(res.data)) return { ...res, data: res.data };
    if (res.data && Array.isArray(res.data.results)) return { ...res, data: res.data.results };
    return res;
  },
  async getMyRequests() {
    const res = await api.get('/dns/request/my/');
    if (res.data && Array.isArray(res.data)) return { ...res, data: res.data };
    if (res.data && Array.isArray(res.data.results)) return { ...res, data: res.data.results };
    return res;
  },
  async requestDomain(data: { domain: string; ip: string; reason: string }) {
    return api.post('/dns/request/', data);
  },
  async getAllRecords() {
    const res = await api.get('/dns/records/');
    if (res.data && Array.isArray(res.data)) return { ...res, data: res.data };
    if (res.data && Array.isArray(res.data.results)) return { ...res, data: res.data.results };
    return res;
  },
  // 관리자용 DNS 레코드 관리 기능
  async createRecord(data: { domain: string; ip: string }) {
    return api.post('/dns/records/create/', data);
  },
  async updateRecord(id: number, data: { domain?: string; ip?: string }) {
    return api.put(`/dns/records/${id}/update/`, data);
  },
  async deleteRecord(id: number) {
    return api.delete(`/dns/records/${id}/delete/`);
  },
  async deleteMyRecord(id: number) {
    return api.delete(`/dns/records/my/${id}/delete/`);
  },
};

export default dnsService; 