'use strict';

// Each feature has a primary home. The same flow can be linked from other systems.
const systemDefinitions = {
    translacat: [
        ['account','계정·인증','가입, 로그인, 세션과 내 계정 관리',['account-security','account-profile','mobile-login']],
        ['chat','채팅·친구','친구, 채팅방, 메시지와 실시간 연결',['chat-membership','chat-message']],
        ['voice','음성','음성 세션, 실시간 처리와 음성 인식·합성',['voice-translation']],
        ['translation','텍스트 번역','단건·일괄 번역과 언어 정보',['translation']],
        ['learning','언어 학습','설정, 레벨 테스트, 듣기·말하기·읽기·작문',['learning-settings','learning-level-test','learning-listening-speaking','learning-writing-reading']],
        ['novel','소설','작품 탐색, 회차 열람과 번역 작업',['novel-catalog','novel-reader']],
        ['account-book','가계부','가계부, 거래, 영수증과 소비 분석',['account-book-create','account-book-sharing','account-book-transactions','account-book-fixed-cost','receipt-batch','spending-analysis-job','spending-analysis-cancel-api','spending-analysis-cancel-screen']],
        ['support','고객센터·알림','문의, 공지와 고객센터 알림',['support-inquiry','support-notices']],
        ['common','공통','공통 인증 형식, 환경 설정, 가이드와 운영 기반',['common-auth']],
    ],
    unity: [
        ['accounts','계정·캐릭터','로그인, 캐릭터 생성과 접속 신원',['mosslight-login']],
        ['world','월드·이동','지역 이동, 포털·탑승·등반과 재접속 위치',['mosslight-world-travel']],
        ['combat','전투','이동·전투 입력과 서버 스냅샷',['mosslight-input']],
        ['inventory','인벤토리·장비','장착·강화·구매와 외형',['mosslight-inventory']],
        ['quests','퀘스트·월드 이벤트','필드 진행, 현상금, 방어와 보상',['mosslight-world-quests']],
        ['progress','성장·직업','직업 전직, 스킬 성장과 업적',['mosslight-progression']],
        ['party','파티·협동','초대, 파티 상태와 협동 행동',['mosslight-party']],
        ['dungeons','던전·레이드','입장·보스·클리어와 보상 복원',['mosslight-dungeon']],
        ['storage','저장·복구','캐릭터 상태 영속화와 재접속',[],['mosslight-dungeon','mosslight-login']],
        ['common','공통','엔진 기반, 화면 프레임워크, 진단과 공용 프로토콜',['mosslight-protocol']],
    ],
    unreal: [
        ['accounts','계정·캐릭터','계정, 캐릭터, 서버 목록과 입장권',['fablewood-join']],
        ['world','월드·이동','논리 목적지, 마을 이동과 도착 확인',['fablewood-travel']],
        ['combat','전투','전투 행동, 스킬 판정과 복제',['fablewood-combat-activities']],
        ['inventory','인벤토리·장비','아이템 장착·강화·제작과 권위 인벤토리',['fablewood-inventory','fablewood-equipment-exchange']],
        ['quests','퀘스트·진행','퀘스트 선택, 조건 검증과 진행 저장',['fablewood-quests']],
        ['progress','성장·직업','직업과 특성 빌드',['fablewood-talents']],
        ['party','파티·원정','초대, 준비 상태와 원정 결과',['fablewood-expedition']],
        ['market','교환·시장','거래, 상품 등록·구매·정산',['fablewood-market'],['fablewood-equipment-exchange']],
        ['community','친구·길드','친구·길드와 커뮤니티 상태',['fablewood-community']],
        ['activities','생활·외형','생활 상호작용, 외형과 탈것',['fablewood-life'],['fablewood-community']],
        ['storage','저장·복구','프로필 리스, 리비전과 안전한 접속 종료',['fablewood-profile-save']],
        ['common','공통','엔진 프레임워크, 공용 화면과 진단',['fablewood-rpg-gate']],
    ],
};

