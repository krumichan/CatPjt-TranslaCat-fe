'use strict';

const fieldRoles = {
    accountid:'계정 식별자', accountbookid:'대상 가계부 식별자', actor:'현재 요청을 수행하는 주체',
    actorid:'현재 요청을 수행하는 사용자 식별자', userid:'대상 사용자 식별자', publicid:'외부에 노출되는 사용자 식별자',
    authtoken:'인증에 사용할 토큰', authorization:'접근 자격을 전달하는 인증 헤더', token:'검증할 토큰',
    sessionid:'대상 세션 식별자', sessiontoken:'기존 계정 세션 증명', resumetoken:'저장 캐릭터를 다시 열기 위한 소유 증명',
    playerid:'대상 플레이어 식별자', characterid:'대상 캐릭터 식별자', serverid:'게임 서버 식별자',
    leaseid:'해당 프로필을 수정할 서버 리스 식별자', operationid:'같은 변경 요청을 식별하는 연산 ID',
    requestid:'중복 처리 여부를 판정할 요청 식별자', expectedrevision:'변경 요청이 기준으로 삼은 리비전',
    revision:'현재 데이터 리비전', expectedrank:'변경 요청이 기준으로 삼은 현재 등급', profilehash:'저장된 프로필의 무결성 해시',
    partyid:'대상 파티 식별자', itemid:'대상 아이템 식별자', roomid:'대상 채팅방 식별자', chatroomid:'대상 채팅방 식별자',
    questid:'대상 퀘스트 식별자', transactionid:'대상 거래 식별자', jobid:'대상 비동기 작업 식별자',
    messageid:'대상 메시지 식별자', segmentid:'대상 문장 또는 발화 구간 식별자', attemptid:'대상 시도 식별자',
    content:'본문 텍스트', title:'표시 제목', nickname:'표시 이름', email:'계정 이메일', password:'로그인 비밀번호',
    errorcode:'실패 분류에 사용하는 업무 코드', message:'결과를 설명하는 메시지', reason:'처리 결과의 사유',
    enable:'기능 활성화 선택값', enabled:'기능 활성화 여부', ok:'처리 성공 여부', duplicated:'기존 요청 처리 결과를 재사용했는지 여부',
    count:'항목 수', limit:'최대 처리 또는 조회 건수', page:'조회 페이지 번호', size:'한 번에 조회할 항목 수',
    cursor:'다음 조회 구간의 기준값', cursorid:'다음 조회 구간의 기준 식별자', sort:'조회 정렬 기준',
    sourcelanguage:'원문 언어 코드', targetlanguage:'결과를 생성할 대상 언어 코드', language:'해당 텍스트 또는 오디오의 언어 코드',
    request:'작업에 전달된 요청 데이터', response:'하위 처리 결과 또는 응답 객체', result:'현재 작업에서 계산하거나 가져온 결과',
    callback:'결과나 이벤트 발생 시 실행할 함수', cancellationtoken:'작업 중단을 하위 호출에 전달하는 취소 토큰',
    ct:'작업 중단을 하위 호출에 전달하는 취소 토큰', signal:'취소 여부를 전달하는 신호', abortsignal:'요청 중단을 전달하는 신호',
    slot:'선택한 장비 또는 화면 슬롯', position:'대상 위치', zone:'이동·조회에 사용하는 지역 식별자', hp:'캐릭터의 현재 체력',
    x:'X축 위치 또는 입력 성분', y:'Y축 위치 또는 입력 성분', z:'Z축 위치 또는 입력 성분',
    action:'요청한 조작 종류', expectedclassid:'요청 시점에 확인한 직업 식별자', classid:'적용하거나 조회할 직업 식별자',
    participants:'작업에 참여한 캐릭터들의 식별 정보', ticket:'입장 또는 연결에 사용할 단기 증명', expiresin:'만료까지 남은 시간',
};

