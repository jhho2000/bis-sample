// 버스 도착정보 시스템 JavaScript

// API 설정
const API_CONFIG = {
    serviceKey: 'm/9VboALWjAo9pYNN1maIHwWwTkOiGNzqU1lONuPOMQ/fLxxUJyzbGGS7x8kSurki2obf76kqX6D8L6ONqNR+g==',
    cityCode: '37350', // 사용자 제공 API URL의 cityCode
    upwardNodeId: 'YDB985', // 상행 노드 ID (동대구역)
    downwardNodeId: 'YDB986', // 하행 노드 ID (동대구역)

    // cityCode: '22', // 사용자 제공 API URL의 cityCode
    // upwardNodeId: 'DGB7011006700', // 상행 노드 ID (동대구역)
    // downwardNodeId: 'DGB7011006800', // 하행 노드 ID (동대구역)
    pageNo: 1,
    numOfRows: 100,
    type: 'xml'
};

// 샘플 버스 데이터 (API 연결 실패 시 사용할 백업 데이터)
const sampleBusData = {
    upward: [
        { busNumber: "101", destination: "영덕터미널", arrivalTime: 5 },
        { busNumber: "202", destination: "포항", arrivalTime: 12 },
        { busNumber: "303", destination: "대구", arrivalTime: 18 }
    ],
    downward: [
        { busNumber: "101", destination: "강구터미널", arrivalTime: 3 },
        { busNumber: "202", destination: "울진", arrivalTime: 8 },
        { busNumber: "303", destination: "후포", arrivalTime: 15 }
    ]
};

// 실제 버스 데이터를 저장할 객체
let busData = {
    upward: [],
    downward: []
};

// DOM 요소
const refreshBtn = document.getElementById('refresh-btn');
const currentDateElement = document.getElementById('current-date');
const currentTimeElement = document.getElementById('current-time');
const upwardBusList = document.getElementById('upward-bus-list');
const downwardBusList = document.getElementById('downward-bus-list');
const stationInfoElement = document.querySelector('.station-info');

// 현재 시간 표시 함수
function updateDateTime() {
    const now = new Date();
    
    // 날짜 포맷: YYYY-MM-DD
    const dateStr = now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    // 시간 포맷: HH:MM:SS
    const timeStr = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    currentDateElement.textContent = dateStr;
    currentTimeElement.textContent = timeStr;
}

// API URL 생성 함수
function createApiUrl(nodeId) {
    const encodedServiceKey = encodeURIComponent(API_CONFIG.serviceKey);
    return `https://apis.data.go.kr/1613000/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList?serviceKey=${encodedServiceKey}&pageNo=${API_CONFIG.pageNo}&numOfRows=${API_CONFIG.numOfRows}&_type=${API_CONFIG.type}&cityCode=${API_CONFIG.cityCode}&nodeId=${nodeId}`;
}

// XML 응답을 파싱하는 함수
function parseXmlResponse(xmlString) {
    console.log('XML 파싱 시작:', xmlString.substring(0, 300) + '...');
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    // 파싱 오류 체크
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        console.error('XML 파싱 오류:', parserError.textContent);
        return { busItems: [], stationName: '알 수 없음' };
    }
    
    // API 응답 오류 체크
    const errorCode = xmlDoc.querySelector('resultCode');
    if (errorCode && errorCode.textContent !== '00') {
        console.error('API 오류:', xmlDoc.querySelector('resultMsg')?.textContent);
        return { busItems: [], stationName: '알 수 없음' };
    }
    
    // 응답 구조 로깅
    console.log('응답 구조:', {
        header: xmlDoc.querySelector('header')?.textContent,
        body: xmlDoc.querySelector('body')?.textContent,
        items: xmlDoc.querySelector('items')?.textContent,
        totalCount: xmlDoc.querySelector('totalCount')?.textContent
    });
    
    // 정류장 이름 가져오기 (첫 번째 아이템에서)
    let stationName = '';
    const firstItem = xmlDoc.querySelector('item');
    if (firstItem) {
        stationName = firstItem.querySelector('nodenm')?.textContent || '알 수 없음';
        console.log('정류장 이름:', stationName);
    }
    
    // 아이템 목록 가져오기
    const items = xmlDoc.querySelectorAll('item');
    console.log('아이템 수:', items.length);
    
    // 버스 번호별로 가장 빠른 도착 정보를 저장할 객체
    const fastestBusByRoute = {};
    
    items.forEach((item, index) => {
        console.log(`아이템 ${index + 1}:`, item.textContent);
        
        // 필요한 데이터 추출
        const routeNo = item.querySelector('routeno')?.textContent || '알 수 없음';
        const routeType = item.querySelector('routetp')?.textContent || '';
        const arrTime = item.querySelector('arrtime')?.textContent || '0';
        
        // 목적지 정보가 없으므로 버스 유형을 활용하여 방면 정보 생성
        let destination = '알 수 없음';
        if (routeType.includes('순환')) {
            destination = '순환';
        } else if (routeType.includes('간선')) {
            destination = '시내';
        } else if (routeType.includes('지선')) {
            destination = '시내';
        } else if (routeType.includes('급행')) {
            destination = '급행';
        }
        
        // 분 단위로 변환 (초 단위로 제공되는 경우)
        const arrivalMinutes = Math.ceil(parseInt(arrTime) / 60);
        
        console.log(`버스 정보 - 번호: ${routeNo}, 유형: ${routeType}, 목적지: ${destination}, 도착시간: ${arrivalMinutes}분`);
        
        // 해당 버스 번호의 가장 빠른 도착 정보 업데이트
        if (!fastestBusByRoute[routeNo] || arrivalMinutes < fastestBusByRoute[routeNo].arrivalTime) {
            fastestBusByRoute[routeNo] = {
                busNumber: routeNo,
                destination: destination,
                arrivalTime: arrivalMinutes,
                stationName: stationName
            };
        }
    });
    
    // 객체를 배열로 변환하고 도착 시간 순으로 정렬
    const busItems = Object.values(fastestBusByRoute).sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    console.log('파싱된 버스 데이터 (버스별 가장 빠른 도착 정보, 도착 시간 순):', busItems);
    return { busItems, stationName };
}

