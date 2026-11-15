'use strict';
const products = {translacat:'TranslaCat',unity:'Mosslight Isles · Unity',unreal:'Fablewood · Unreal'};
const categories = {screens:'화면',types:'요청·응답 타입',db:'DB·저장',network:'게임 통신'};
const main = document.querySelector('#main');
const nav = document.querySelector('#nav');
const toc = document.querySelector('#toc');
const search = document.querySelector('#query');
const menu = document.querySelector('#menu');
const languagePicker = document.querySelector('#language');
// 遅延読み込み先は、このスクリプトの配置場所から解決する。
const designAssetRoot = new URL('.', document.currentScript.src);
const fileContent = new Map();
const implementationContent = new Map();
const routeImplementationContent = new Map();
let implementationRoutes = {};
window.registerImplementationRoutes = routes => { implementationRoutes = routes; };
window.registerRouteImplementation = ([id, flows]) => routeImplementationContent.set(id, flows);
window.registerImplementation = ([id, flows]) => implementationContent.set(id, flows);
const catalogs = new Map();
const scriptPromises = new Map();
const originalNavAria = nav.getAttribute('aria-label');
let index, pages, files, fnIndex, functionCatalog, contracts, apiCatalog, systemCatalog;
let currentVersion = 0;
let flowClicks = new AbortController();

window.registerFile = ([id, functions]) => fileContent.set(id, functions);
window.registerCatalog = ([id, catalog]) => catalogs.set(id, catalog);
window.registerIndex = (data) => {
    index = data;
    files = new Map(data.files.map(file => [file.id, file]));
    fnIndex = new Map(data.functions.map(fn => [fn[0], fn]));
    functionCatalog = buildFunctionCatalog(files,data.functions);
};
window.registerPages = (data) => { pages = data; };
window.registerContracts = (data) => {
    contracts=data;
    apiCatalog=buildApiCatalog(data.operations);
    systemCatalog=buildSystemCatalog();
};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, letter => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[letter]));
}

function loadScript(src) {
    if (!scriptPromises.has(src)) {
        const task = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = new URL(src, designAssetRoot).href;
            script.onload = resolve;
            script.onerror = () => reject(new Error('파일을 읽을 수 없습니다. ' + src));
            document.head.append(script);
        });
        scriptPromises.set(src, task);
    }
    return scriptPromises.get(src);
}

function getRoute() {
    return location.hash.slice(1).split('/').map(part => {
        try { return decodeURIComponent(part); } catch { return part; }
    });
}

// 共有URLのlangを読み取り、省略時は韓国語を使用する。
function requestedLanguage() {
    const code=new URLSearchParams(window.location.search).get('lang');
    return designI18n.localeCodes.has(code)?code:'ko';
}

// 言語選択と検索メニューを現在の辞書に合わせる。
function syncLanguageControls(code) {
    designI18n.setLanguage(code);
    languagePicker.value=code;
    const header=document.querySelector('header');
    header.querySelector('.brand').textContent=designI18n.translate('제품 설계 문서');
    header.querySelector('.search span').textContent=designI18n.translate('함수 검색');
    header.querySelector('.language span').textContent=designI18n.translate('문서 언어');
    search.placeholder=designI18n.translate('함수명, 클래스, 파일');
    menu.setAttribute('aria-label',designI18n.translate('메뉴 열기'));
    nav.setAttribute('aria-label',designI18n.translate(originalNavAria));
    toc.setAttribute('aria-label',designI18n.translate('이 페이지의 목차'));
}

function link(route, label, selected = false) {
    return `<a href="#${route}"${selected ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`;
}

function slug(value) {
    return value.trim().toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu,'').replace(/\s+/g,'-');
}

function functionRoute(project, repo, feature, section) {
    return [project,'functions',repo?.id,feature?.id,section?.id].filter(Boolean).join('/');
}

function orderedGroups(groups) {
    return [...groups.values()].sort((a,b)=>{
        const rank = group => group.id==='other' ? 2 : group.id==='common' ? 1 : 0;
        return rank(a)-rank(b)||a.label.localeCompare(b.label,'ko');
    });
}

