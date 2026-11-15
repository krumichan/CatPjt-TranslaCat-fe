'use strict';

const sourceContractTitles={
    'POST /internal/v1/language-learning/listening/attempts/{attemptId}/audio-upload':'듣기 발화 오디오 업로드',
    'POST /internal/v1/model/execute-profile-stream':'모델 프로필 실행 스트림',
    'POST /internal/v1/model/execute-profile':'모델 프로필 실행',
    'POST /api/v1/chat/rooms/{roomId}/ai-members':'채팅방 AI 멤버 생성',
    'GET /api/v1/boards/{board}/posts':'게시판 게시글 목록 조회',
    'GET /internal/v1/novel/catalog/{platform}/snapshots/{id}':'소설 카탈로그 스냅샷 조회',
    'POST /api/account/[...path]':'웹 계정 설정 요청',
    'POST /api/account-deletion/[...path]':'웹 계정 삭제 요청',
    'GET /api/docs/search':'공개 가이드 검색'
};

const apiProfiles={
    be:['TranslaCat 백엔드','Spring 컨트롤러가 ResponseDto를 사용하면 resultCode, message, body, guid, createDate로 응답한다. 파일·스트림·리다이렉트 또는 별도 예외 처리 경로는 해당 API의 응답을 확인한다.'],
    fe:['웹 서버 경로','Next.js Route Handler는 브라우저 요청을 처리한다. 응답은 각 핸들러에 따라 JSON, 프록시 응답 또는 리다이렉트가 될 수 있다.'],
    ll:['언어 학습 내부 API','Ktor의 인증 범위와 호출별 성공·오류 모델을 따른다. 서비스의 내부 경로를 BE의 공개 경로와 구분한다.'],
    chat:['채팅 HTTP API','채팅 메시지 경로는 채팅 읽기 인증 정책으로 호출자의 사용자 ID를 확인한다. 각 API에서 처리 권한과 업무 오류를 확인한다.'],
    ai:['모델 서비스 API','FastAPI 라우터의 요청 모델과 응답 모델을 사용한다. 외부 API와 내부 API의 마운트가 다르다.'],
    novel:['소설 내부 API','BE 게이트웨이가 호출하는 내부 Spring API다. 공통 오류 처리는 이 서비스의 핸들러를 따른다.'],
    'character-store':['Mosslight 캐릭터 저장 API','이 API는 IPv4 루프백에서 제공한다. 공개 계정 경로를 제외한 저장 API는 X-Mosslight-Key로 호출을 검증한다.'],
    'game-server':['Mosslight 게임 서버 HTTP','이 목록은 게임 권위 서버의 관리·검증용 HTTP 경로다. 플레이 입력과 스냅샷은 게임 통신 문서를 확인한다.'],
    backend:['Fablewood 중앙 저장 API','공개 세션·계정 경로, Bearer 인증 경로와 X-Fable-Server-Key를 사용하는 서버 전용 경로를 나눈다. 업무 오류는 code와 message를 사용한다.'],
};

const commonBeFields=[['resultCode','integer','공통 응답 코드.'],['message','string','처리 결과 또는 오류의 안내 문구.'],['body','T','엔드포인트별 반환값. 오류 처리에서 ErrorDto가 들어갈 수 있다.'],['guid','string 또는 null','요청 컨텍스트의 추적 식별자.'],['createDate','string','응답 생성 시각. yyyy-MM-dd HH:mm:ss 형식.']];
const commonBeErrors=[['errorCode','string','업무 코드 또는 빈 문자열.'],['path','string','예외를 처리한 요청 경로.'],['trace','string','기본 공통 처리에서는 빈 문자열.']];
const commonChatFields=commonBeFields.map(row=>{
    if(row[0]==='body') return ['body','T','성공 시 해당 API의 반환값. 실패 시 ChatReadHttpError.'];
    if(row[0]==='guid') return ['guid','string','서버의 HTTP 요청 추적 식별자.'];
    return row;
});
const methodTag=method=>`<span class="method method-${method.toLowerCase()}">${escapeHtml(method)}</span>`;
const operationUrl=(project,op)=>`${project}/api/op/${op.key}`;
const reviewedKey=(project,op)=>`${project}/${op.repo}/${op.method} ${op.endpoint}`;
const fableErrors=[['400 또는 프레임워크 상태','invalid_request','요청을 읽거나 바인딩하지 못했다.'],['401','server_unauthorized','서버 전용 경로에 필요한 인증 키가 없거나 일치하지 않는다.'],['403','https_required','루프백 밖의 요청이 HTTPS를 사용하지 않았다.'],['503','database_unavailable','DB 연결 또는 처리 시간이 초과됐거나 DB 오류가 발생했다.'],['500','internal_error','예상하지 못한 서버 오류가 발생했다.']];
const mosslightErrors=[['400','invalid_request','요청 본문 또는 JSON 바인딩이 잘못됐다.'],['401','service_auth_required','서비스 키가 필요한 경로에서 키 검사를 통과하지 못했다.'],['403','본문 없음','루프백 밖에서 호출했다.'],['503','database_unavailable','MySQL 호출에 실패했다.'],['500','store_failure','다른 서버 오류가 발생했다.']];
const gameApiGroups={
    'game-server':[['diagnostics','상태와 진단',/^\/(?:health|state|test|shutdown)\b/]],
    'character-store':[
        ['accounts','계정과 캐릭터 접속',/^\/(?:auth|session|character)\b/],
        ['equipment','장비와 아이템',/^\/(?:equipment|cosmetics|item|shop)\b/],
        ['rewards','보상과 성장',/^\/(?:reward|.*-reward|achievement|class|skill-growth)\b/],
        ['world','월드와 던전 진행',/^\/(?:quest|.*-quest|dungeon|travel|gate-defense|field-coop)\b/],
        ['diagnostics','상태와 운영',/^\/(?:health|shutdown)\b/],
    ],
    backend:[
        ['online','계정과 접속',/^\/v1\/(?:accounts|sessions|join-tickets|servers)\b|^\/v1\/me$/],
        ['inventory','캐릭터와 인벤토리',/^\/v1\/me\/(?:inventory|character)\b|^\/v1\/server\/commit-(?:character|inventory)$/],
        ['market','교환과 시장',/^\/v1\/server\/(?:exchange|market)\b/],
        ['community','커뮤니티',/^\/v1\/server\/community$/],
        ['storage','리스와 프로필 저장',/^\/v1\/server\/(?:claim|commit|heartbeat|release)\b/],
        ['diagnostics','상태 조회',/^\/health$/],
    ],
};