// API에서 버스 정보 가져오기
async function fetchBusInfo() {
    // 데이터 로딩 표시
    upwardBusList.innerHTML = '<div class="loading"></div>';
    downwardBusList.innerHTML = '<div class="loading"></div>';
    
    try {
        // 상행 버스 정보 가져오기
        const upwardApiUrl = createApiUrl(API_CONFIG.upwardNodeId);
        console.log('상행 버스 API URL:', upwardApiUrl);
        
        console.log('상행 버스 API 요청 시작...');
        const upwardResponse = await fetch(upwardApiUrl);
        console.log('상행 버스 API 응답 상태:', upwardResponse.status, upwardResponse.statusText);
        
        if (!upwardResponse.ok) {
            throw new Error(`상행 버스 API 응답 오류: ${upwardResponse.status} ${upwardResponse.statusText}`);
        }
        
        const upwardXml = await upwardResponse.text();
        console.log('상행 버스 API 응답 수신 완료, 길이:', upwardXml.length);
        
        // 하행 버스 정보 가져오기
        const downwardApiUrl = createApiUrl(API_CONFIG.downwardNodeId);
        console.log('하행 버스 API URL:', downwardApiUrl);
        
        console.log('하행 버스 API 요청 시작...');
        const downwardResponse = await fetch(downwardApiUrl);
        console.log('하행 버스 API 응답 상태:', downwardResponse.status, downwardResponse.statusText);
        
        if (!downwardResponse.ok) {
            throw new Error(`하행 버스 API 응답 오류: ${downwardResponse.status} ${downwardResponse.statusText}`);
        }
        
        const downwardXml = await downwardResponse.text();
        console.log('하행 버스 API 응답 수신 완료, 길이:', downwardXml.length);
        
        // XML 파싱 및 버스 데이터 추출
        const upwardData = parseXmlResponse(upwardXml);
        busData.upward = upwardData.busItems;
        console.log('상행 버스 데이터 파싱 완료:', busData.upward);
        
        const downwardData = parseXmlResponse(downwardXml);
        busData.downward = downwardData.busItems;
        console.log('하행 버스 데이터 파싱 완료:', busData.downward);
        
        // 정류장 이름은 상행 데이터에서 가져옴
        const stationName = upwardData.stationName;
        
        // 정류장 정보 표시
        stationInfoElement.innerHTML = `<p>${stationName} (상행: ${API_CONFIG.upwardNodeId}, 하행: ${API_CONFIG.downwardNodeId})</p>`;
        
        // 버스 정보 표시
        displayBusList(upwardBusList, busData.upward);
        displayBusList(downwardBusList, busData.downward);
        
    } catch (error) {
        console.error('버스 정보를 가져오는 중 오류 발생:', error);
        
        // CORS 오류 확인
        if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
            console.warn('CORS 오류가 발생했습니다. 서버 측에서 CORS 설정이 필요할 수 있습니다.');
            stationInfoElement.innerHTML = `<p>버스정류장 (CORS 오류 - 샘플 데이터 표시 중)</p>`;
        } else {
            stationInfoElement.innerHTML = `<p>버스정류장 (API 연결 오류 - 샘플 데이터 표시 중)</p>`;
        }
        
        // 오류 발생 시 샘플 데이터 사용
        busData = { ...sampleBusData };
        
        // 샘플 데이터 표시
        displayBusList(upwardBusList, busData.upward);
        displayBusList(downwardBusList, busData.downward);
    }
}

// 버스 목록 표시 함수
function displayBusList(container, buses) {
    if (!buses || buses.length === 0) {
        container.innerHTML = '<div class="no-data">도착 예정 버스가 없습니다</div>';
        return;
    }
    
    container.innerHTML = '';
    
    buses.forEach(bus => {
        const busItem = document.createElement('div');
        busItem.className = 'bus-item';
        
        // 5분 이내 도착 버스는 깜빡임 효과 추가
        if (bus.arrivalTime <= 5) {
            busItem.classList.add('soon');
        }
        
        busItem.innerHTML = `
            <div class="bus-info-left">
                <div class="bus-number">${bus.busNumber}번</div>
                <div class="bus-destination">${bus.destination} 방면</div>
            </div>
            <div class="arrival-time">
                ${formatArrivalTime(bus.arrivalTime)}
            </div>
        `;
        
        container.appendChild(busItem);
    });
}

// 도착 시간 포맷 함수
function formatArrivalTime(minutes) {
    if (minutes <= 1) {
        return '곧 도착';
    } else {
        return `${minutes}분 후`;
    }
}

// 이벤트 리스너
refreshBtn.addEventListener('click', () => {
    fetchBusInfo();
});

// 초기화 함수
function init() {
    // 현재 시간 표시 및 1초마다 업데이트
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // 초기 버스 정보 가져오기
    fetchBusInfo();
    
    // 30초마다 버스 정보 자동 갱신
    setInterval(fetchBusInfo, 30000);
}

// 페이지 로드 시 초기화
window.addEventListener('load', init);