function functionMenu(project, active, location) {
    const open=active==='functions'||Boolean(location);
    const repoLinks=[...functionCatalog.projects.get(project).values()].map(repo=>{
        const selected=location?.repo===repo;
        const features=orderedGroups(repo.features).map(feature=>{
            const current=selected&&location.feature===feature;
            if(!feature.sections.size) return link(functionRoute(project,repo,feature),feature.label,current&&active==='functions');
            return `<details${current?' open':''}><summary>${escapeHtml(feature.label)}</summary>${link(functionRoute(project,repo,feature),'기능 목차',current&&!location.section&&active==='functions')}${orderedGroups(feature.sections).map(section=>link(functionRoute(project,repo,feature,section),section.label,current&&location.section===section&&active==='functions')).join('')}</details>`;
        }).join('');
        return `<details${selected?' open':''}><summary>${escapeHtml(repo.label)}</summary>${link(functionRoute(project,repo),'기능 목차',selected&&!location.feature&&active==='functions')}${features}</details>`;
    }).join('');
    return `<details class="function-menu"${open?' open':''}><summary>함수 설계</summary>${link(functionRoute(project),'저장소 목차',active==='functions'&&!location)}${repoLinks}</details>`;
}

function navigation(activeProduct, active, focus, location, rest) {
    // 設計文書と同じ言語で利用ガイドを開く。
    const guideLanguage = designI18n.language;
    const guideLabels = {ko:'사용 가이드',ja:'利用ガイド',en:'User guides'};
    const guideLink = '<a href="/'+guideLanguage+'/guides" data-user-guide>'+guideLabels[guideLanguage]+'</a>';
    nav.innerHTML = link('home','문서 홈', activeProduct === 'home') + guideLink + Object.entries(products).map(([id,name]) => {
        const current=activeProduct===id;
        const legacyFunctions=current&&active==='functions'?functionMenu(id,active,location):'';
        const legacyApi=current&&active==='api'&&focus!=='op'?apiMenu(id,true,focus,rest):'';
        const indexes=Object.entries(categories).filter(([kind])=>id!=='translacat'||kind!=='network');
        return `<details${current?' open':''}><summary>${escapeHtml(name)}</summary>${link(id,'기본설계',current&&!active)}${systemNav(id,current,active,focus,rest)}${legacyFunctions}${legacyApi}<details${current&&categories[active]?' open':''}><summary>설계 색인</summary>${indexes.map(([kind,title])=>link(id+'/'+kind,title,current&&active===kind)).join('')}</details></details>`;
    }).join('') + link('standard','작성과 검수 기준',activeProduct==='standard') + link('scope','설계 검토 범위',activeProduct==='scope') + link('verification','실행 검증',activeProduct==='verification');
}

function heading(title, trail = '', boundary = null) {
    const name=boundary===null?escapeHtml(title):escapeHtml(title.slice(0,boundary))+'<wbr>'+escapeHtml(title.slice(boundary));
    return `<div class="trail">${link('home','문서 홈')}${trail}</div><h1>${name}</h1>`;
}

function sourceLink(id, line) {
    const file = files.get(id);
    if (!file) return '';
    const handler=index.functions.find(fn=>fn[0].startsWith(id+'-')&&fn[3]===line);
    const route=handler ? `${file.project}/fn/${handler[0]}` : `${file.project}/file/${id}`;
    return `<a href="#${route}">${escapeHtml(file.path)}:${line}</a>`;
}

function functionLink(id) {
    const fn = fnIndex.get(id);
    if (!fn) return '';
    return link(files.get(id.split('-')[0]).project+'/fn/'+id, fn[2] ? fn[2]+'.'+fn[1] : fn[1]);
}