function buildApiCatalog(operations) {
    const projects=new Map();
    for(const [project,list] of Object.entries(operations)) {
        const repos=new Map();
        const prepared=list.map(op=>{
            const file=files.get(op.id);
            const grouped=functionCatalog.groupsByFile.get(op.id);
            const repo=grouped?.repo??[...functionCatalog.projects.get(project).values()].find(repo=>repo.source===file.service);
            if(!repo) throw new Error(`API 저장소를 찾을 수 없습니다. ${file.service}`);
            const routeGroup=gameApiGroups[repo.id]?.find(([, ,pattern])=>pattern.test(op.endpoint));
            const feature=routeGroup?{id:routeGroup[0],label:routeGroup[1]}:grouped?.feature??{id:'common',label:'공통'};
            const section=routeGroup?null:grouped?.section;
            const group=section?{id:`${feature.id}-${section.id}`,label:section.label,parent:feature.label}:feature;
            const operation={...op,project,repo:repo.id,group:group.id};
            const target=contracts.reviewedHttp[reviewedKey(project,operation)]?.function;
            if(target) {
                const [scope,name]=target;
                const matches=index.functions.filter(([id,label,owner])=>label===name&&owner===scope&&files.get(id.split('-')[0]).project===project);
                if(matches.length===1) operation.handlerId=matches[0][0];
            }
            if(!repos.has(repo.id)) repos.set(repo.id,{id:repo.id,label:repo.label,groups:new Map(),operations:[]});
            const service=repos.get(repo.id);
            if(!service.groups.has(group.id)) service.groups.set(group.id,{id:group.id,label:group.label,parent:group.parent,operations:[]});
            service.groups.get(group.id).operations.push(operation);
            service.operations.push(operation);
            return operation;
        });
        projects.set(project,{repos,operations:prepared});
    }
    return {projects};
}

function apiMenu(project,open,selected,rest) {
    const catalog=apiCatalog.projects.get(project);
    const repos=catalog?.repos;
    if(!repos?.size) return '';
    const op=selected==='op'?catalog.operations.find(operation=>operation.key===rest[0]):null;
    const activeRepo=op?.repo??selected;
    const activeGroup=op?.group??rest[0];
    const root=`${project}/api`;
    return `<details${open?' open':''}><summary>API 명세</summary>${link(root,'서비스 목차',open&&!selected)}${[...repos.values()].map(repo=>{
        const route=`${root}/${repo.id}`;
        const repoLink=link(route,repo.label,open&&activeRepo===repo.id&&!activeGroup);
        if(!open||activeRepo!==repo.id) return repoLink;
        const sections=apiGroups(repo);
        const groupLinks=[...sections].map(([parent,groups])=>{
            const links=groups.map(group=>link(`${route}/${group.id}`,group.label,activeGroup===group.id)).join('');
            return parent?`<details${groups.some(group=>activeGroup===group.id)?' open':''}><summary>${escapeHtml(parent)}</summary>${links}</details>`:links;
        }).join('');
        return `<div class="api-menu-group">${repoLink}${link(`${route}/common-http`,'공통 HTTP 계약',activeGroup==='common-http')}${groupLinks}</div>`;
    }).join('')}</details>`;
}

function apiGroups(repo) {
    const sections=new Map();
    const groups=[...repo.groups.values()].sort((a,b)=>(a.parent??a.label).localeCompare(b.parent??b.label,'ko')||a.label.localeCompare(b.label,'ko'));
    for(const group of groups) {
        if(!sections.has(group.parent)) sections.set(group.parent,[]);
        sections.get(group.parent).push(group);
    }
    return sections;
}

