'use strict';

const parameterMeaning={
    accountBookId:'거래·멤버십을 조회할 가계부의 식별자.',transactionId:'조회하거나 변경할 거래의 식별자.',
    userId:'요청을 수행하거나 권한을 검사할 사용자의 식별자.',userPrincipal:'서버가 인증 정보로 구성한 현재 사용자. 사용자 ID를 꺼내 권한 검사에 전달한다.',
    roomId:'대상 채팅방 식별자.',chatRoomId:'대상 채팅방 식별자.',messageId:'대상 메시지 식별자.',jobId:'조회·취소할 작업 식별자.',
    page:'조회할 페이지 번호.',size:'가져올 항목의 개수.',keyword:'결과를 좁힐 검색어.',locale:'문자열을 표시하거나 결과를 생성할 언어·지역 설정.',
    cancellationToken:'호출이 취소됐는지 하위 처리에 전달하는 토큰.',context:'호출 환경과 요청의 컨텍스트.',
    condition:'조회에 적용할 조건.',cursorId:'결과를 이어서 조회할 기준 식별자.',request:'호출자가 전달한 입력을 담은 요청 객체.',
};

const transactionRequestMeaning={
    getTransactions:'조회 연도와 월, 거래 종류, 검색어, 차트 필터와 페이지 설정을 담는다.',
    createTransaction:'새 거래의 종류, 제목, 상호, 분류, 금액, 거래일과 메모를 담는다.',
    updateTransaction:'기존 거래에 반영할 종류, 제목, 상호, 분류, 금액, 거래일과 메모를 담는다.',
};

function parameterDescription(row) {
    if(parameterMeaning[row.name]) return parameterMeaning[row.name];
    if(row.position==='path') return '대상 리소스를 선택할 때 사용하는 경로 값.';
    if(row.position==='query') return '조회 조건 또는 동작을 지정하는 쿼리 값.';
    if(row.position==='header') return '호출자가 요청 헤더에 보내는 값.';
    if(row.position==='body') return '이 작업에 전달하는 요청 본문.';
    return '업무상 역할 확인 필요.';
}

function definitionsTable(headers, rows, codeColumns=[],renderCell) {
    return tableHeaders(headers,true)+rows.map(row=>`<tr>${row.map((value,i)=>`<td>${renderCell?.(value,i)??(codeColumns.includes(i)?`<code>${escapeHtml(value)}</code>`:escapeHtml(value))}</td>`).join('')}</tr>`).join('')+'</tbody></table></div>';
}

function findFunctionDefinition(fn,checkOnly=false) {
    if(fn.scope==='AccountBookTransactionController') {
        const op=contracts.transaction.operations[fn.name];
        if(op) {
            if(checkOnly) return true;
            const meanings={request:transactionRequestMeaning[fn.name],type:'추천할 거래의 종류. 생략하면 EXPENSE다.',keyword:'상호명에 적용할 선택 검색어.'};
            return {
                purpose:op.description,
                inputs:parameterRows(fn.params,fn.file.language).map(row=>[row.name,row.type,meanings[row.name]??parameterDescription(row)]),
                steps:op.steps.map((step,i)=>[i===op.steps.length-1?'return':'step',[op.diagramLabels[i],step]]),
                returns:[[`ResponseDto<${op.response}>`,'처리 성공',op.result]],
                errors:[...contracts.transaction.common.errors,...(op.errors??[])].map(([status,type,message])=>[`HTTP ${status} · ${type}`,message]),
                effects:/^(create|update|delete)/.test(fn.name)?'거래 변경은 서비스의 쓰기 트랜잭션에서 처리한다.':null,
            };
        }
    }
    if(fn.scope===contracts.chatMessages.scope) {
        const op=contracts.chatMessages.operations[fn.name];
        if(op) {
            if(checkOnly) return true;
            const meanings={request:'채팅방에 저장할 텍스트 원문을 담는다.',...op.parameters};
            return {
                purpose:op.description,
                inputs:parameterRows(fn.params,fn.file.language).map(row=>[row.name,row.type,meanings[row.name]??parameterDescription(row)]),
                steps:op.steps.map((step,i)=>[i===op.steps.length-1?'return':'step',[op.diagramLabels[i],step]]),
                returns:[['Task<IActionResult>','처리 성공',op.result]],
                errors:[...contracts.chatMessages.commonErrors,...(op.errors??[])].map(([status,type,message])=>[`HTTP ${status} · ${type}`,message]),
                effects:fn.name==='CreateText'?'현재 인증 사용자의 텍스트 메시지를 채팅방에 등록한다.':null,
            };
        }
    }
    const name=fn.name==='POST'&&fn.file.path.endsWith('api/auth/mobile/approve/route.ts')?'mobileApprovalPOST':fn.name;
    const scopedKey=`${fn.file.project}:${fn.scope}:${name}`;
    return contracts.definitions[`${fn.file.project}:${fn.file.path}:${name}`]??
        contracts.definitions[`${scopedKey}:${fn.arity}`]??contracts.definitions[scopedKey];
}