const actions={
    get:'조회',list:'목록 조회',find:'검색',load:'읽기',fetch:'조회',query:'조회',read:'읽기',resolve:'확정',
    save:'저장',insert:'등록',create:'생성',register:'등록',add:'추가',append:'추가',put:'기록',enqueue:'대기열 등록',
    update:'수정',set:'설정',assign:'대입',replace:'교체',apply:'반영',adjust:'조정',increment:'증가',decrement:'감소',
    delete:'삭제',remove:'제거',clear:'초기화',reset:'초기화',invalidate:'무효화',cancel:'취소',
    parse:'파싱',decode:'해석',encode:'인코딩',serialize:'직렬화',deserialize:'역직렬화',
    verify:'검증',validate:'검증',check:'검사',ensure:'조건 확인',require:'필수 조건 확인',assert:'조건 확인',
    authenticate:'인증',authorize:'권한 확인',normalize:'정규화',trim:'양끝 공백 제거',format:'표시 형식 변환',compare:'비교',
    compute:'계산',calculate:'계산',map:'변환',collect:'수집',filter:'필터링',sort:'정렬',build:'구성',merge:'병합',
    translate:'번역',submit:'제출',accept:'수락',reject:'거절',issue:'발급',consume:'소비',
    start:'시작',stop:'중지',close:'종료',open:'열기',schedule:'예약',queue:'대기열 등록',retry:'재시도',
    send:'전송',publish:'게시',notify:'알림 발행',broadcast:'브로드캐스트',respond:'응답 생성',
    connect:'연결',disconnect:'연결 해제',commit:'확정',rollback:'롤백',begin:'시작',dispose:'자원 반환',
    push:'추가',pop:'마지막 항목 제거',test:'조건 검사',match:'일치 검사',copy:'복사',
};

function words(value) {
    return value.replace(/([A-Z]+)([A-Z][a-z])/g,'$1 $2').replace(/([a-z\d])([A-Z])/g,'$1 $2').replace(/[_$]+/g,' ').trim().split(/\s+/);
}

function describeRole(name,type='',fallback='') {
    const key=name.replace(/[_$]/g,'').toLowerCase();
    if (fieldRoles[key]) return fieldRoles[key]+'.';
    const parts=words(name);
    const last=parts.at(-1)?.toLowerCase();
    const subject=parts.slice(0,-1).join(' ');
    if(last==='id'&&subject) return subject+'을 식별하는 값.';
    if(last==='at'&&subject) return subject+'이 발생한 시각.';
    if(/^(is|has|can|should)$/i.test(parts[0])&&parts.length>1) return parts.slice(1).join(' ')+' 조건의 충족 여부.';
    if(/(?:Request|Command|Options|Params)\??$/.test(type)) return type.replace(/\?$/,'')+'에 정의된 입력 묶음.';
    return fallback;
}

function callAction(raw) {
    const name=raw.split(/::|->|\?\.|\./).at(-1)?.replace(/(?:Async|_async|_Implementation)$/,'')??'';
    const [verb,...rest]=words(name);
    const action=actions[verb?.toLowerCase()];
    if(!action) return name ? name+' 호출':'';
    const object=rest.join(' ')||raw.split(/::|->|\?\.|\./).slice(-2,-1)[0];
    return [object,action].filter(Boolean).join(' ');
}