const gameFunctionHomes = {
    unity:{equipment:'inventory',network:'common',screens:'common',diagnostics:'common',other:'common'},
    unreal:{online:'accounts',parties:'party',towns:'world',screens:'common',framework:'common',other:'common'},
};

const gameFunctionRules = {
    unity:[
        ['dungeons',/dungeon|bossreward|ruinsreward/], ['party',/party|fieldcoop/],
        ['inventory',/inventory|equipment|cosmetic|equip|shop|itemoperation/],
        ['quests',/quest|bounty|gatedefense/], ['progress',/skillgrowth|achievement|chooseclass|classchange|^grantreward/],
        ['world',/travel|portal|mount|climb/], ['accounts',/auth|identity|login|createcharacter/],
    ],
    unreal:[
        ['market',/market|exchange|trade/], ['community',/guild|friend|community/],
        ['progress',/talent|classbuild|selectclass|chooseclass|skillrank|advancement/],
        ['common',/^acceptrpgrequest$/],
        ['quests',/quest|interactstory/], ['party',/party|expedition|revive|encounter/],
        ['inventory',/inventory|equipment|equip|enhance|dismantle|craft|sellitem|serversell/],
        ['world',/travel|arrival|enterregion|returnvillage/], ['storage',/lease|heartbeat|saveprofile|commitprofile/],
        ['accounts',/ticket|serverlist|login|selectcharacter/], ['combat',/attack|damage|combat|requestaction/],
    ],
};