function definitionFlow(items) {
    let next=0;
    const output=['flowchart TD','entry([시작])','classDef terminal fill:#e2f4ed,stroke:#6f9d90,color:#18483e','classDef decision fill:#eaf3fa,stroke:#8aaebf,color:#224953','classDef failure fill:#fbeeed,stroke:#c79389,color:#803d32','class entry terminal'];
    const edge=(from,to,label='')=>output.push(`${from} -->${label?'|'+label+'|':''} ${to}`);
    function build(list,after,loop) {
        let current=after;
        const terminalIndex=list.findIndex(([kind])=>['return','throw','break','continue'].includes(kind));
        const reachable=terminalIndex===-1?list:list.slice(0,terminalIndex+1);
        for(const [kind,label,yes=[],no=[],routes=[]] of [...reachable].reverse()) {
            const id='n'+(++next);
            const name=(Array.isArray(label)?label[0]:label).replace(/[\r\n]/g,' ').replace(/[&<>"'|`\\#]/g,char=>`#${char.charCodeAt(0)};`);
            if(kind==='if') {
                output.push(`${id}{{"${name}"}}`);
                output.push(`class ${id} decision`);
                edge(id,build(yes,current,loop),'예');
                edge(id,build(no,current,loop),'아니오');
            } else if(kind==='loop'||kind==='do-loop') {
                output.push(`${id}{{"${name}"}}`);
                output.push(`class ${id} decision`);
                const body=build(yes,id,{end:current,next:id});
                edge(id,body,'예');
                edge(id,current,'아니오');
                if(kind==='do-loop') {
                    current=body;
                    continue;
                }
            } else if(kind==='try') {
                output.push(`${id}{{"${name}"}}`);
                output.push(`class ${id} decision`);
                edge(id,build(yes,current,loop),'본문');
                for(const [index,body] of routes.entries()) {
                    edge(id,build(body,current,loop),routes.length===1?'예외 발생':`예외 경로 ${index+1}`);
                }
            } else {
                const terminal=kind==='return'||kind==='throw';
                output.push(terminal?`${id}(["${name}"])`:`${id}["${name}"]`);
                if(terminal) output.push(`class ${id} ${kind==='return'?'terminal':'failure'}`);
                else edge(id,kind==='break'?loop.end:kind==='continue'?loop.next:current);
            }
            current=id;
        }
        return current;
    }
    edge('entry',build(items,'exit'));
    const active=new Set(['entry']);
    const connections=output.map(line=>line.match(/^(\w+) -->(?:\|[^|]*\|)? (\w+)$/)).filter(Boolean);
    for(let size=-1;size!==active.size;) {
        size=active.size;
        for(const [,from,to] of connections) if(active.has(from)) active.add(to);
    }
    const visible=output.filter(line=>{
        const node=line.match(/^(n\d+)[[({]/)?.[1]??line.match(/^class (n\d+) /)?.[1]??line.match(/^(n\d+) -->/)?.[1];
        return !node||active.has(node);
    });
    if(active.has('exit')) visible.push('exit([종료])','class exit terminal');
    return visible.join('\n');
}

function definitionSteps(items) {
    return `<ol class="business-steps">${items.map(([kind,label,yes,no])=>{
        const branch=(title,nodes)=>nodes?.length?`<div><strong>${title}</strong>${definitionSteps(nodes)}</div>`:'';
        return `<li>${escapeHtml(Array.isArray(label)?label[1]:label)}${branch(kind==='loop'?'반복 본문':'예',yes)}${branch('아니오',no)}</li>`;
    }).join('')}</ol>`;
}

function implementationReturns(fn,declared,graph) {
    const rows=[];
    if(graph) {
        const [operations]=graph;
        const collectGraph=(steps,conditions)=>{
            for(const [kind,subject,value,,,meta={}] of steps) {
                if(kind==='return') {
                    const type=declared??(!value?'값 없음':/^(?:true|false|True|False)$/.test(value)?'boolean':/^-?\d+$/.test(value)?'정수':'구현에서 결정');
                    rows.push([type,conditions.join(' · ')||'명시적 반환 경로',value||'전달값 없음']);
                }
                if(kind==='if') {
                    collectGraph(meta.yes,[...conditions,value+' 충족']);
                    collectGraph(meta.no,[...conditions,value+' 불충족']);
                }
                if(kind==='loop'||kind==='try'||kind==='scope') {
                    collectGraph(meta.body??[],conditions);
                    collectGraph(meta.otherwise??[],[...conditions,kind==='loop'?'반복 조건 해제':'보호 범위 정상 종료']);
                    collectGraph(meta.finish??[],[...conditions,'정리 단계']);
                    for(const [name,body] of meta.handlers??[]) collectGraph(body,[...conditions,name]);
                }
                for(const [condition,body] of meta.cases??[]) collectGraph(body,[...conditions,condition]);
            }
        };
        collectGraph(operations,[]);
        if(rows.length) return [...new Map(rows.map(row=>[JSON.stringify(row),row])).values()];
    }
    function collect(steps,conditions) {
        for(const [kind,,source,yes,no] of steps) {
            if(kind==='if') {
                const label=flowCondition(source);
                collect(yes,[...conditions,label]);
                collect(no,[...conditions,label+'의 반대 조건']);
            } else if(kind==='loop'||kind==='try') {
                collect(yes,conditions);
                if(kind==='try') for(const [head,body] of no) collect(body,[...conditions,/^finally/.test(head)?'공통 정리 구간':'예외 처리 구간']);
            } else if(kind==='return') {
                const value=flowExpression(source);
                const empty=/^return\s*;?$/.test(source);
                const type=declared??(empty?'값 없음':/^(?:참|거짓)$/.test(value)?'boolean':/^-?\d+$/.test(value)?'정수':'타입 추론 필요');
                rows.push([type,conditions.join(' · ')||'해당 반환 경로 도달',empty?'이 경로에서 호출을 종료한다.':value?'반환값은 '+value+'.':'이 단계에서 구성한 값을 반환한다.']);
            }
        }
    }
    collect(fn.steps,[]);
    if(!rows.length) {
        const noReturn=declared==='void'||declared==='Unit'||declared==='Task'||fn.name===fn.scope.split('.').at(-1)||['constructor','__init__'].includes(fn.name);
        return [[declared??(noReturn?'값 없음':'타입 추론 필요'),'처리 종료',noReturn?'직접 반환값 없이 호출을 종료한다.':'명시적인 반환식을 확인하지 못했다.']];
    }
    return [...new Map(rows.map(row=>[row.join('\u0000'),row])).values()];
}

function functionSpecification(fn) {
    const definition=findFunctionDefinition(fn);
    const key=`${fn.file.project}:${fn.scope}:${fn.name}`;
    const imported=pages['fn:'+key];
    const implementation=pages['implementation:'+key];
    const graph=implementationContent.get(fn.file.id)?.[fn.id];
    const comment=fn.description?.replace(/^\/\*+|\*+\/$|^\/\/\/?|^#+/g,'').replace(/<\/?summary>/g,'').trim();
    const purpose=definition?.purpose?`<p>${escapeHtml(definition.purpose)}</p>`:imported??(comment?`<p>${escapeHtml(comment)}</p>`:'');
    const inferred=parameterRows(fn.params,fn.file.language);
    const params=definition?.inputs??inferred.map(row=>[row.name,row.type,describeRole(row.name,row.type)||parameterDescription(row)]);
    const parsedReturn=declaredReturn(fn.signature,fn.params,fn.name,fn.file.language);
    const returns=definition?.returns??implementationReturns(fn,parsedReturn,graph);
    const fullSteps=definition?.steps;
    const repo=functionCatalog.groupsByFile.get(fn.file.id).repo.id;
    const definitionGraph=fullSteps&&!definition.flowImage?`<div class="diagram" data-mermaid="${escapeHtml(definitionFlow(fullSteps))}"></div>`:'';
    return `${purpose}${definition?'':'<p class="notice">구현 코드에서 확인한 처리와 반환 경로입니다. 복합 조건, 동적 호출과 엔진 연결은 개별 검토가 필요합니다.</p>'}`+
        '<h2>입력</h2>'+(params.length?definitionsTable(['변수명','타입','역할'],params,[0],(value,column)=>column===1?typeReference(fn.file.project,repo,value):undefined):'<p>전달받는 인자가 없다.</p>')+
        (fullSteps?'<h2>처리 흐름</h2>'+definitionSteps(fullSteps)+definitionGraph:graph?'':('<h2>처리 흐름</h2>'+ (sourceFlow(fn)||'<p>색인에서 확인한 실행 단계가 없습니다.</p>')))+
        (graph?implementationDetail(graph,fn):(implementation?'<h2>구현 상세 흐름도</h2>':''))+
        (implementation?(graph?'<details><summary>업무 단계별 보충 흐름</summary>'+implementation+'</details>':implementation):'')+
        '<h2>반환</h2>'+definitionsTable(['타입','반환 조건','의미'],returns,[],(value,column)=>column===0?typeReference(fn.file.project,repo,value):undefined)+
        (definition?.errors?.length?'<h2>실패와 예외</h2>'+definitionsTable(['예외 또는 오류 응답','발생 조건'],definition.errors,[0]):'')+
        (definition?.effects?`<h2>상태 변경</h2><p>${escapeHtml(definition.effects)}</p>`:'');
}