function linkFunctionReferences() {
    for(const a of main.querySelectorAll('a[data-function]')) {
        const [project,scope,name,...source]=decodeURIComponent(a.dataset.function).split('/');
        const path=source.join('/');
        const matches=index.functions.filter(([id,label,owner])=>{
            if(label!==name||owner!==scope) return false;
            const file=files.get(id.split('-')[0]);
            return file.project===project&&(!path||file.path===path);
        });
        if(matches.length===1) {
            a.href=`#${project}/fn/${matches[0][0]}`;
            if(getRoute()[1]==='detail') a.insertAdjacentHTML('afterend',
                ' <a class="flow-jump" href="'+a.getAttribute('href')+'/implementation">구현 흐름</a>');
        }
        else a.href='#search/'+encodeURIComponent([scope,name].filter(Boolean).join('.'))+'/1';
    }
    for(const a of main.querySelectorAll('a[data-api]')) {
        const [project,repo,method,...path]=decodeURIComponent(a.dataset.api).split('/');
        const endpoint='/'+path.join('/');
        const op=apiCatalog.projects.get(project)?.repos.get(repo)?.operations.find(op=>op.method===method&&op.endpoint===endpoint);
        a.href=op?'#'+operationUrl(project,op):`#${project}/api/${repo}`;
    }
}

function tableHeaders(names,definition=false) {
    return `<div class="table${definition?' definitions':''}"><table><thead><tr>`+names.map(x=>`<th scope="col">${escapeHtml(x)}</th>`).join('')+'</tr></thead><tbody>';
}

function articleHtml(data, project) {
    const [,section,id]=getRoute();
    const system=section==='detail'?systemCatalog.get(project)?.featureHomes.get(id):null;
    const trail=system?systemBreadcrumb(project,system,'detail'):project?' / '+link(project,products[project]):'';
    return `<div class="trail">${link('home','문서 홈')}${trail}</div>${data}`;
}

function home() {
    return heading('제품 설계 문서')+'<p>제품을 선택하면 기본설계, 기능 문서, 구현 색인으로 이동합니다. 함수명 검색은 세 프로젝트의 소스를 함께 찾습니다.</p><div class="cards">'+Object.entries(products).map(([id,name])=>{
        const counts=index.summary.projects[id];
        return `<a class="card" href="#${id}"><strong>${escapeHtml(name)}</strong><span>${counts.files.toLocaleString()}개 소스 · ${counts.functions.toLocaleString()}개 함수</span></a>`;
    }).join('')+'</div><h2>문서의 확인 범위</h2><p>API 명세는 서비스와 기능별로 열 수 있습니다. 상세 검토한 항목에는 요청 필드, 성공 응답과 오류를 담았습니다. 함수 정의에서 입력과 반환을 확인하고, 구현 상세 흐름의 단계 번호로 호출과 분기를 따라갈 수 있습니다.</p><p>실제 API 호출 결과는 '+link('verification','실행 검증')+'에서 확인할 수 있습니다.</p>';
}

function functionTrail(project, repo, feature, section) {
    const crumbs=[link(project,products[project]),link(functionRoute(project),'함수 설계')];
    if(repo) crumbs.push(link(functionRoute(project,repo),repo.label));
    if(feature) crumbs.push(link(functionRoute(project,repo,feature),feature.label));
    if(section) crumbs.push(link(functionRoute(project,repo,feature,section),section.label));
    return ' / '+crumbs.join(' / ');
}

function functionCards(items, route) {
    return `<div class="cards">${items.map(group=>`<a class="card" href="#${route(group)}"><strong>${escapeHtml(group.label)}</strong><span>함수 ${group.entries.length.toLocaleString()}개</span></a>`).join('')}</div>`;
}

function functionDirectory(project, location) {
    const {repo,feature}=location??{};
    if(!repo) return heading('함수 설계',' / '+link(project,products[project]))+
        '<p>저장소를 선택하면 기능별 함수와 공통 코드를 볼 수 있습니다.</p>'+
        functionCards([...functionCatalog.projects.get(project).values()],group=>functionRoute(project,group));
    if(!feature) return heading(repo.label,functionTrail(project,repo))+
        functionCards(orderedGroups(repo.features),group=>functionRoute(project,repo,group));
    return heading(feature.label,functionTrail(project,repo,feature))+
        functionCards(orderedGroups(feature.sections),group=>functionRoute(project,repo,feature,group))+
        (feature.sections.size?`<p>${link(functionRoute(project,repo,feature)+'/1','이 기능의 함수 전체 보기')}</p>`:'');
}