function translaHome(repo,feature,context) {
    if (/\b(?:health|ready|readiness|navigation|docs)\b/.test(context)) return 'common';
    if (repo==='be'&&/\/domain\/user\/deletion\//.test(context)) return 'account';
    if (/account.?book|spending.?analysis|receipt|currency|exchange.?rate/.test(context)) return 'account-book';
    if (/language.?learning|^ll\//.test(context)) return repo==='ll'&&feature==='common'?'common':'learning';
    if (/novel|\/episode\/|dictionary\/register|readerpager/.test(context)||repo==='novel') return 'novel';
    if (/\/internal\/v1\/chat\/(push|identity|accounts|relations|storage)|\/chat(?:\/|\b)|friend|\/blocks?\b|open.?chat|chat.?room/.test(context)||repo==='chat') {
        return repo==='chat'&&feature==='common'?'common':'chat';
    }
    if (/voice|\/stt\b|\/speech\b/.test(context)) return 'voice';
    if (/translation|translate|text.?readings|\buse.?language.?options\b|languagecatalog/.test(context)) return 'translation';
    if (/support|notification|push/.test(context)) return 'support';
    if (repo==='be'&&/\/global\/|securityconfig\.java|jwtfilter\.java/.test(context)) return 'common';
    if (/auth|account.?deletion|\/api\/v1\/users|profile/.test(context)) return 'account';
    return {chat:'chat',social:'account',language:'translation',currency:'account-book',voice:'voice',account:'account',support:'support',learning:'learning',novel:'novel'}[feature]??'common';
}

function gameHome(project,feature,context) {
    if(project==='unity') {
        if (/\/dungeon-|\/boss-reward|\/ruins-reward/.test(context)) return 'dungeons';
        if (/prototypeinventory|prototypeequipment|\/equipment\b|\/cosmetics\b|\/item\b|\/shop\b/.test(context)) return 'inventory';
        if (/quest|gate.?defense/.test(context)&&feature!=='diagnostics') return 'quests';
        if (/\/travel\b/.test(context)) return 'world';
        if (/\/session\b|\/auth\b/.test(context)) return 'accounts';
        if (/\/character\b|\/save-vitals\b/.test(context)) return 'storage';
        if (/\/field-coop\b/.test(context)) return 'party';
        if (/\/reward\b|\/achievement\b|\/class\b|\/skill-growth\b/.test(context)) return 'progress';
    } else {
        if (/fableclass|talent/.test(context)) return 'progress';
        if (/story|adventure|confirmquest/.test(context)) return 'quests';
        if (/\/v1\/server\/release-confirmed/.test(context)) return 'storage';
    }
    const homes=gameFunctionHomes[project];
    return homes[feature]??feature;
}

function buildSystemCatalog() {
    const projects=new Map();
    for(const [project,definitions] of Object.entries(systemDefinitions)) {
        const systems=new Map(definitions.map(([id,title,summary,featureIds,related=[]])=>[
            id,{id,title,summary,featureIds,related,functions:new Map(),api:new Map(),messages:[]},
        ]));
        const featureHomes=new Map(definitions.flatMap(([id,,,featureIds])=>featureIds.map(feature=>[feature,systems.get(id)])));
        const fileHomes=new Map();
        const functionHomes=new Map();
        const operationHomes=new Map();
        const resolve=(repo,feature,context)=>{
            const id=project==='translacat'?translaHome(repo,feature,context):gameHome(project,feature,context);
            return systems.get(id)??systems.get('common');
        };
        const group=(groups,id,title)=>{
            if(!groups.has(id)) groups.set(id,{id,title,groups:new Map(),entries:[]});
            return groups.get(id);
        };
        for(const repo of functionCatalog.projects.get(project).values()) {
            for(const entry of repo.entries) {
                const file=files.get(entry[0].split('-')[0]);
                const {feature,section}=functionCatalog.groupsByFile.get(file.id);
                const fileSystem=resolve(repo.id,feature.id,repo.id+'/'+file.path.toLowerCase());
                fileHomes.set(file.id,fileSystem);
                const sharedFile=/^(?:CharacterRepository|PrototypeApp|FablePlayerController|FablePlayerState|SqlStore)\.[^.]+$/.test(file.path.split('/').at(-1));
                const behavior=sharedFile&&gameFunctionRules[project]?.find(([,pattern])=>pattern.test(entry[1].toLowerCase()));
                const system=behavior?systems.get(behavior[0]):fileSystem;
                functionHomes.set(entry[0],system);
                const layer=group(system.functions,repo.id,repo.label);
                const category=group(layer.groups,section?feature.id+'-'+section.id:feature.id,section?.label??feature.label);
                layer.entries.push(entry);
                category.entries.push(entry);
            }
        }
        const api=apiCatalog.projects.get(project);
        for(const op of api.operations) {
            const repo=api.repos.get(op.repo);
            const category=repo.groups.get(op.group);
            const file=files.get(op.id);
            const system=resolve(repo.id,op.group,repo.id+'/'+op.endpoint.toLowerCase()+' '+file.path.toLowerCase());
            operationHomes.set(op.key,system);
            const layer=group(system.api,repo.id,repo.label);
            layer.entries.push(op);
            group(layer.groups,category.id,[category.parent,category.label].filter(Boolean).join(' · ')).entries.push(op);
        }
        for(const message of contracts.gameMessages?.[project]??[]) {
            const system=systems.get(message.system)??resolve('game',message.feature??'common',message.name.toLowerCase());
            system.messages.push(message);
        }
        for(const id of Object.keys(contracts.featureDesigns[project])) {
            if(!featureHomes.has(id)) throw new Error('기능의 소속을 확인할 수 없습니다. '+id);
        }
        projects.set(project,{systems,featureHomes,fileHomes,functionHomes,operationHomes});
    }
    return projects;
}

const systemSections = {overview:'기능 설명',detail:'상세 설계',functions:'함수 설계',api:'API 명세'};
const systemRoute = (project,system,section='overview')=>`${project}/system/${system.id}/${section}`;
const sectionLabel = (project,section)=>section==='api'&&project!=='translacat'?'API·게임 통신 명세':systemSections[section];

function systemBreadcrumb(project,system,section) {
    return ' / '+link(project,products[project])+' / '+link(systemRoute(project,system),system.title)+
        (section?' / '+link(systemRoute(project,system,section),sectionLabel(project,section)):'');
}

function systemCard(project,system,section='overview',summary=system.summary) {
    return `<a class="card" href="#${systemRoute(project,system,section)}"><strong>${escapeHtml(section==='overview'?system.title:sectionLabel(project,section))}</strong><span>${escapeHtml(summary)}</span></a>`;
}

function systemNav(project,active,section,part,rest) {
    const catalog=systemCatalog.get(project);
    let selected=null;
    let focus=null;
    if(active) {
        if(section==='system') {
            selected=catalog.systems.get(part);
            focus=rest[0]??'overview';
        } else if(section==='detail') {
            selected=catalog.featureHomes.get(part);
            focus='detail';
        } else if(section==='api'&&part==='op') {
            selected=catalog.operationHomes.get(rest[0]);
            focus='api';
        } else if((section==='fn'||section==='file')&&part) {
            selected=section==='fn'?catalog.functionHomes.get(part):catalog.fileHomes.get(part);
            focus='functions';
        } else if(section?.startsWith('spending')) {
            selected=catalog.systems.get('account-book');
            focus=section==='spending-api'?'api':'detail';
        }
    }
    return [...catalog.systems.values()].map(system=>{
        const current=system===selected;
        const sections=Object.keys(systemSections).map(key=>{
            const selectedPage=current&&focus===key;
            const canonical=section==='system'&&rest.length<=1;
            const item=link(systemRoute(project,system,key),sectionLabel(project,key),selectedPage&&canonical);
            if(!selectedPage||canonical) return item;
            const title=section==='detail'?contracts.featureDesigns[project][part]?.title:
                section==='api'&&part==='op'?'엔드포인트 명세':section==='fn'?'함수 정의':null;
            const route=[project,section,part,...rest].filter(Boolean).map(encodeURIComponent).join('/');
            return item+link(route,title??'현재 문서',true);
        }).join('');
        return `<details${current?' open':''}><summary>${escapeHtml(system.title)}</summary>${sections}</details>`;
    }).join('');
}

function featureRows(project,ids) {
    return ids.map(id=>{
        const feature=contracts.featureDesigns[project][id];
        const route=`${project}/detail/${id}`;
        if(!feature.paired) return `<li>${link(route,feature.title)}</li>`;
        return `<li>${link(route,feature.title)}<span class="meta">${link(route+'/api','API·통신 상세 흐름')} · ${link(route+'/screen','화면 상세 시나리오')}</span></li>`;
    }).join('');
}

function systemDetail(project,system) {
    const primary=featureRows(project,system.featureIds);
    const related=featureRows(project,system.related);
    const shared=system.id==='common'?
        `<p>${link(project+'/types','요청·응답 타입')} · ${link(project+'/db','DB·저장')}${project==='translacat'?'':' · '+link(project+'/network','게임 공용 통신')}</p>`:'';
    const analysis=system.id==='account-book'?'<h2>소비 분석 작업과 데이터</h2><p>'+link('translacat/spending-design','화면·상세·DB')+' · '+link('translacat/spending-api','공통 계약과 실행 검증')+'</p>':'';
    return heading('상세 설계',systemBreadcrumb(project,system))+
        (primary?`<ul class="entries">${primary}</ul>`:'')+
        (related?`<h2>연관 시스템 흐름</h2><ul class="entries">${related}</ul>`:'')+analysis+shared;
}

function systemFunctions(project,system,parts) {
    const [layerId,groupId,page]=parts;
    const base=systemRoute(project,system,'functions');
    const layer=system.functions.get(layerId);
    if(layerId&&!layer) throw new Error('함수 구현 영역을 찾을 수 없습니다.');
    if(groupId) {
        const group=layer.groups.get(groupId);
        if(!group) throw new Error('함수 기능 그룹을 찾을 수 없습니다.');
        return functionList(group.entries,group.title,systemBreadcrumb(project,system,'functions')+' / '+link(base+'/'+layer.id,layer.title),base+'/'+layer.id+'/'+group.id,Number(page)||1);
    }
    const body=layer?
        functionCards([...layer.groups.values()].map(group=>({...group,label:group.title})),group=>base+'/'+layer.id+'/'+group.id):
        functionCards([...system.functions.values()].map(group=>({...group,label:group.title})),group=>base+'/'+group.id);
    return heading(layer?.title??'함수 설계',systemBreadcrumb(project,system))+body;
}

function systemApi(project,system) {
    const groups=[...system.api.values()].map(layer=>{
        const common=link(`${project}/api/${layer.id}/common-http`,'공통 인증과 응답 형식');
        return `<h2>${escapeHtml(layer.title)}</h2><p>${common}</p>`+[...layer.groups.values()].map(group=>
            `<h3>${escapeHtml(group.title)}</h3><ul class="entries api-entries">`+group.entries.map(op=>
                `<li>${methodTag(op.method)} <a data-operation href="#${operationUrl(project,op)}"><code>${escapeHtml(op.endpoint)}</code></a><span class="meta">${escapeHtml(apiTitle(op))} · ${isReviewedApi(op)?'상세 명세':'구현 대조'}</span></li>`
            ).join('')+'</ul>').join('');
    }).join('');
    const messages=system.messages.length?'<h2>게임 메시지</h2>'+
        (project==='unity'?'<p>TCP 프레임은 4바이트 길이, 1바이트 메시지 종류와 UTF-8 JSON을 사용한다. 조작 필드와 스냅샷 필드는 Input과 Snapshot의 하위 계약이다.</p>':'<p>RPC는 호출 함수에 직접 반환값을 돌려주지 않는다. 기능별 결과 RPC와 상태 복제는 상세 설계에서 확인한다.</p>')+
        tableHeaders(['메시지','전달 방향·방식','인자·데이터','구현'])+system.messages.map(message=>{
            const source=message.handlerId?link(project+'/fn/'+message.handlerId,'처리 함수')+' · '+link(project+'/fn/'+message.handlerId+'/implementation','구현 흐름'):
                message.handlerIds?.length?message.handlerIds.map(id=>link(project+'/fn/'+id+'/implementation',fnIndex.get(id)[1]+' 구현 흐름')).join('<br>'):
                message.fileId?link(project+'/file/'+message.fileId,'선언 파일'):'';
            const parameters=project==='unreal'&&message.parameters!=='인자 없음'?parameterRows(message.parameters,'cpp'):[];
            const info=parameters.length===0?`<code>${escapeHtml(message.parameters)}</code>`:
                definitionsTable(['인자','타입','의미'],parameters.map(field=>[field.name,field.type,describeRole(field.name,field.type,'이 RPC의 '+field.name+' 인자.')]),[0,1]);
            return `<tr data-message><td><code>${escapeHtml(message.owner?message.owner+'.'+message.name:message.name)}</code></td><td>${escapeHtml(message.direction)}</td><td>${info}</td><td>${source}</td></tr>`;
        }).join('')+'</tbody></table></div>':'';
    return heading(sectionLabel(project,'api'),systemBreadcrumb(project,system))+
        (messages||groups?messages+groups:'<p>이 시스템에 연결된 독립 엔드포인트가 없습니다.</p>');
}

function systemPage(project,id,parts) {
    const system=systemCatalog.get(project)?.systems.get(id);
    if(!system) throw new Error('서비스 또는 게임 시스템을 찾을 수 없습니다.');
    const [section='overview',...rest]=parts;
    if(section==='overview') return heading(system.title,' / '+link(project,products[project]))+
        `<p>${escapeHtml(system.summary)}</p><div class="cards">${[
            systemCard(project,system,'detail','API·통신과 화면 시나리오'),
            systemCard(project,system,'functions','구현 영역과 기능별 함수 정의'),
            systemCard(project,system,'api',project==='translacat'?'요청·응답과 오류':'HTTP와 게임 메시지'),
        ].join('')}</div>`+
        (system.featureIds.length?'<h2>기능</h2><ul class="entries">'+featureRows(project,system.featureIds)+'</ul>':'')+
        (system.related.length?'<h2>연관 시스템 흐름</h2><ul class="entries">'+featureRows(project,system.related)+'</ul>':'');
    if(section==='detail') return systemDetail(project,system);
    if(section==='functions') return systemFunctions(project,system,rest);
    if(section==='api') return systemApi(project,system);
    throw new Error('설계 문서 분류를 찾을 수 없습니다.');
}