function apiCommon(project,repo) {
    const profile=apiProfiles[repo.id]??[repo.label,'HTTP 계약은 엔드포인트의 요청과 응답 정의를 확인한다.'];
    let detail=`<p>${escapeHtml(profile[1])}</p>`;
    if(repo.id==='be') {
        detail+='<h2>공통 응답</h2>'+definitionsTable(['필드','타입','설명'],commonBeFields,[0,1]);
        detail+='<h2>공통 오류 본문</h2>'+definitionsTable(['필드','타입','설명'],commonBeErrors,[0,1]);
        detail+='<p>보호 경로의 인증 실패는 필터에서 HTTP 401과 빈 본문을 반환할 수 있다. 공통 예외 처리기는 유형에 따라 HTTP 상태를 정하고 ErrorDto를 body에 담는다.</p>';
        detail+='<h2>가계부 거래 공통 오류</h2>'+definitionsTable(['HTTP','응답 형식','발생 조건'],contracts.transaction.common.errors,[0,1]);
    }
    if(repo.id==='chat') {
        detail+='<h2>공통 응답 · ChatReadHttpResponse&lt;T&gt;</h2>'+definitionsTable(['필드','타입','설명'],commonChatFields,[0,1]);
        detail+='<h2>공통 오류 본문 · ChatReadHttpError</h2>'+definitionsTable(['필드','타입','설명'],commonBeErrors,[0,1]);
        detail+='<h2>채팅 메시지 공통 오류</h2>'+definitionsTable(['HTTP','body.errorCode','발생 조건'],contracts.chatMessages.commonErrors,[0,1]);
        detail+=jsonSample('HTTP 401 오류 형식 예시',{resultCode:401,message:'Message <UNAUTHORIZED>',body:{errorCode:'UNAUTHORIZED',path:'/api/v1/chat/rooms/123/messages',trace:''},guid:'request-example',createDate:'2026-11-13 17:00:00'});
    }
    if(repo.id==='ll') {
        detail+='<h2>InternalApiError</h2>'+definitionsTable(['필드','타입','설명'],[
            ['code','string','내부 라우트 또는 업무 예외 코드'],['message','string','호출자에게 전달하는 오류 설명']
        ],[0,1])+jsonSample('오류 본문 예시',{code:'INVALID_REQUEST',message:'요청 JSON 형식과 필드 값을 확인해 주세요.'});
    }
    if(repo.id==='fe') {
        detail+='<h2>계정 라우트 응답</h2><p>계정 관련 라우트의 authJson은 HTTP 상태와 Cache-Control 헤더를 설정하고 body 필드에 결과를 넣습니다.</p>'+
            jsonSample('인증 오류 예시',{body:{errorCode:'AUTH_REQUIRED'}})+
            '<p>공개 가이드 검색과 NextAuth 경로는 각 엔드포인트의 응답 계약을 따릅니다.</p>';
    }
    if(repo.id==='novel') {
        detail+='<h2>NovelProblem 응답</h2>'+definitionsTable(['필드','타입','설명'],[
            ['code','string','소설 API 실패 분류'],['retryable','boolean','실패 후 재요청 허용 여부'],
            ['retryAfterMilliseconds','integer','재요청 대기 시간. NovelProblem 처리기에서 반환']
        ],[0,1]);
    }
    if(repo.id==='backend') detail+='<h2>서버 경로 공통 오류</h2>'+definitionsTable(['HTTP','code','발생 조건'],fableErrors,[0,1]);
    if(repo.id==='character-store') detail+='<h2>저장 API 공통 오류</h2>'+definitionsTable(['HTTP','error','발생 조건'],mosslightErrors,[0,1])+jsonSample('공통 오류 형식',{ok:false,error:'invalid_request',character:null,duplicated:false});
    return heading('공통 HTTP 계약',' / '+link(project,products[project])+' / '+link(`${project}/api`,'API 명세')+' / '+link(`${project}/api/${repo.id}`,repo.label))+
        `<p class="meta">${escapeHtml(profile[0])}</p>${detail}`;
}

function renderPayload(title,type,rows=[]) {
    return `<h3>${escapeHtml(title)}</h3><p><code>${escapeHtml(type)}</code></p>`+
        (rows.length?definitionsTable(['필드','타입','구분','설명'],rows,[0,1]):'');
}

function jsonSample(label,value) {
    return `<h3>${escapeHtml(label)}</h3><pre class="json-block"><code>${escapeHtml(JSON.stringify(value,null,2))}</code></pre>`;
}

function transactionOperation(op) {
    if(op.scope!=='AccountBookTransactionController') return null;
    return contracts.transaction.operations[op.handler]??null;
}

function analysisOperation(op) {
    const spec=contracts.analysisSpec;
    const operation=spec.paths[op.endpoint]?.[op.method.toLowerCase()];
    return op.repo==='be'&&operation?operation:null;
}

function chatMessageOperation(op) {
    return op.scope===contracts.chatMessages.scope?contracts.chatMessages.operations[op.handler]??null:null;
}