function functionList(rows, title, trail, route, page, query='', showHeading=true) {
    const limit=50;
    const max=Math.max(1,Math.ceil(rows.length/limit));
    page=Math.min(max,Math.max(1,page));
    return (showHeading?heading(title,trail):'')+
        `<p class="meta">${rows.length.toLocaleString()}개 함수${query?' · '+escapeHtml(query):''}</p><ul class="entries">`+
        rows.slice((page-1)*limit,page*limit).map(([id,,,line])=>{
            const file=files.get(id.split('-')[0]);
            const {repo,feature,section}=functionCatalog.groupsByFile.get(file.id);
            const groupRoute=functionRoute(file.project,repo,feature,section);
            const groupLink=groupRoute===route?'':`<span class="meta">${link(groupRoute,[repo.label,feature.label,section?.label].filter(Boolean).join(' › '))}</span>`;
            return `<li>${functionLink(id)}${groupLink}<span class="meta">${escapeHtml(file.path)}:${line}</span></li>`;
        }).join('')+`</ul><div class="pager">${page>1?link(route+'/'+(page-1),'이전'):''}<span>${page} / ${max}</span>${page<max?link(route+'/'+(page+1),'다음'):''}</div>`;
}

function searchFunctions(query, page) {
    const term=query.toLowerCase().trim();
    const rows=index.functions.filter(([id,name,scope])=>{
        const file=files.get(id.split('-')[0]);
        const {repo,feature,section}=functionCatalog.groupsByFile.get(file.id);
        return `${scope}.${name} ${file.path} ${repo.label} ${feature.label} ${section?.label??''}`.toLowerCase().includes(term);
    });
    return functionList(rows,'함수 검색','','search/'+encodeURIComponent(query),page,query);
}

function selectFunctionGroup(project, parts) {
    const [repoId,featureId,sectionId,last]=parts;
    const isPage=value=>/^\d+$/.test(value??'');
    if(!repoId||isPage(repoId)) return {legacyPage:repoId?Number(repoId):null};
    const repo=functionCatalog.projects.get(project).get(repoId);
    const feature=repo?.features.get(featureId);
    const section=feature?.sections.get(sectionId);
    if(!repo || (featureId&&!feature) || (sectionId&&!section&&!isPage(sectionId)) || (last&&(!section||!isPage(last))) || parts.length>4) {
        throw new Error('함수 설계의 저장소 또는 기능을 찾을 수 없습니다.');
    }
    return {repo,feature,section,page:Number(last??(isPage(sectionId)?sectionId:1)),showAll:isPage(sectionId)};
}

function groupedFunctions(project, selection) {
    const {repo,feature,section,page,showAll,legacyPage}=selection;
    if(legacyPage) return functionDirectory(project)+`<h2>프로젝트 전체 함수</h2>`+
        functionList([...functionCatalog.projects.get(project).values()].flatMap(group=>group.entries),'함수 목록','',functionRoute(project),legacyPage,'',false);
    if(!feature||(feature.sections.size&&!section&&!showAll)) return functionDirectory(project,selection);
    const group=section??feature;
    return functionList(group.entries,group.label,functionTrail(project,repo,feature,section),functionRoute(project,repo,feature,section),page);
}

function operationHandler(op) {
    const route=implementationRoutes[op.key];
    if(route?.[0]==='comment') return null;
    return route?.[0]==='function'?route[1]:op.handlerId;
}