function flowExpression(value) {
    const normalized=value.trim().replace(/^(?:return\b(?:@\w+)?|=>)\s*/,'').replace(/;\s*$/,'');
    if(/^[\w.$]+$/.test(normalized)) {
        const known={true:'참',false:'거짓',null:'값 없음',nullptr:'값 없음',None:'값 없음',undefined:'값 없음'};
        return known[normalized]??normalized.replace(/^(?:this|self)\./,'');
    }
    if(/^["'][^"'\n]{0,55}["']$/.test(normalized)) return normalized.slice(1,-1);
    if(/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return normalized;
    if(/^(?:new\s+)?[\w.$]+\((?:\s*|[^()]+)\)$/.test(normalized)) return callAction(normalized.slice(0,normalized.indexOf('(')).replace(/^new\s+/,''));
    if(/^(?:[\w.]+\.)?empty(?:List|Map|Set)\(/i.test(normalized)||/^(?:\[\s*\]|\{\s*\})$/.test(normalized)) return '빈 결과';
    return '';
}

function flowCondition(source,calls=[]) {
    const input=source.trim().replace(/^\((.*)\)$/,'$1').trim();
    const membership=input.match(/^([\w.]+)\s+is\s+(not\s+)?\(?((?:"[^"]+"(?:\s+or\s+)?)+)\)?$/);
    if(membership) {
        const values=[...membership[3].matchAll(/"([^"]+)"/g)].map(match=>match[1]).join('·');
        return membership[1]+' · '+values+(membership[2]?' 이외 값':' 중 하나');
    }
    const groups=input.split(/\s*(&&|\|\||\band\b|\bor\b)\s*/);
    if(groups.length>1&&groups.length<=7&&groups.every(part=>part.length<92)) {
        return groups.map(part=>({ '&&':'그리고',and:'그리고','||':'또는',or:'또는' })[part]??flowCondition(part,calls)).join(' · ');
    }
    const comparison=input.match(/^([\w.]+)\s*(===|!==|==|!=|>=|<=|>|<|is not|is)\s*([\w.-]+|"[^"]{0,40}")$/);
    if(comparison) {
        const [,field,operator,value]=comparison;
        const name=field.replace(/^(this|self)\./,'');
        const same=['===','==','is'].includes(operator);
        if(/^(null|undefined|nullptr|None)$/.test(value)) return name+(same?' 누락':' 존재');
        if(/^(true|false|True|False)$/.test(value)) return name+' '+((value.toLowerCase()==='true')===same?'참':'거짓');
        return name+' · '+value.replace(/^"|"$/g,'')+' '+({'===':'일치','==':'일치','is':'일치','!==':'불일치','!=':'불일치','is not':'불일치','>=':'이상','<=':'이하','>':'초과','<':'미만'})[operator];
    }
    const member=input.match(/^(!|not )?([\w.$]+)$/);
    if(member) return member[2].replace(/^(this|self)\./,'')+(member[1]?' 미충족':' 충족');
    const invoked=input.match(/^(?:!|not )?\s*([\w.]+)\(/)?.[1];
    if(invoked) {
        const result=input.match(/\)\s*(===|!==|==|!=|>=|<=|>|<)\s*([\w."-]+)$/);
        if(result) return callAction(invoked)+' 결과 · '+result[2].replace(/^"|"$/g,'')+' '+({'===':'일치','==':'일치','!==':'불일치','!=':'불일치','>=':'이상','<=':'이하','>':'초과','<':'미만'})[result[1]];
        return callAction(invoked)+(/^(?:!|not )/.test(input)?' 실패 여부':' 결과 확인');
    }
    if(calls.length) return callAction(calls[0])+' 결과 확인';
    return '복합 조건 판정';
}

function flowStep(source,calls) {
    const assignment=source.match(/^(?:(?:const|let|var|val|[\w<>\[\]?.]+)\s+)?([\w.$]+)\s*(\+=|-=|=(?!=|>))\s*(.+)/);
    if(assignment) {
        const [,target,operator,value]=assignment;
        const name=target.replace(/^(this|self)\./,'');
        if(operator!== '=') return name+' 수량 '+(operator==='+='?'추가':'차감');
        const key=flowExpression(value);
        if(key) return name+'에 '+key+' 대입';
        if(calls.length) return callAction(calls[0])+' 결과를 '+name+'에 보관';
        return name+' 계산 및 대입';
    }
    if(calls.length) return callAction(calls[0]);
    if(/^(?:using|await using|with)\b/.test(source)) return '작업 자원 범위 설정';
    if(/^(?:delete|del)\s+/.test(source)) return '대상 값 제거';
    return '값 계산 또는 상태 처리';
}

if(typeof module!=='undefined') module.exports={describeRole,callAction,flowExpression,flowCondition,flowStep};