function apiTitle(op) {
    return transactionOperation(op)?.title??chatMessageOperation(op)?.title??analysisOperation(op)?.summary??contracts.reviewedHttp[reviewedKey(op.project,op)]?.title??sourceContractTitles[op.method+' '+op.endpoint]??op.summary??op.handler??op.endpoint;
}

function isReviewedApi(op) {
    return Boolean(transactionOperation(op)||chatMessageOperation(op)||analysisOperation(op)||contracts.reviewedHttp[reviewedKey(op.project,op)]||
        op.sourceContract&&!op.sourceContractGaps.length);
}

function coveragePage() {
    const rows=[];
    for(const [project,repositories] of functionCatalog.projects) {
        for(const repo of repositories.values()) {
            const operations=apiCatalog.projects.get(project)?.repos.get(repo.id)?.operations??[];
            const functions=repo.entries.filter(([id,name,scope])=>{
                const file=files.get(id.split('-')[0]);
                return Boolean(findFunctionDefinition({id,name,scope,file},true));
            }).length;
            const typePrefix=`${project}/${repo.source}/`;
            const types=Object.entries(contracts.schemas).filter(([key,fields])=>key.startsWith(typePrefix)&&fields?.length).length;
            rows.push([products[project],repo.label,repo.entries.length,functions,operations.length,operations.filter(isReviewedApi).length,types]);
        }
    }
    return articleHtml(pages.scope)+
        '<h2>저장소별 문서 현황</h2><p>함수와 HTTP 경로는 수집한 선언을 기준으로 센다. 상세 명세는 소스 대조를 마친 업무 문서와 기존 OpenAPI를 포함한다. 타입은 필드 선언을 확인한 모델 수다.</p>'+
        definitionsTable(['제품','서비스','함수 색인','상세 함수','HTTP 경로','상세 API','타입 선언'],rows)+
        '<h2>API 확인이 남은 경로</h2><ul>'+Object.entries(contracts.contractCoverage.stats).map(([project,status])=>
            '<li>'+link('scope/api/'+project,`${products[project]} · ${status.pending}개 경로`)+'</li>').join('')+'</ul>';
}

function contractAudit(project) {
    if(!products[project]) throw new Error('검토할 제품을 찾을 수 없습니다.');
    const rows=contracts.contractCoverage.pending.filter(row=>row.project===project).map(row=>[
        row.service,row.method+' '+row.endpoint,row.details.join(' · '),row.key,
    ]);
    const title=heading(products[project]+' API 검토 항목',' / '+link('scope','설계 검토 범위'));
    if(!rows.length) return title+'<p>현재 색인에 남은 API 계약 항목은 없습니다.</p>';
    return title+'<p>정적 대조에서 요청 필수 여부, 성공 본문 또는 개별 오류 조건을 확정하지 못한 경로를 표시합니다.</p>'+
        definitionsTable(['구현 영역','경로','추가 확인','문서'],rows,[1],(value,column)=>column===3?link(`${project}/api/op/${value}`,'명세 열기'):undefined);
}

function operationsList(project, repo, group, page) {
    const all=group?.operations??repo.operations;
    const size=30;
    const last=Math.max(1,Math.ceil(all.length/size));
    const current=Math.min(last,Math.max(1,Number(page)||1));
    const route=`${project}/api/${repo.id}/${group?.id??'all'}`;
    return `<ul class="entries api-entries">${all.slice((current-1)*size,current*size).map(op=>`<li>${methodTag(op.method)} <a href="#${operationUrl(project,op)}"><code>${escapeHtml(op.endpoint)}</code></a><span class="meta">${escapeHtml(apiTitle(op))}${isReviewedApi(op)?'':' · 구현 대조'}</span></li>`).join('')}</ul>`+
        `<div class="pager">${current>1?link(route+'/'+(current-1),'이전'):''}<span>${current} / ${last}</span>${current<last?link(route+'/'+(current+1),'다음'):''}</div>`;
}

function apiIndex(project,repo,group,page) {
    const root=`${project}/api`;
    const trail=' / '+link(project,products[project]);
    if(!repo) return heading('API 명세',trail)+`<div class="cards">${[...apiCatalog.projects.get(project).repos.values()].map(service=>`<a class="card" href="#${root}/${service.id}"><strong>${escapeHtml(service.label)}</strong><span>${service.operations.length}개 엔드포인트 · 상세 ${service.operations.filter(isReviewedApi).length}개</span></a>`).join('')}</div>`;
    const groupTrail=trail+' / '+link(root,'API 명세')+(group?' / '+link(`${root}/${repo.id}`,repo.label):'');
    const common=`<p>${link(`${root}/${repo.id}/common-http`,'공통 인증과 응답 형식')}</p>`;
    if(group||page) return heading(group?.label??'전체 엔드포인트',groupTrail)+common+operationsList(project,repo,group,page);
    const blocks=[...apiGroups(repo)].map(([parent,groups])=>{
        const cards=groups.map(item=>`<a class="card" href="#${root}/${repo.id}/${item.id}"><strong>${escapeHtml(item.label)}</strong><span>${item.operations.length}개 엔드포인트</span></a>`).join('');
        return `<h2>${escapeHtml(parent??'서비스 기능')}</h2><div class="cards">${cards}</div>`;
    }).join('');
    return heading(repo.label,groupTrail)+common+blocks+`<p>${link(`${root}/${repo.id}/all/1`,'이 서비스의 API 전체 보기')}</p>`;
}

