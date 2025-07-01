import api from './api';

export interface DnsRequest {
  id: number;
  domain: string; // punycode 도메인
  original_domain: string; // 원본 한글 도메인
  ip: string;
  user: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
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
  ssl_enabled: boolean;
  created_at: string;
  ssl_certificate?: {
    id: number;
    domain: string;
    status: string;
    issued_at: string;
    expires_at: string;
    days_until_expiry: number;
    is_expired: boolean;
  };
}

const dnsService = {
  async getRequests() {
    const res = await api.get('/dns/request/list/');
    if (res.data && Array.isArray(res.data)) return { ...res, data: res.data };
    if (res.data && Array.isArray(res.data.results)) return { ...res, data: res.data.results };
    return res;
  },
  async approveRequest(id: number) {
    return api.post(`/dns/request/${id}/approve/`, { action: 'approved' });
  },
  async rejectRequest(id: number, reject_reason: string) {
    return api.post(`/dns/request/${id}/approve/`, { action: 'rejected', reason: reject_reason });
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
  async downloadCaCertificate() {
    return api.get('/dns/ssl/ca/download/');
  },
  async downloadSslPackage(domain: string) {
    return api.get(`/dns/ssl/packages/${domain}/download/`, {
      responseType: 'blob'
    });
  },
};

export default dnsService; 