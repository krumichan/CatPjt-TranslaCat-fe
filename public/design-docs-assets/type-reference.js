'use strict';

function declaredType(project,repo,name) {
    const service=functionCatalog.projects.get(project)?.get(repo)?.source;
    return contracts.schemas[`${project}/${service}/${name}`];
}

function typeReference(project,repo,type) {
    const token=/[A-Za-z_$][\w$]*/g;
    let content='', offset=0;
    for(const match of type.matchAll(token)) {
        const name=match[0];
        const key=`${project}/${repo}/${name}`;
        content+=escapeHtml(type.slice(offset,match.index));
        content+=Object.hasOwn(contracts.typeDefinitions,key)||declaredType(project,repo,name)?.length?link(`${project}/types/${repo}/${name}`,name):escapeHtml(name);
        offset=match.index+name.length;
    }
    return `<code>${content}${escapeHtml(type.slice(offset))}</code>`;
}

function typeFields(model,includeSourceTypes=false,project,repo) {
    const rows=includeSourceTypes?model.fields:model.fields.map(([name,,json,nullable,meaning])=>[name,json,nullable,meaning]);
    const headers=includeSourceTypes?['필드',`${model.language??'Java'} 타입`,'JSON 타입','null 가능','설명']:['필드','JSON 타입','null 가능','설명'];
    const linkColumn=includeSourceTypes?2:1;
    return definitionsTable(headers,rows,includeSourceTypes?[0,1,2]:[0,1],(value,column)=>project&&column===linkColumn?typeReference(project,repo,value):undefined);
}

function typeDefinitionLinks(project) {
    const entries=Object.entries(contracts.typeDefinitions).filter(([key])=>key.startsWith(`${project}/`));
    if(!entries.length) return '';
    return '<h2>타입 정의서</h2><ul class="entries">'+entries.map(([key,model])=>{
        const [,repo]=key.split('/');
        return `<li>${typeReference(project,repo,model.name)}<span class="meta">${escapeHtml(model.description)}</span></li>`;
    }).join('')+'</ul><h2>소스 선언 색인</h2>';
}

function typeDefinitionPage(project,repo,name) {
    const model=contracts.typeDefinitions[`${project}/${repo}/${name}`];
    const routeTrail=' / '+link(project,products[project])+' / '+link(`${project}/types`,'요청·응답 타입');
    if(!model) {
        const fields=declaredType(project,repo,name);
        if(!fields?.length) throw new Error('타입 정의를 찾을 수 없습니다.');
        const operations=apiCatalog.projects.get(project).repos.get(repo)?.operations??[];
        const hasType=value=>value?.match(/[A-Za-z_$][\w$]*/g)?.includes(name);
        const usages=operations.filter(op=>hasType(op.result?.type)||op.request.some(row=>hasType(row.type)));
        return heading(name,routeTrail)+'<p class="notice">소스 선언에서 확인한 필드다. 직렬화 이름, null 허용 여부와 업무 규칙의 상세 검토가 필요하다.</p>'+
            '<h2>필드</h2>'+definitionsTable(['변수명','선언 타입','입력 제약과 기본값'],fields.map(row=>[
                row.name,row.type,[row.description,row.constraints,row.required==='필수'?'필수로 선언됨':'',row.defaultValue!==undefined?`기본값 ${row.defaultValue}`:''].filter(Boolean).join(' · ')||'추가 확인 필요',
            ]),[0],(value,column)=>column===1?typeReference(project,repo,value):undefined)+
            (usages.length?'<h2>사용하는 API</h2><ul>'+usages.map(op=>`<li>${link(operationUrl(project,op),`${op.method} ${op.endpoint}`)}</li>`).join('')+'</ul>':'');
    }
    const source=[...files.values()].find(file=>file.project===project&&file.service===functionCatalog.projects.get(project).get(repo).source&&file.path===model.source);
    const usages=apiCatalog.projects.get(project).repos.get(repo)?.operations.filter(op=>{
        const reviewed=contracts.reviewedHttp[reviewedKey(project,op)];
        return [reviewed?.request,reviewed?.response,reviewed?.responseModel].some(value=>value?.match(/[A-Za-z_$][\w$]*/g)?.includes(name));
    })??[];
    const functionUsages=(model.functions??[]).map(([scope,fn])=>`<li><a href="#" data-function="${escapeHtml(`${project}/${scope}/${fn}`)}">${escapeHtml(`${scope}.${fn}`)}</a></li>`);
    const usageItems=functionUsages.concat(usages.map(op=>`<li>${link(operationUrl(project,op),`${op.method} ${op.endpoint}`)}</li>`));
    return heading(name,routeTrail)+
        `<p>${escapeHtml(model.description)}</p><h2>필드</h2>${typeFields(model,true,project,repo)}`+(model.notes?`<p>${escapeHtml(model.notes)}</p>`:'')+
        (model.example!==undefined?`<h2>JSON 예시</h2>${jsonSample(model.exampleLabel,model.example)}`:'')+
        (usageItems.length?'<h2>사용하는 함수와 API</h2><ul>'+usageItems.join('')+'</ul>':'')+
        (source?`<details><summary>소스 근거</summary><p>${link(`${project}/file/${source.id}`,source.path)}</p></details>`:'');
}