function parameterTable(request,meanings={},operation) {
    if(!request.length) return '';
    return definitionsTable(['위치','이름','타입','필수 여부','설명'],request.map(row=>[row.position,row.wireName??row.name,row.type,row.required,meanings[row.name]??[parameterDescription(row),row.defaultValue!==undefined?`기본값 ${row.defaultValue}.`:'',row.constraints].filter(Boolean).join(' ')]),[1,2],(value,column)=>operation&&column===2?typeReference(operation.project,operation.repo,value):undefined);
}

function transactionDetail(op,definition) {
    const types=contracts.transaction.types;
    const responseType=definition.response.replace(/\[\]$/,'');
    const success=Object.hasOwn(definition,'bodyExample')?jsonSample('200 응답 예시',{resultCode:200,message:'OK',body:definition.bodyExample,guid:null,createDate:'2026-11-13 17:00:00'}):'';
    const extras=definition.request==='AccountBookTransactionRequestDto'?renderPayload('차트 필터','AccountBookChartTransactionFilterDto',types.AccountBookChartTransactionFilterDto)+renderPayload('페이지 설정','Pagination',types.Pagination):'';
    const item=definition.response==='AccountBookTransactionListResponseDto'?renderPayload('거래 항목','AccountBookTransactionResponseDto',types.AccountBookTransactionResponseDto):'';
    return `<p>${escapeHtml(definition.description)}</p><h2>요청</h2>${parameterTable(op.request.filter(row=>row.position!=='body'))}`+
        (definition.request?renderPayload('JSON 본문',definition.request,types[definition.requestFields??definition.request])+extras:'<p>요청 본문이 없다.</p>')+
        (definition.example?jsonSample('요청 본문 예시',definition.example):'')+
        `<h2>성공 응답</h2><p>${escapeHtml(definition.result)}</p>`+renderPayload('HTTP 200',`ResponseDto<${definition.response}>`,types[responseType])+item+success+
        '<h2>오류 응답</h2>'+(definition.errors?.length?definitionsTable(['HTTP','응답 형식','발생 조건'],definition.errors,[0,1]):'')+
        `<p>${link('translacat/api/be/common-http','가계부 거래 공통 오류와 응답 형식')}</p>`;
}

function chatMessageDetail(op,definition) {
    const {types,wrapper,errorType}=contracts.chatMessages;
    const itemType='ChatMessageResponseDto';
    const models=[...new Set([definition.response,itemType,'ChatMessageTranslationResponseDto','OpenChatMessageSenderResponseDto'])];
    const example=definition.response==='ChatMessagePageResponseDto'?jsonSample('HTTP 200 응답 형식 예시',{resultCode:200,message:'OK',body:{messages:[],nextCursorId:null,hasNext:false},guid:'request-example',createDate:'2026-11-13 17:00:00'}):'';
    return `<p>${escapeHtml(definition.description)}</p><h2>요청</h2>${parameterTable(op.request.filter(row=>row.position!=='body'),definition.parameters)}`+
        (definition.request?renderPayload('JSON 본문',definition.request,types[definition.request]):'<p>요청 본문이 없다.</p>')+
        (definition.example?jsonSample('요청 본문 예시',definition.example):'')+
        `<h2>성공 응답</h2><p>${escapeHtml(definition.result)}</p><p><code>${escapeHtml(`${wrapper}<${definition.response}>`)}</code></p>`+
        models.map((type,i)=>i===0?renderPayload('응답 본문',type,types[type]):`<details><summary>${escapeHtml(type)}</summary>${renderPayload('응답 필드',type,types[type])}</details>`).join('')+example+
        `<h2>오류 응답</h2><p><code>${escapeHtml(errorType)}</code></p>`+
        (definition.errors?.length?definitionsTable(['HTTP','body.errorCode','발생 조건'],definition.errors,[0,1]):'')+
        `<p>${link('translacat/api/chat/common-http','채팅 메시지 공통 오류와 응답 형식')}</p>`;
}

