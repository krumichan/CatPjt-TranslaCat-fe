'use strict';

const javaListMapping=/^return\s+[\w$]+(?:\s*\.\s*[\w$]+)*\s*\([^()]*\)\s*\.\s*stream\(\)\s*\.\s*map\(\s*[\w.$]+::[\w$]+\s*\)\s*\.\s*toList\(\)\s*;?$/;

function shortCallName(source) {
    return source.match(/([\w$]+)\s*$/)?.[1]??'';
}

function sourceStepLabel(fn,kind,source,names) {
    if(kind==='if') return flowCondition(source,names);
    if(kind==='loop') {
        const items=source.match(/\b(?:of|in)\s+([\w.]+)/)?.[1];
        const condition=source.match(/\bwhile\s*\((.+)\)/)?.[1];
        return items?items+'의 다음 항목 존재':condition?flowCondition(condition,names):'다음 반복 조건';
    }
    if(kind==='try') return '예외 처리 범위';
    if(kind==='structure') return /\b(switch|when|match)\b/.test(source)?'선택 분기':'복합 처리';
    if(kind==='throw'||kind==='raise') {
        const error=source.match(/(?:throw|raise)\s+(?:new\s+)?([\w.]+)/)?.[1];
        const code=source.match(/["']([A-Z][A-Z_\d]{3,}|[a-z]+(?:_[a-z\d]+)+)["']/)?.[1];
        return (code??error??'발생한 오류')+' 전파';
    }
    if(kind==='break') return '반복 종료';
    if(kind==='continue') return '다음 반복';
    if(kind==='return') {
        if(/^return\s*;?$/.test(source)) return '호출 종료';
        const value=flowExpression(source);
        return value?`${value} 반환`:names.length?`${callAction(names[0])} 결과 반환`:'구성한 값 반환';
    }
    const assignment=source.match(/^\s*(?:(const|let|var|val|[\w<>.?\[\]]+)\s+)?([\w.$]+)\s*([+*/-]?=(?!=|>)|\+\+|--)/);
    if(assignment) {
        const [,,target,operator]=assignment;
        const constructor=fn.scope.split('.').at(-1)===fn.name||['constructor','__init__'].includes(fn.name);
        if(operator==='++'||operator==='--') return `${target} ${operator==='++'?'증가':'감소'}`;
        if(constructor&&/^(this|self)\./.test(target)&&!names.length) return `${target.replace(/^(this|self)\./,'')} 초기화`;
        if(operator==='*='||operator==='/=') return `${target} 배율 적용`;
    }
    return flowStep(source,names);
}

function sourceFlow(fn) {
    const calls=new Map();
    for(const call of fn.calls) {
        if(!calls.has(call[1])) calls.set(call[1],[]);
        calls.get(call[1]).push(call);
    }
    const visit=steps=>steps.flatMap(([kind,line,source,yes,no])=>{
        const direct=(calls.get(line)??[]).filter(call=>source.includes(shortCallName(call[0])));
        const names=[...new Set(direct.map(call=>call[0]))];
        const label=sourceStepLabel(fn,kind,source,names);
        const links=[...new Set(direct.filter(call=>call[2]==='scope').flatMap(call=>call[3]))];
        const step={kind,label,links,names};
        if(fn.file.language==='java'&&kind==='return'&&javaListMapping.test(source)) {
            return [
                {kind:'step',label:'원본 목록 조회',links,names},
                {kind:'step',label:'스트림 생성'},
                {kind:'step',label:'항목 변환 함수 연결'},
                {kind:'step',label:'결과 수집 시작'},
                {kind:'loop',label:'원본 항목 존재 여부',yes:[
                    {kind:'step',label:'다음 항목 읽기'},
                    {kind:'step',label:'결과 객체 변환'},
                    {kind:'step',label:'결과 목록에 추가'},
                ]},
                {kind:'return',label:'원래 순서의 결과 목록 반환'},
            ];
        }
        if(kind==='return'&&direct.length>1&&names.length>1) {
            const first=direct[0];
            const prefix=source.indexOf(first[0]+'(');
            if(prefix>=0&&direct.slice(1).every(call=>source.indexOf(call[0]+'(')>prefix)) {
                const operations=direct.slice(1);
                if(operations.length===1||operations.every((call,index)=>index===0||operations[index-1][0].includes(call[0]+'('))) {
                    const expanded=[...operations].reverse().map(call=>({kind:'step',label:callAction(call[0]),links:call[2]==='scope'?call[3]:[]}));
                    return [...expanded,step];
                }
            }
        }
        if(kind==='if') return {...step,yes:visit(yes),no:visit(no)};
        if(kind==='loop') return {...step,yes:visit(yes),postTest:no};
        if(kind==='try') {
            const handlers=no.map(([head,body])=>({
                cleanup:/^finally\b/.test(head),
                label:/^finally\b/.test(head)?'공통 정리':(head.match(/(?:catch\s*\(\s*|except\s+)([A-Z][\w.]*)/)?.[1]??'예외')+' 처리',
                body:visit(body),
            }));
            return {...step,yes:visit(yes),handlers};
        }
        return step;
    });
    const steps=visit(fn.steps);
    if(!steps.length) return fn.parserError?'<p>실행 구문의 구조를 확인할 수 없습니다.</p>':
        '<p>함수 본문에 실행 단계가 없습니다.</p><div class="diagram" data-mermaid="'+escapeHtml(definitionFlow([]))+'"></div>';
    const branches=({kind,yes,no,handlers,postTest})=>[
        [kind==='if'?'예':postTest?'첫 실행 및 반복':kind==='loop'?'반복 본문':'본문',yes],
        ['아니오',no],
        ...(handlers??[]).map(handler=>[handler.label,handler.body]),
    ].filter(([,body])=>body?.length);
    function graphNodes(items,loop=false) {
        return items.map(({kind,label,yes=[],no=[],postTest,handlers=[]})=>{
            if(kind==='if') return [kind,label,graphNodes(yes,loop),graphNodes(no,loop)];
            if(kind==='loop') return [postTest?'do-loop':'loop',label,graphNodes(yes,true)];
            if(kind==='try'&&handlers.length&&!handlers.some(handler=>handler.cleanup)) {
                return ['try','예외 처리 범위',graphNodes(yes,loop),[],handlers.map(handler=>graphNodes(handler.body,loop))];
            }
            if(['try','structure'].includes(kind)) return ['step',label];
            if(['break','continue'].includes(kind)&&!loop) return ['step',label];
            return [kind==='raise'?'throw':kind,label];
        });
    }
    const asList=items=>`<ol class="business-steps">${items.map(item=>{
        const evidence=item.links?.length?item.links.map(functionLink).join(' · '):'';
        const nested=branches(item).map(([title,body])=>`<div><strong>${title}</strong>${asList(body)}</div>`).join('');
        return `<li>${escapeHtml(item.label)}${evidence?`<div class="meta">관련 호출 · ${evidence}</div>`:''}${nested}</li>`;
    }).join('')}</ol>`;
    const count=items=>items.reduce((sum,item)=>sum+1+branches(item).reduce((n,[,body])=>n+count(body),0),0);
    const preview=count(steps)<=64&&!fn.parserError
        ? `<div class="diagram" data-mermaid="${escapeHtml(definitionFlow(graphNodes(steps)))}"></div>`
        : `<details open><summary>흐름도 구간</summary>${Array.from({length:Math.ceil(steps.length/20)},(_,index)=>
            `<h3>구간 ${index+1}</h3><div class="diagram" data-mermaid="${escapeHtml(definitionFlow(graphNodes(steps.slice(index*20,index*20+20))))}"></div>`).join('')}</details>`;
    return asList(steps)+preview;
}
