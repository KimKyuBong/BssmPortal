/**
 * 퓨니코드 유틸리티 함수들
 * 퓨니코드(Punycode)는 유니코드 도메인을 ASCII로 변환하는 인코딩 방식입니다.
 * 예: 한글.kr → xn--bj0bj06e.kr
 */

import punycode from 'punycode';

/**
 * 도메인이 퓨니코드인지 확인
 * @param domain 도메인 문자열
 * @returns 퓨니코드 여부
 */
export function isPunycode(domain: string): boolean {
  return domain.includes('xn--');
}

/**
 * 퓨니코드를 유니코드로 변환
 * @param punycodeStr 퓨니코드 문자열
 * @returns 유니코드 문자열
 */
export function punycodeToUnicode(punycodeStr: string): string {
  try {
    // 설치한 punycode 라이브러리 사용
    return punycode.toUnicode(punycodeStr);
  } catch (error) {
    console.warn('퓨니코드 변환 실패:', error);
    return punycodeStr; // 변환 실패 시 원본 반환
  }
}

/**
 * 유니코드를 퓨니코드로 변환
 * @param unicode 유니코드 문자열
 * @returns 퓨니코드 문자열
 */
export function unicodeToPunycode(unicode: string): string {
  try {
    // 설치한 punycode 라이브러리 사용
    return punycode.toASCII(unicode);
  } catch (error) {
    console.warn('퓨니코드 변환 실패:', error);
    return unicode; // 변환 실패 시 원본 반환
  }
}

/**
 * 도메인을 분석하여 표시용 문자열 반환
 * @param domain 도메인 문자열
 * @returns { display: string, original: string, isPunycode: boolean }
 */
export function parseDomain(domain: string): {
  display: string;
  original: string;
  isPunycode: boolean;
} {
  if (!domain) {
    return { display: '', original: '', isPunycode: false };
  }

  const isPunycodeDomain = isPunycode(domain);
  
  if (isPunycodeDomain) {
    const unicode = punycodeToUnicode(domain);
    return {
      display: unicode,
      original: domain,
      isPunycode: true
    };
  } else {
    return {
      display: domain,
      original: domain,
      isPunycode: false
    };
  }
}

/**
 * 도메인 목록에서 퓨니코드를 유니코드로 변환
 * @param domains 도메인 배열
 * @returns 변환된 도메인 배열
 */
export function convertDomainsToUnicode<T extends { domain?: string; original_domain?: string }>(
  domains: T[]
): T[] {
  return domains.map(domain => {
    const domainField = domain.domain || domain.original_domain;
    if (domainField && isPunycode(domainField)) {
      const unicode = punycodeToUnicode(domainField);
      return {
        ...domain,
        display_domain: unicode,
        original_domain: domainField
      };
    }
    return {
      ...domain,
      display_domain: domainField,
      original_domain: domainField
    };
  });
} 