function reviewedHttpDetail(op,definition) {
    const {description,parameters,request,requestFormat,requestFields,requestExample,status=200,response,responseFields,responseModel,errorType,errors,errorExample,example,capture}=definition;
    const captures=capture?contracts.gameCaptures.filter(item=>item.product===op.project&&item.method===op.method&&item.path===op.endpoint&&item.body!==null):[];
    const bindings=op.request.filter(row=>row.position==='path'&&!parameters?.some(([position,name])=>position==='path'&&name===row.name));
    const model=contracts.typeDefinitions[`${op.project}/${op.repo}/${responseModel}`];
    return `<p>${escapeHtml(description)}</p><h2>요청</h2>`+
        parameterTable(bindings)+
        (parameters?definitionsTable(['위치','이름','타입','필수 여부','설명'],parameters,[1,2]):'')+
        (request?'<h3>JSON 본문</h3><p>'+typeReference(op.project,op.repo,request)+'</p>'+(requestFields?.length?definitionsTable(['필드','타입','구분','설명'],requestFields,[0],(value,column)=>column===1?typeReference(op.project,op.repo,value):undefined):''):requestFormat?'<p>'+escapeHtml(requestFormat)+'</p>':'<p>요청 본문이 없다.</p>')+
        (requestExample?jsonSample('요청 본문 예시',requestExample):'')+
        `<h2>성공 응답</h2><h3>HTTP ${escapeHtml(status)}</h3><p>${typeReference(op.project,op.repo,response)}</p>`+
        (responseFields?.length?definitionsTable(['필드','타입','구분','설명'],responseFields,[0],(value,column)=>column===1?typeReference(op.project,op.repo,value):undefined):'')+
        (model?(responseFields?.length?'<p>타입 정의 '+typeReference(op.project,op.repo,responseModel)+'</p>':'<h3>응답 모델</h3>'+typeFields(model,false,op.project,op.repo)):responseModel?(contracts.httpPayloads[responseModel]?renderPayload('응답 모델',responseModel,contracts.httpPayloads[responseModel]):implementationSchema(op,responseModel)):'')+(example?jsonSample('성공 응답 형식 예시',example):'')+
        '<h2>오류 응답</h2>'+(errorType?`<p><code>${escapeHtml(errorType)}</code></p>`:'')+
        (errors.length?definitionsTable(['HTTP','오류 값','발생 조건'],errors,[0,1]):'<p>이 경로가 직접 반환하는 오류 응답은 선언되어 있지 않다.</p>')+
        (errorExample?jsonSample('오류 응답 형식 예시',errorExample):'')+
        (captures.length?'<h2>격리 환경 실제 응답</h2>'+captures.map(item=>jsonSample(`HTTP ${item.http}`,item.body)).join(''):'');
}

function openApiValue(value) {
    if(value?.$ref) return value.$ref.split('/').slice(1).reduce((node,key)=>node?.[key],contracts.analysisSpec);
    return value;
}

function schemaType(schema) {
    if(!schema) return '확인 필요';
    if(schema.$ref) return schema.$ref.split('/').at(-1);
    if(schema.items) return schemaType(schema.items)+'[]';
    if(schema.oneOf||schema.anyOf) return (schema.oneOf??schema.anyOf).map(schemaType).join(' | ');
    return (Array.isArray(schema.type)?schema.type.join(' | '):schema.type)??'object';
}

function schemaTable(schema,visited=new Set()) {
    const resolved=openApiValue(schema);
    if(!resolved||visited.has(resolved)) return '';
    visited.add(resolved);
    if(!resolved.properties) {
        const branches=[...(resolved.oneOf??[]),...(resolved.anyOf??[]),...(resolved.items?[resolved.items]:[])];
        return branches.map(item=>schemaTable(item,visited)).join('');
    }
    const required=new Set(resolved.required??[]);
    return definitionsTable(['필드','타입','구분','설명'],Object.entries(resolved.properties).map(([name,value])=>[name,schemaType(value),required.has(name)?'필수':'선택',[value.description,value.enum?.join(' / '),value.minimum!==undefined?`최솟값 ${value.minimum}`:'',value.maximum!==undefined?`최댓값 ${value.maximum}`:''].filter(Boolean).join(' · ')||'—']),[0,1])+
        Object.entries(resolved.properties).map(([name,value])=>{
            const nested=schemaTable(value,visited);
            return nested?`<details><summary>${escapeHtml(name)} 상세</summary>${nested}</details>`:'';
        }).join('');
}

function specContent(data,showExample=true) {
    const json=data?.content?.['application/json'];
    if(!json) return '';
    const example=json.example??Object.values(json.examples??{})[0]?.value;
    return `<p><code>${escapeHtml(schemaType(json.schema))}</code></p>`+schemaTable(json.schema)+(showExample&&example!==undefined?jsonSample('JSON 예시',example):'');
}

function analysisDetail(op,definition) {
    const parameters=[...(contracts.analysisSpec.paths[op.endpoint].parameters??[]),...(definition.parameters??[])].map(openApiValue);
    const parameterRows=parameters.map(item=>[item.in,item.name,schemaType(item.schema),item.required?'필수':'선택',item.description??'—']);
    const outcomes=Object.entries(definition.responses??{}).map(([status,value])=>[status,openApiValue(value)]);
    const responseSections=rows=>rows.map(([status,value])=>`<details${status.startsWith('2')?' open':''}><summary>HTTP ${escapeHtml(status)} · ${escapeHtml(value.description??'')}</summary>${specContent(value)}</details>`).join('');
    return `<p>${escapeHtml(definition.description??definition.summary??'가계부 소비 분석 API.')}</p><h2>요청</h2>`+
        (parameterRows.length?definitionsTable(['위치','이름','타입','필수 여부','설명'],parameterRows,[1,2]):'')+
        (definition.requestBody?specContent(openApiValue(definition.requestBody)):'<p>요청 본문이 없다.</p>')+
        '<h2>성공 응답</h2>'+responseSections(outcomes.filter(([status])=>status.startsWith('2')))+
        '<h2>오류 응답</h2>'+responseSections(outcomes.filter(([status])=>!status.startsWith('2')))+
        `<p>${link('translacat/spending-api','소비 분석 전체 계약과 실행 검증')}</p>`;
}

