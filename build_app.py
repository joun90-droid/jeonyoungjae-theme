# -*- coding: utf-8 -*-
"""Generate 영재 테마주분석 static Firebase app."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
SITE = "jeonyoungjae-theme"
PUB = "ca-pub-3079797618341925"
ADS = "google.com, pub-3079797618341925, DIRECT, f08c47fec0942fa0\n"
CANON = f"https://{SITE}.web.app"

THEMES = [
    {
        "id": "ai-semicon",
        "name": "AI·반도체",
        "emoji": "🧠",
        "heat": 96,
        "summary": "생성형 AI 투자 확대로 HBM·첨단 패키징·장비 수요가 동시에 확대되는 핵심 성장 테마",
        "catalysts": [
            "글로벌 AI 데이터센터 CAPEX 지속",
            "HBM3E/HBM4 공급 부족 국면",
            "국내 메모리·장비·소재 밸류체인 수주 모멘텀",
        ],
        "risks": [
            "고객사 투자 지연 시 실적 변동성",
            "경쟁사 기술격차 축소",
            "환율·수출 규제 변수",
        ],
        "outlook": "중장기 성장 가시성은 높으나 단기 밸류에이션 부담과 순환매에 유의",
    },
    {
        "id": "battery",
        "name": "2차전지",
        "emoji": "🔋",
        "heat": 78,
        "summary": "전기차 수요 회복 속도와 에너지저장장치(ESS) 확대가 관건인 변동성 높은 성장 테마",
        "catalysts": [
            "북미·유럽 ESS 수주 확대",
            "하이니켈·LFP 병행 전략",
            "리튬·니켈 가격 안정화 시 마진 개선",
        ],
        "risks": [
            "EV 판매 둔화",
            "중국 LFP 가격 경쟁",
            "가동률 저하에 따른 고정비 부담",
        ],
        "outlook": "구조적 성장은 유효하나 업황 턴어라운드 확인이 필요",
    },
    {
        "id": "nuclear",
        "name": "원전·SMR",
        "emoji": "⚛️",
        "heat": 88,
        "summary": "전력 수요 급증과 탄소중립 정책이 겹치며 대형원전·SMR·기자재가 재평가되는 테마",
        "catalysts": [
            "해외 원전 수주 파이프라인",
            "AI 데이터센터 전력 수요",
            "정부 원전 정책 우호 기조",
        ],
        "risks": [
            "수주 일정 지연",
            "프로젝트 파이낸싱 리스크",
            "테마 과열 후 급락",
        ],
        "outlook": "중장기 전력 인프라 수혜로 유효, 재료 공백기 변동성 큼",
    },
    {
        "id": "defense",
        "name": "방산",
        "emoji": "🛡️",
        "heat": 91,
        "summary": "글로벌 방위비 증액과 수출 계약이 실적으로 연결되는 대표적인 실적형 테마",
        "catalysts": [
            "동유럽·중동 방산 수요",
            "K-방산 후속 계약",
            "유도무기·기동장비 수출",
        ],
        "risks": [
            "지정학 이벤트 민감",
            "대규모 수주 공백 시 조정",
            "부품 공급망 병목",
        ],
        "outlook": "수주 잔고 기반 실적 가시성 양호, 고평가 구간 분할 접근",
    },
    {
        "id": "shipbuilding",
        "name": "조선·해운",
        "emoji": "🚢",
        "heat": 84,
        "summary": "친환경 선박 교체 수요와 LNG·컨테이너 시황이 맞물린 업황 회복 테마",
        "catalysts": [
            "LNG·암모니아 추진선 발주",
            "신조선가 상승",
            "해운 운임 반등 시 실적 레버리지",
        ],
        "risks": [
            "후판·인건비 상승",
            "발주 사이클 둔화",
            "환율 변동",
        ],
        "outlook": "중형 이상 조선사 중심 실적 개선 지속 가능성",
    },
    {
        "id": "bio",
        "name": "바이오·제약",
        "emoji": "🧬",
        "heat": 74,
        "summary": "임상·기술수출 재료가 주가를 좌우하는 고위험·고변동 테마",
        "catalysts": [
            "기술수출(라이선스 아웃)",
            "임상 3상·허가 모멘텀",
            "위탁생산(CDMO) 수주",
        ],
        "risks": [
            "임상 실패",
            "파이프라인 가치 과대평가",
            "유동성·희석 리스크",
        ],
        "outlook": "개별 재료 의존도가 높아 종목 선별이 핵심",
    },
    {
        "id": "robot",
        "name": "로봇·자동화",
        "emoji": "🤖",
        "heat": 82,
        "summary": "제조업 인력난과 AI 결합으로 산업용·휴머노이드 로봇 관심이 확대되는 테마",
        "catalysts": [
            "스마트팩토리 투자",
            "물류·협동로봇 도입",
            "대기업 로봇 생태계 투자",
        ],
        "risks": [
            "상용화 시점 지연",
            "테마성 급등락",
            "실적 대비 고밸류",
        ],
        "outlook": "중장기 성장 스토리는 유효, 단기 재료 매매 성격 강함",
    },
    {
        "id": "energy",
        "name": "에너지·원유",
        "emoji": "🛢️",
        "heat": 70,
        "summary": "지정학·감산·달러 흐름에 민감한 경기·인플레이션 연동 테마",
        "catalysts": [
            "중동 리스크 고조 시 유가 상승",
            "정제마진 개선",
            "에너지 안보 투자",
        ],
        "risks": [
            "수요 둔화",
            "재고 증가",
            "정책 개입",
        ],
        "outlook": "헤지·순환매 성격, 추세보다 이벤트 대응이 중요",
    },
    {
        "id": "finance",
        "name": "금융·배당",
        "emoji": "🏦",
        "heat": 68,
        "summary": "금리·밸류업·주주환원 정책이 맞물리는 상대적으로 방어적인 테마",
        "catalysts": [
            "자사주·배당 확대",
            "순이자마진 안정",
            "밸류업 프로그램",
        ],
        "risks": [
            "금리 급변",
            "건전성·충당금",
            "부동산 PF 잔여 리스크",
        ],
        "outlook": "고배당·저PBR 중심 중장기 접근에 적합",
    },
    {
        "id": "content",
        "name": "콘텐츠·엔터",
        "emoji": "🎬",
        "heat": 72,
        "summary": "IP·글로벌 공연·플랫폼 유통이 결합된 소비·심리 민감 테마",
        "catalysts": [
            "월드투어·신보 모멘텀",
            "OTT·게임 IP 확장",
            "광고·MD 수익 다각화",
        ],
        "risks": [
            "히트작 의존",
            "출연·활동 공백",
            "환율·관광 수요 변동",
        ],
        "outlook": "이벤트성 재료가 잦아 분할·손절 규칙이 중요",
    },
]

STOCKS = [
    # AI·반도체
    {"id": "s_skh", "theme": "ai-semicon", "name": "SK하이닉스", "code": "000660", "market": "KOSPI",
     "tag": "HBM 핵심", "risk": 62, "growth": 92, "score": 90,
     "thesis": "HBM 공급 주도권과 AI 서버향 메모리 수요가 실적 레버리지로 연결",
     "materials": [
         {"title": "HBM 공급계약·가격", "impact": "강세", "detail": "고객사 AI GPU향 HBM 물량·ASP 개선이 직접 실적으로 반영"},
         {"title": "설비투자 확대", "impact": "중립", "detail": "증설은 성장 기반이나 단기 현금흐름·감가상각 부담 요인"},
         {"title": "경쟁사 기술추격", "impact": "약세", "detail": "삼성·마이크론 HBM 경쟁 심화 시 점유율·마진 압력"},
     ],
     "pros": ["AI 수혜 직결", "실적 가시성 높음", "글로벌 고객 다변화"],
     "cons": ["높은 밸류에이션", "업황 민감", "대규모 CAPEX"]},
    {"id": "s_hanmi", "theme": "ai-semicon", "name": "한미반도체", "code": "042700", "market": "KOSPI",
     "tag": "HBM 장비", "risk": 74, "growth": 88, "score": 84,
     "thesis": "HBM 필수 공정 장비 수요로 AI 투자 사이클에 민감하게 반응",
     "materials": [
         {"title": "TC 본더 수주", "impact": "강세", "detail": "고객사 증설에 따른 장비 발주가 핵심 재료"},
         {"title": "경쟁 장비 진입", "impact": "약세", "detail": "대체 장비 채택 확대 시 점유율 둔화 가능"},
         {"title": "수출 규제", "impact": "중립", "detail": "특정 지역 수출 제약 여부가 변동성 요인"},
     ],
     "pros": ["테마 민감도 높음", "기술 진입장벽", "레버리지 큼"],
     "cons": ["실적 변동성", "수주 공백 리스크", "과열 조정"]},
    {"id": "s_isemicon", "theme": "ai-semicon", "name": "이수페타시스", "code": "007660", "market": "KOSPI",
     "tag": "AI PCB", "risk": 71, "growth": 86, "score": 82,
     "thesis": "고다층·고속 PCB가 AI 서버·네트워크 장비 수요와 동행",
     "materials": [
         {"title": "서버 PCB 점유율", "impact": "강세", "detail": "AI 서버 보드 채택 확대가 외형 성장 재료"},
         {"title": "원자재·환율", "impact": "중립", "detail": "동박·환율 변동이 마진에 영향"},
         {"title": "고객 재고조정", "impact": "약세", "detail": "빅테크 주문 속도 조절 시 단기 둔화"},
     ],
     "pros": ["AI 인프라 수혜", "제품 믹스 개선", "수출 비중"],
     "cons": ["고객 집중도", "재고 사이클", "경쟁 심화"]},
    # 2차전지
    {"id": "s_lgensol", "theme": "battery", "name": "LG에너지솔루션", "code": "373220", "market": "KOSPI",
     "tag": "배터리 대표", "risk": 69, "growth": 80, "score": 78,
     "thesis": "완성차 파트너십과 ESS 확대로 중장기 수요를 흡수하는 대형주",
     "materials": [
         {"title": "ESS 수주", "impact": "강세", "detail": "전력망·데이터센터 ESS가 신규 성장축"},
         {"title": "EV 판매", "impact": "중립", "detail": "지역별 전기차 판매 회복 속도가 관건"},
         {"title": "메탈 가격", "impact": "약세", "detail": "리튬 등 원자재 급변 시 수익성 출렁임"},
     ],
     "pros": ["대형 고객망", "기술 포트폴리오", "ESS 옵션"],
     "cons": ["고정비 부담", "중국 경쟁", "투자 회수 기간"]},
    {"id": "s_eco", "theme": "battery", "name": "에코프로비엠", "code": "247540", "market": "KOSDAQ",
     "tag": "양극재", "risk": 80, "growth": 83, "score": 76,
     "thesis": "하이니켈 양극재 기술력으로 배터리 셀 고객 수요에 연동",
     "materials": [
         {"title": "고객사 가동률", "impact": "강세", "detail": "셀 메이커 가동률 회복이 출하 증가로 연결"},
         {"title": "판가 스프레드", "impact": "중립", "detail": "메탈 연동 판가와 마진 구조 확인 필요"},
         {"title": "증설 부담", "impact": "약세", "detail": "수요 미회복 시 증설 고정비가 실적 압박"},
     ],
     "pros": ["기술 리더십", "고객 락인", "테마 대표성"],
     "cons": ["변동성 큼", "고밸류", "업황 민감"]},
    # 원전
    {"id": "s_kepco", "theme": "nuclear", "name": "한국전력", "code": "015760", "market": "KOSPI",
     "tag": "전력 인프라", "risk": 58, "growth": 72, "score": 75,
     "thesis": "전기요금·연료비 스프레드와 원전 가동이 실적 턴어라운드 핵심",
     "materials": [
         {"title": "요금·연료비", "impact": "강세", "detail": "연료비 하락·요금 정상화 시 이익 개선"},
         {"title": "전력수요", "impact": "강세", "detail": "AI·산업용 전력 수요 증가가 중장기 우호"},
         {"title": "부채·규제", "impact": "약세", "detail": "재무구조·요금 규제 이슈가 할인 요인"},
     ],
     "pros": ["실적 레버리지", "배당 여력 개선 여지", "인프라 성격"],
     "cons": ["정책 리스크", "부채", "시장 심리 급변"]},
    {"id": "s_doosan", "theme": "nuclear", "name": "두산에너빌리티", "code": "034020", "market": "KOSPI",
     "tag": "원전 기자재", "risk": 76, "growth": 89, "score": 85,
     "thesis": "원전 기자재·SMR 스토리가 결합된 대표 테마주",
     "materials": [
         {"title": "해외 원전 수주", "impact": "강세", "detail": "프로젝트 수주·기자재 납품이 핵심 모멘텀"},
         {"title": "SMR 파트너십", "impact": "강세", "detail": "차세대 원자로 협력 뉴스가 밸류에이션 확장"},
         {"title": "재료 공백", "impact": "약세", "detail": "수주 공백기에는 테마성 급락 가능"},
     ],
     "pros": ["테마 대표주", "수주 레버리지", "정책 우호"],
     "cons": ["변동성 매우 큼", "기대 선반영", "실행 리스크"]},
    # 방산
    {"id": "s_hanwha", "theme": "defense", "name": "한화에어로스페이스", "code": "012450", "market": "KOSPI",
     "tag": "수출 방산", "risk": 64, "growth": 90, "score": 88,
     "thesis": "기동·유도·항공 포트폴리오와 수출 잔고가 실적을 뒷받침",
     "materials": [
         {"title": "수출 계약", "impact": "강세", "detail": "대규모 수출 계약·옵션 물량이 핵심 재료"},
         {"title": "방위비 증액", "impact": "강세", "detail": "우방국 방산 예산 확대가 중장기 수요"},
         {"title": "지정학 완화", "impact": "약세", "detail": "긴장 완화 시 테마 프리미엄 축소 가능"},
     ],
     "pros": ["수주잔고", "실적 가시성", "글로벌 수요"],
     "cons": ["고평가 구간", "이벤트 의존", "납기·원가"]},
    {"id": "s_liga", "theme": "defense", "name": "LIG넥스원", "code": "079550", "market": "KOSPI",
     "tag": "유도무기", "risk": 66, "growth": 87, "score": 84,
     "thesis": "유도무기·감시정찰 등 고부가 무기체계 중심의 성장",
     "materials": [
         {"title": "체계 수주", "impact": "강세", "detail": "신규 무기체계 양산·수출 논의가 촉매"},
         {"title": "R&D 성과", "impact": "중립", "detail": "개발 일정 준수가 신뢰도 좌우"},
         {"title": "방산 순환매", "impact": "약세", "detail": "업종 전체 과열 후 동반 조정 가능"},
     ],
     "pros": ["기술 장벽", "수출 잠재력", "정책 수혜"],
     "cons": ["수주 타이밍", "변동성", "밸류 부담"]},
    # 조선
    {"id": "s_hhi", "theme": "shipbuilding", "name": "HD현대중공업", "code": "329180", "market": "KOSPI",
     "tag": "조선 대장", "risk": 60, "growth": 84, "score": 83,
     "thesis": "고선가 수주 잔고가 향후 数年 실적으로 이연되는 업황형 종목",
     "materials": [
         {"title": "신조선 수주", "impact": "강세", "detail": "LNG·컨테이너 등 고부가 선종 수주가 핵심"},
         {"title": "선가·환율", "impact": "중립", "detail": "달러 수주·원가 구조가 마진 결정"},
         {"title": "후판·인건비", "impact": "약세", "detail": "원가 상승이 이익률을 제한할 수 있음"},
     ],
     "pros": ["수주잔고", "업황 개선", "대형주 유동성"],
     "cons": ["경기 민감", "원가 변수", "긴 리드타임"]},
    {"id": "s_samsungheavy", "theme": "shipbuilding", "name": "삼성중공업", "code": "010140", "market": "KOSPI",
     "tag": "해양·LNG", "risk": 67, "growth": 81, "score": 79,
     "thesis": "LNG·해양플랜트 경쟁력을 바탕으로 수익성 개선 기대",
     "materials": [
         {"title": "LNG선 슬롯", "impact": "강세", "detail": "슬롯 부족·선가 강세가 협상력 강화"},
         {"title": "해양 프로젝트", "impact": "중립", "detail": "대형 해양 수주는 변동성·수익성 동시 내포"},
         {"title": "인도 지연", "impact": "약세", "detail": "야드 일정 차질 시 비용 증가"},
     ],
     "pros": ["고부가 선종", "업황 연동", "개선 스토리"],
     "cons": ["실행 리스크", "변동성", "원자재"]},
    # 바이오
    {"id": "s_sambio", "theme": "bio", "name": "삼성바이오로직스", "code": "207940", "market": "KOSPI",
     "tag": "CDMO", "risk": 55, "growth": 85, "score": 86,
     "thesis": "글로벌 바이오 위탁생산 확대로 안정적 성장 스토리",
     "materials": [
         {"title": "공장 가동·수주", "impact": "강세", "detail": "신규 플랜트 램프업과 장기 수주가 핵심"},
         {"title": "환율", "impact": "중립", "detail": "달러 매출 비중이 손익에 영향"},
         {"title": "규제·감사", "impact": "약세", "detail": "품질·규제 이슈 발생 시 프리미엄 훼손"},
     ],
     "pros": ["안정 성장", "진입장벽", "글로벌 고객"],
     "cons": ["고밸류", "대형주 둔감", "규제"]},
    {"id": "s_cell", "theme": "bio", "name": "셀트리온", "code": "068270", "market": "KOSPI",
     "tag": "바이오시밀러", "risk": 68, "growth": 79, "score": 77,
     "thesis": "바이오시밀러 포트폴리오와 신약 파이프라인이 동시에 작동",
     "materials": [
         {"title": "제품 허가·출시", "impact": "강세", "detail": "주요 시장 허가·처방이 실적 재료"},
         {"title": "가격경쟁", "impact": "약세", "detail": "시밀러 가격 경쟁이 마진 압박"},
         {"title": "파이프라인", "impact": "중립", "detail": "신약·후속 시밀러 일정이 중기 동력"},
     ],
     "pros": ["제품 다변화", "캐시카우", "브랜드"],
     "cons": ["경쟁 심화", "정책 약가", "기대치"]},
    # 로봇
    {"id": "s_hyundai", "theme": "robot", "name": "현대차", "code": "005380", "market": "KOSPI",
     "tag": "로보틱스 옵션", "risk": 57, "growth": 78, "score": 80,
     "thesis": "본업 현금창출력에 로보틱스·SDV 옵션 가치가 가산되는 구조",
     "materials": [
         {"title": "로보틱스 공개", "impact": "강세", "detail": "휴머노이드·스마트팩토리 관련 뉴스가 테마 자극"},
         {"title": "자동차 판매", "impact": "중립", "detail": "본업 실적이 밸류에이션 하단 지지"},
         {"title": "투자 비용", "impact": "약세", "detail": "신사업 투자 확대로 단기 비용 증가 가능"},
     ],
     "pros": ["본업 체력", "테마 옵션", "유동성"],
     "cons": ["테마 과열", "자동차 경기", "실행 불확실성"]},
    {"id": "s_rainbow", "theme": "robot", "name": "레인보우로보틱스", "code": "277810", "market": "KOSDAQ",
     "tag": "협동로봇", "risk": 82, "growth": 88, "score": 78,
     "thesis": "협동로봇·플랫폼 기술과 대기업 지분 이슈가 결합된 고변동 성장주",
     "materials": [
         {"title": "대기업 협력", "impact": "강세", "detail": "전략적 투자·공동 개발 뉴스가 핵심 촉매"},
         {"title": "양산·수주", "impact": "중립", "detail": "실제 매출 전환 속도가 옥석 가리기 기준"},
         {"title": "수급 과열", "impact": "약세", "detail": "테마 매수세 이탈 시 낙폭 확대"},
     ],
     "pros": ["성장 스토리", "기술 차별성", "테마 대표"],
     "cons": ["고위험", "밸류 부담", "실적 가시성"]},
    # 에너지
    {"id": "s_s_oil", "theme": "energy", "name": "S-Oil", "code": "010950", "market": "KOSPI",
     "tag": "정제마진", "risk": 72, "growth": 70, "score": 71,
     "thesis": "정제마진·유가·환율 삼박자가 분기 실적을 좌우",
     "materials": [
         {"title": "정제마진", "impact": "강세", "detail": "마진 확대 구간에서 실적 서프라이즈 가능"},
         {"title": "유가 급등", "impact": "중립", "detail": "재고평가익과 수요 둔화가 동시에 존재"},
         {"title": "정기보수", "impact": "약세", "detail": "설비 보수 기간 출하 감소"},
     ],
     "pros": ["실적 레버리지", "배당 매력", "이벤트 헤지"],
     "cons": ["업황 급변", "지정학", "환경 규제"]},
    # 금융
    {"id": "s_kb", "theme": "finance", "name": "KB금융", "code": "105560", "market": "KOSPI",
     "tag": "배당·밸류업", "risk": 42, "growth": 64, "score": 76,
     "thesis": "안정적 이익과 주주환원 확대로 하방 지지가 강한 금융주",
     "materials": [
         {"title": "배당·자사주", "impact": "강세", "detail": "주주환원율 상향이 핵심 재료"},
         {"title": "금리", "impact": "중립", "detail": "순이자마진과 대출성장의 균형 확인"},
         {"title": "건전성", "impact": "약세", "detail": "충당금·PF 이슈가 할인 요인"},
     ],
     "pros": ["낮은 변동성", "배당", "밸류업"],
     "cons": ["성장성 제한", "금리 민감", "규제"]},
    {"id": "s_shinhan", "theme": "finance", "name": "신한지주", "code": "055550", "market": "KOSPI",
     "tag": "금융지주", "risk": 44, "growth": 63, "score": 74,
     "thesis": "비은행 포트폴리오와 주주환원으로 방어적 접근 가능",
     "materials": [
         {"title": "환원 정책", "impact": "강세", "detail": "배당·자사주 발표가 수급 지지"},
         {"title": "수수료 이익", "impact": "중립", "detail": "시장 거래대금·IB 환경에 연동"},
         {"title": "신용비용", "impact": "약세", "detail": "경기 둔화 시 충당금 증가"},
     ],
     "pros": ["안정성", "주주환원", "분산 포트폴리오"],
     "cons": ["낮은 베타", "성장 제한", "규제"]},
    # 콘텐츠
    {"id": "s_hybe", "theme": "content", "name": "하이브", "code": "352820", "market": "KOSPI",
     "tag": "엔터 IP", "risk": 73, "growth": 81, "score": 77,
     "thesis": "아티스트 IP·공연·MD·플랫폼이 결합된 글로벌 엔터 밸류체인",
     "materials": [
         {"title": "월드투어·신보", "impact": "강세", "detail": "대형 투어·컴백이 실적·센티먼트 동시 자극"},
         {"title": "플랫폼·MD", "impact": "중립", "detail": "팬덤 플랫폼·굿즈가 수익 다각화"},
         {"title": "활동 공백", "impact": "약세", "detail": "공백기에는 모멘텀 약화"},
     ],
     "pros": ["글로벌 팬덤", "IP 자산", "다각화"],
     "cons": ["히트 의존", "변동성", "인력·평판"]},
    {"id": "s_krafton", "theme": "content", "name": "크래프톤", "code": "259960", "market": "KOSPI",
     "tag": "게임 IP", "risk": 70, "growth": 80, "score": 78,
     "thesis": "배틀그라운드 IP 현금창출력과 신작·서브컬처 확장이 관건",
     "materials": [
         {"title": "신작·업데이트", "impact": "강세", "detail": "신작 흥행·시즌 업데이트가 이용자·매출 촉매"},
         {"title": "해외 매출", "impact": "중립", "detail": "지역별 마케팅·환율이 손익 영향"},
         {"title": "신작 부진", "impact": "약세", "detail": "기대작 실패 시 멀티플 하락"},
     ],
     "pros": ["현금창출력", "글로벌 IP", "신작 옵션"],
     "cons": ["흥행 리스크", "경쟁", "기대치"]},
]

for s in STOCKS:
    s["riskLabel"] = "낮음" if s["risk"] < 50 else ("보통" if s["risk"] < 70 else "높음")
    s["growthLabel"] = "낮음" if s["growth"] < 65 else ("보통" if s["growth"] < 80 else "높음")


def write(name, text):
    (ROOT / name).write_text(text, encoding="utf-8")
    print("wrote", name)


write("ads.txt", ADS)
write(
    "robots.txt",
    "User-agent: *\nAllow: /\nSitemap: %s/sitemap.txt\n" % CANON,
)
write(
    "sitemap.txt",
    "\n".join([CANON + "/", CANON + "/privacy.html"] + [f"{CANON}/detail.html?id={s['id']}" for s in STOCKS]) + "\n",
)

write(
    ".firebaserc",
    json.dumps(
        {
            "projects": {"default": "vaulted-acolyte-387217"},
            "targets": {"vaulted-acolyte-387217": {"hosting": {"theme": [SITE]}}},
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
)

write(
    "firebase.json",
    """{
  "hosting": {
    "target": "theme",
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**", "*.md", "_*", "*.py", "build_app.py"],
    "headers": [
      {
        "source": "/ads.txt",
        "headers": [
          { "key": "Content-Type", "value": "text/plain; charset=utf-8" },
          { "key": "Cache-Control", "value": "public, max-age=300" }
        ]
      },
      {
        "source": "/robots.txt",
        "headers": [
          { "key": "Content-Type", "value": "text/plain; charset=utf-8" },
          { "key": "Cache-Control", "value": "public, max-age=300" }
        ]
      },
      {
        "source": "**/*.@(html|js|css)",
        "headers": [
          { "key": "Cache-Control", "value": "no-cache, must-revalidate" }
        ]
      }
    ],
    "cleanUrls": true,
    "trailingSlash": false
  }
}
""",
)

data_js = (
    "window.THEME_DATA = "
    + json.dumps({"themes": THEMES, "stocks": STOCKS, "updatedAt": "2026-07-31"}, ensure_ascii=False, indent=2)
    + ";\n"
)
write("data.js", data_js)

write(
    "privacy.html",
    f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={PUB}" crossorigin="anonymous"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>개인정보처리방침 | 영재 테마주분석</title>
  <link rel="canonical" href="{CANON}/privacy.html">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="app narrow">
    <h1 style="margin:24px 0 12px">개인정보처리방침</h1>
    <p class="muted">본 사이트는 테마주·재료 분석 참고용 정보 사이트이며 Google AdSense 광고가 표시될 수 있습니다. 별도의 회원가입 없이 이용할 수 있습니다.</p>
    <p class="muted" style="margin-top:12px">광고 제공 과정에서 Google 등 제3자가 쿠키를 사용할 수 있습니다. 투자 판단의 최종 책임은 이용자 본인에게 있습니다.</p>
    <p style="margin-top:20px"><a class="btn btn-primary" href="/">홈으로</a></p>
  </div>
</body>
</html>
""",
)

print("core config done; writing html/css/js next via separate writes")
print("themes", len(THEMES), "stocks", len(STOCKS))