function functionPage(fn) {
    const {file}=fn;
    const operations=apiCatalog.projects.get(file.project)?.operations.filter(operation=>
        operationHandler(operation)===fn.id||operation.handlerId===fn.id)??[];
    const system=systemCatalog.get(file.project)?.functionHomes.get(fn.id);
    const trail=system?systemBreadcrumb(file.project,system,'functions'):' / '+link(file.project,products[file.project]);
    return heading(fn.scope ? fn.scope+'.'+fn.name:fn.name,trail,fn.scope?fn.scope.length+1:null)+
        (operations.length?'<p>'+operations.map(op=>link(operationUrl(file.project,op),operations.length===1?'연결된 API 명세':`${op.method} ${op.endpoint}`)).join(' · ')+'</p>':'')+
        functionSpecification(fn)+
        '<h2>이 함수가 호출하는 함수</h2>'+
        (fn.calls.length?'<ul class="entries">'+fn.calls.map(([raw,,confidence,targets])=>'<li><code>'+escapeHtml(shortCallName(raw)||'호출')+'</code> <span class="badge">'+(confidence==='scope'?'소스에서 연결':confidence==='candidate'?'호출 후보':'미해결 또는 외부')+'</span><div>'+targets.map(functionLink).join(' · ')+'</div></li>').join('')+'</ul>':'<p>확인된 직접 호출이 없습니다.</p>')+
        '<h2>이 함수를 호출하는 함수</h2>'+(fn.callers.length?'<ul>'+fn.callers.map(id=>'<li>'+functionLink(id)+'</li>').join('')+'</ul>':'<p>확인된 내부 호출자가 없습니다.</p>')+
        '<details><summary>소스 근거</summary><p class="source">'+link(file.project+'/file/'+file.id,file.path)+':'+fn.line+'–'+fn.end+'</p><p class="source">SHA-256 <code>'+escapeHtml(file.hash)+'</code></p></details>';
}
function filePage(file, functions) {
    return heading(file.path,' / '+link(file.project,products[file.project]))+`<p class="meta">${escapeHtml(file.service)} · ${escapeHtml(file.language)} · 함수 ${functions.length}개</p>`+
        (file.parseWarning?'<p class="notice">이 파일의 일부 구문에 파서 복구가 적용됐습니다.</p>':'')+
        (functions.length?`<ul class="entries">${functions.map(fn=>`<li>${functionLink(fn.id)} <span class="meta">L${fn.line}–${fn.end}</span></li>`).join('')}</ul>`:'<p>이 파일은 선언 또는 데이터 소스로 분류했습니다.</p>')+`<p class="source">SHA-256 <code>${escapeHtml(file.hash)}</code></p>`;
}