function implementationSchema(op,type,request=false,visited=new Set(),open=true,overrides) {
    const service=files.get(op.id)?.service;
    const names=type?.match(/[A-Za-z_$][\w$]*/g)??[];
    return names.map(name=>{
        const fields=(open&&name===type?overrides:undefined)??contracts.schemas[`${files.get(op.id)?.project}/${service}/${name}`];
        if(!fields||visited.has(name)) return '';
        visited.add(name);
        const table=definitionsTable(['필드','타입',request?'필수 여부':'반환 여부','설명·제약'],fields.map(field=>[
            field.wireName??field.name,field.type,request?(field.required==='선언상 인자'?'검증 규칙 확인 필요':field.required):field.type.endsWith('?')?'null 허용':'모델 필드',
            [field.description??describeRole(field.name,field.type),field.constraints,field.defaultValue!==undefined?`기본값 ${field.defaultValue}`:''].filter(Boolean).join(' · ')||'—',
        ]),[0],(value,column)=>column===1?typeReference(op.project,op.repo,value):undefined);
        return `<details${open?' open':''}><summary>${escapeHtml(name)} 필드</summary>${table}${fields.map(field=>implementationSchema(op,field.type,request,visited,false)).join('')}</details>`;
    }).join('');
}

function implementationApiDetail(op) {
    const title=op.description?`<p>${escapeHtml(op.description)}</p>`:'';
    const models=new Set();
    const schemaOwner=peerKey=>apiCatalog.projects.get(op.project)?.operations.find(other=>other.key===peerKey)??op;
    const meanings=Object.fromEntries(op.request.map(row=>[row.name,[row.description||describeRole(row.name,row.type)||parameterDescription(row),row.constraints,row.defaultValue===undefined?'':'기본값 '+row.defaultValue].filter(Boolean).join(' · ')]));
    const variants=op.success??[];
    const returned=variants.map(({status,type,fields=[],description,peerKey})=>{
        const envelope=/^(?:ResponseDto|ChatReadHttpResponse)</.test(type);
        const fieldsHtml=fields.length?(envelope?'<p>공통 응답의 body 필드</p>':'')+
            definitionsTable(['필드','타입','반환 여부','설명'],fields.map(field=>[
                field.wireName??field.name,field.type,field.type.endsWith('?')?'null 허용':
                    field.required==='조건부'?'조건부':field.required==='null 허용'?'null 허용':'반환',
                field.description||describeRole(field.name,field.type)||'—',
            ]),[0,1]):'';
        const statusLabel=/^\d{3}$/.test(status??'')?'HTTP '+status:status||'응답 상태';
        const peer=peerKey?link(op.project+'/api/op/'+peerKey,'연결된 엔드포인트 계약'):'';
        return `<h3>${escapeHtml(statusLabel)}</h3><p>${typeReference(op.project,op.repo,type)}</p>${description?'<p>'+escapeHtml(description)+'</p>':''}${fieldsHtml}${fieldsHtml?'':implementationSchema(schemaOwner(peerKey),type)}${fields.map(field=>implementationSchema(schemaOwner(peerKey),field.type,false,new Set(),false)).join('')}${peer?'<p>'+peer+'</p>':''}`;
    }).join('');
    const errors=(op.errors??[]).map(row=>[row.status??'상태 매핑 확인 필요',row.code,row.format??'서비스 오류',row.condition,row.functionId??'']);
    const evidence=op.sourceContract?'<p class="meta">라우트 및 연결된 서비스 소스 기준</p>':
        '<p class="notice">라우트와 연결이 확인된 처리 함수에서 읽은 계약입니다. 실제 직렬화는 별도 검증 범위입니다.</p>';
    const notes=op.contractNotes?.length?'<ul>'+op.contractNotes.map(note=>'<li>'+escapeHtml(note)+'</li>').join('')+'</ul>':'';
    return title+evidence+
        (op.counterpart?'<p>'+link(op.project+'/api/op/'+op.counterpart,'언어 학습 내부 API 명세')+'</p>':'')+notes+
        '<h2>요청</h2>'+(parameterTable(op.request,meanings,op)||'<p>이 경로에서 별도 요청 매개변수를 읽는 부분이 없습니다.</p>')+
        op.request.map(row=>row.fields?.length?'<details open><summary>'+escapeHtml(row.description||row.type)+' 필드</summary>'+
            definitionsTable(['필드','타입','필수 여부','설명·제약'],row.fields.map(field=>[field.wireName??field.name,field.type,field.required,
                [field.description||describeRole(field.name,field.type),field.constraints,field.defaultValue===undefined?'':'기본값 '+field.defaultValue].filter(Boolean).join(' · ')||'—']),[0,1])+
            row.fields.map(field=>implementationSchema(op,field.type,true,models,false)).join('')+'</details>':
            implementationSchema(op,row.type,true,models)).join('')+
        '<h2>성공 응답</h2>'+(returned||'<p>응답을 직접 구성하거나 다른 서버의 결과를 전달합니다. 구체적인 성공 본문을 확인해야 합니다.</p>')+
        '<h2>오류 응답</h2>'+(errors.length?definitionsTable(['HTTP','업무 코드','오류 형식','조건','처리 함수'],errors,[0,1,2],(value,column)=>column===4?(value?functionLink(value)||'—':'—'):undefined):
            '<p>구현에서 선언한 개별 오류 응답이 없습니다. 공통 오류는 서비스 공통 계약을 확인합니다.</p>');
}