function catalogDetail(detail) {
    if(!detail) return '';
    const formatted=/^\s*[{\[]/.test(detail)?formatJson(detail):null;
    return `<details><summary>상세</summary><pre${formatted!==null?' class="json-block"':''}><code>${escapeHtml(formatted??detail)}</code></pre></details>`;
}

function screenImplementation(fileId) {
    const candidates=index.functions.filter(([id])=>id.startsWith(fileId+'-'));
    if(!candidates.length) return '';
    const entries=candidates.filter(([,name,scope])=>!scope&&/^[A-Z]/.test(name));
    const preferred=(entries.length?entries:candidates).slice(0,4);
    return '<ul>'+preferred.map(([id,name])=>'<li>'+link(files.get(fileId).project+'/fn/'+id+'/implementation',name+' 구현 흐름')+'</li>').join('')+'</ul>';
}

function catalogPage(project,category,rows,page) {
    const limit=45;
    const max=Math.max(1,Math.ceil(rows.length/limit));
    page=Math.min(max,Math.max(1,page));
    const route=project+'/'+category+'/';
    return heading(categories[category],' / '+link(project,products[project]))+
        (category==='types'?typeDefinitionLinks(project):'')+
        `<p class="meta">${rows.length.toLocaleString()}개 소스 선언. ${category==='api'?'서비스 내부 라우트는 상위 마운트를 추가로 확인해야 합니다.':'파일 페이지에서 관련 함수로 이동할 수 있습니다.'}</p>`+
        (rows.length?tableHeaders(['선언','소스','계약과 참고'])+rows.slice((page-1)*limit,page*limit).map(([title,id,line,detail])=>`<tr><td><code>${escapeHtml(title)}</code></td><td>${sourceLink(id,line)}</td><td>${category==='screens'?screenImplementation(id):''}${catalogDetail(detail)}</td></tr>`).join('')+'</tbody></table></div>':'<p>별도 선언 목록은 제품의 기본설계를 확인하세요.</p>')+
        `<div class="pager">${page>1?link(route+(page-1),'이전'):''}<span>${page} / ${max}</span>${page<max?link(route+(page+1),'다음'):''}</div>`;
}

// 最新ルートの本文と選択言語のフロー図を表示する。
async function render() {
    if(!pages||!index||!contracts) return;
    const version=++currentVersion;
    // 遷移前の読み込みが後から完了しても、最新の画面だけを更新する。
    let locale=requestedLanguage();
    if(locale!=='ko') {
        try {
            await loadScript('locale-'+locale+'.js');
        } catch {
            locale='ko';
        }
    }
    if(version!==currentVersion) return;
    syncLanguageControls(locale);
    const [project='home',section,part,...rest]=getRoute();
    nav.classList.remove('open');menu.setAttribute('aria-expanded','false');
    let html;
    let location;
    try {
        if(project==='search') html=searchFunctions(section??'',Number(part)||1);
        else if(!project||project==='home') html=home();
        else if(project==='scope'&&!section) html=coveragePage();
        else if(project==='scope'&&section==='api') html=contractAudit(part);
        else if(products[project]&&!section) {
            const cards=[...systemCatalog.get(project).systems.values()].map(system=>systemCard(project,system)).join('');
            html=articleHtml(pages[project].replace('</h1>',`</h1><div class="cards system-cards">${cards}</div>`),project);
        }
        else if(pages[project]&&!section) html=articleHtml(pages[project],null);
        else if(section==='system'&&products[project]) html=systemPage(project,part,rest);
        else if(pages[[project,section,part,...rest].join('/')]) html=articleHtml(pages[[project,section,part,...rest].join('/')],project);
        else if(pages[project+'/'+section]) html=articleHtml(pages[project+'/'+section],project);
        else if(section==='functions'&&products[project]) {
            location=selectFunctionGroup(project,part?[part,...rest]:[]);
            html=groupedFunctions(project,location);
        }
        else if((section==='fn'||section==='file')&&products[project]&&/^[a-f0-9]{20}(?:-[a-f0-9]{12})?$/.test(part??'')) {
            const id=part.split('-')[0];
            const file=files.get(id);
            if(!file||file.project!==project) throw new Error('소스 항목을 찾을 수 없습니다.');
            location=functionCatalog.groupsByFile.get(id);
            try{await loadScript('files/'+id+'.js');}catch(error){if(section==='fn')throw error;}
            if(section==='fn') {
                try {await loadScript('files/'+id+'-flow.js');} catch { /* Older preview packages omit operation graphs. */ }
            }
            const functions=fileContent.get(id)??[];
            const fn=functions.find(value=>value.id===part);
            if(section==='fn'&&!fn) throw new Error('함수를 찾을 수 없습니다.');
            html=section==='fn'?functionPage(fn):filePage(file,functions);
        } else if(section==='api'&&products[project]) {
            const route=part==='op'&&implementationRoutes[rest[0]];
            if(['inline','exported'].includes(route?.[0])) await loadScript('files/'+route[1]+'-routes.js');
            html=apiReference(project,part,rest);
        } else if(section==='types'&&products[project]&&rest.length===1) {
            html=typeDefinitionPage(project,part,rest[0]);
        } else if(products[project]&&categories[section]) {
            await loadScript(project+'-catalog.js');
            html=catalogPage(project,section,catalogs.get(project)[section],Number(part)||1);
        } else throw new Error('문서를 찾을 수 없습니다.');
    } catch(error) {html=heading('문서를 열 수 없습니다')+`<p>${escapeHtml(error.message)}</p>`;}
    if(version!==currentVersion) return;
    navigation(project||'home',section,part,location?.repo?location:null,rest);
    flowClicks.abort();
    flowClicks = new AbortController();
    main.innerHTML=html;
    if(section==='detail'&&!pages[`${project}/detail/${part}`]) {
        const features=Object.entries(contracts.featureDesigns[project]??{});
        for(const heading of main.querySelectorAll('h2')) {
            const children=features.filter(([,feature])=>feature.group===heading.textContent);
            if(children.length) heading.insertAdjacentHTML('afterend',`<ul>${children.map(([id,feature])=>`<li>${link(`${project}/detail/${id}`,feature.title+' 상세설계')}</li>`).join('')}</ul>`);
        }
    }
    linkFunctionReferences();
    // 既存のリンクとアンカーを確定してから表示文言を置き換える。
    const headings=[...main.querySelectorAll('h2,h3')];
    for(const [i,element] of headings.entries()) element.id=slug(element.textContent)||'section-'+i;
    designI18n.localize(nav);
    designI18n.localize(main);
    for(const details of main.querySelectorAll('details[data-deferred-diagrams]')) {
        details.addEventListener('toggle',()=>{
            if(details.open) void renderDiagramImages(details,()=>version===currentVersion);
        });
    }
    main.addEventListener('click',event=>{
        const target=event.target.closest('a[data-flow-target]');
        if(!target) return;
        event.preventDefault();
        const entry=document.getElementById(target.hash.slice(1));
        if(!entry) return;
        entry.closest('details').open=true;
        entry.scrollIntoView({block:'center'});
        entry.classList.add('selected-step');
    },{signal:flowClicks.signal});
    toc.innerHTML=headings.length?'<p>이 페이지</p>':'';
    designI18n.localize(toc);
    for(const [i,element] of headings.entries()) {
        const a=document.createElement('a');a.href='#section-'+i;a.textContent=element.textContent;
        a.addEventListener('click',event=>{event.preventDefault();element.scrollIntoView({behavior:'smooth'});});toc.append(a);
    }
    for (const a of main.querySelectorAll('a[href^="#"]')) {
        const local=headings.find(h=>'#'+h.id===a.getAttribute('href'));
        if(local) a.addEventListener('click',event=>{event.preventDefault();local.scrollIntoView({behavior:'smooth'});});
    }
    window.scrollTo(0,0);
    document.title=(main.querySelector('h1')?.textContent??designI18n.translate('문서'))+' · '+designI18n.translate('제품 설계 문서');
    await renderDiagramImages(main,()=>version===currentVersion);
    if(version!==currentVersion) return;
    document.body.dataset.rendered=String(version);
    if(section==='detail'&&part) document.getElementById(part)?.scrollIntoView();
    if((section==='fn'&&rest[0]==='implementation')||(section==='api'&&rest[1]==='implementation')) document.getElementById('구현-상세-흐름도')?.scrollIntoView();
}

window.addEventListener('hashchange',()=>void render());
window.addEventListener('popstate',()=>{if(requestedLanguage()!==designI18n.language) void render();});
languagePicker.addEventListener('change',()=>{
    const url=new URL(window.location.href);
    if(languagePicker.value==='ko') url.searchParams.delete('lang');
    else url.searchParams.set('lang',languagePicker.value);
    history.pushState(null,'',url);
    void render();
});
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
search.addEventListener('keydown',event=>{if(event.key==='Enter'&&search.value.trim()){location.hash='search/'+encodeURIComponent(search.value.trim())+'/1';search.blur();}});
document.addEventListener('DOMContentLoaded',()=>{
    window.mermaid?.initialize({
        startOnLoad:false,securityLevel:'strict',theme:'base',htmlLabels:false,maxTextSize:50000,
        fontFamily:'Source Sans 3, Yu Gothic UI, Malgun Gothic, sans-serif',
        flowchart:{
            htmlLabels:false,curve:'linear',wrappingWidth:216,
            nodeSpacing:35,rankSpacing:44,padding:13,diagramPadding:25,
        },
        sequence:{
            actorMargin:52,boxMargin:12,messageMargin:34,noteMargin:14,
            width:136,height:44,mirrorActors:false,wrap:true,wrapPadding:9,
            actorFontSize:16,actorFontWeight:650,messageFontSize:15,noteFontSize:14,
        },
        er:{minEntityWidth:125,minEntityHeight:42,entityPadding:12,fontSize:15},
        themeVariables:{
            background:'#fcfdfd',primaryColor:'#ffffff',primaryTextColor:'#193139',
            primaryBorderColor:'#99b5b3',secondaryColor:'#eaf6f3',tertiaryColor:'#edf4f7',
            lineColor:'#536f77',edgeLabelBackground:'#fcfdfd',fontSize:'17px',
            actorBkg:'#e4f2ef',actorBorder:'#8cb5ac',actorTextColor:'#173d37',
            actorLineColor:'#acc0c4',signalColor:'#425f69',signalTextColor:'#193139',
            labelBoxBkgColor:'#eaf3f5',labelBoxBorderColor:'#adc3c8',labelTextColor:'#234552',
            loopTextColor:'#345864',noteBkgColor:'#f2f6f7',noteBorderColor:'#b5c8cb',
            noteTextColor:'#284955',attributeBackgroundColorEven:'#f2f7f7',
            attributeBackgroundColorOdd:'#ffffff',
        },
    });
    void render();
});