function apiDetail(project,repo,op) {
    const cancel=analysisOperation(op)?.operationId==='cancelSpendingAnalysisJob';
    const tx=transactionOperation(op);
    const chat=chatMessageOperation(op);
    const analysis=analysisOperation(op);
    const reviewed=contracts.reviewedHttp[reviewedKey(project,op)];
    const peer=reviewed?.peer;
    const paired=peer&&apiCatalog.projects.get(project).repos.get(peer.repo)?.operations.find(operation=>operation.method===peer.method&&operation.endpoint===peer.endpoint);
    const flows=contracts.flowApiLinks?.[reviewedKey(project,op)]??[];
    const system=systemCatalog.get(project).operationHomes.get(op.key);
    const handler=operationHandler(op);
    const definitionHandler=reviewed?.function&&op.handlerId?op.handlerId:handler;
    const [routeState,fileId]=implementationRoutes[op.key]??[];
    const graph=routeImplementationContent.get(fileId)?.[op.key];
    const implementation=graph?' · '+link(operationUrl(project,op)+'/implementation','라우트 구현 흐름'):
        handler?' · '+link(`${project}/fn/${handler}/implementation`,'처리 함수 구현 흐름'):'';
    return heading(apiTitle(op),systemBreadcrumb(project,system,'api'))+
        `<div class="endpoint">${methodTag(op.method)} <code>${escapeHtml(op.endpoint)}</code></div>`+
        (!op.mounted?'<p class="notice">라우트에 선언된 상대 경로다. 상위 마운트를 대조해야 한다.</p>':'')+
        `<p>${link(`${project}/api/${repo.id}/common-http`,'공통 인증과 응답 형식')}${definitionHandler?' · '+link(`${project}/fn/${definitionHandler}`,'처리 함수 정의'):''}${implementation}${paired?' · '+link(`${project}/api/op/${paired.key}`,peer.label):''}${reviewed?.feature?' · '+link(...reviewed.feature):''}${cancel?' · '+link('translacat/detail/spending-analysis-cancel-api','API 상세 흐름')+' · '+link('translacat/detail/spending-analysis-cancel-screen','화면 시나리오'):''}</p>`+
        (tx?transactionDetail(op,tx):chat?chatMessageDetail(op,chat):analysis?analysisDetail(op,analysis):reviewed?reviewedHttpDetail(op,reviewed):implementationApiDetail(op))+
        (routeState==='comment'?'<p class="notice">색인되었던 경로가 소스 주석에 있습니다. 활성 처리 함수는 API 목록에서 확인합니다.</p>':'')+
        (routeState==='external'&&!handler?'<p>라우트 등록에서 외부 처리기를 사용합니다. 실행 구현은 연결 라이브러리 또는 콜백에서 결정됩니다.</p>':'')+
        (graph?implementationDetail(graph,{id:op.key,calls:[]}):'')+
        (flows.length?'<h2>기능 상세 흐름</h2><ul>'+flows.map(route=>{
            const id=route.split('/')[2];
            return '<li>'+link(route,contracts.featureDesigns[project][id].title+' · API·통신')+' · '+link(route.replace(/api$/,'screen'),'화면')+'</li>';
        }).join('')+'</ul>':'')+
        `<details><summary>소스 근거</summary><p>${sourceLink(op.id,op.line)}</p></details>`;
}

function apiReference(project,part,rest) {
    const catalog=apiCatalog.projects.get(project);
    if(!part||/^\d+$/.test(part)) return apiIndex(project);
    if(part==='op') {
        const op=catalog.operations.find(item=>item.key===rest[0]);
        if(op) return apiDetail(project,catalog.repos.get(op.repo),op);
    } else {
        const repo=catalog.repos.get(part);
        if(repo) {
            const [group,page]=rest;
            if(group==='common-http') return apiCommon(project,repo);
            if(group==='all') return apiIndex(project,repo,null,page??1);
            if(!group||repo.groups.has(group)) return apiIndex(project,repo,repo.groups.get(group),page);
        }
    }
    throw new Error('API 명세를 찾을 수 없습니다.');
}
